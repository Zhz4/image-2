import { dataUrlToBlob, maskDataUrlToPngBlob } from './canvasImage'
import { getBackendApiBase, getBackendHttpUrl } from './backend'
import {
  type CallApiOptions,
  type CallApiResult,
  getApiErrorMessage,
  isHttpUrl,
} from './imageApiShared'

type BackendReferenceImage = {
  name: string
  type: string
  url: string
}

type ReferenceImage = BackendReferenceImage

type BackendTaskStatus = {
  id: string
  status: 'waiting' | 'generating' | 'completed' | 'failed'
  images?: Array<{ src: string }>
  result?: { images?: Array<{ src: string }>; created?: number }
  error?: string
  errorMessage?: string
}

function createBackendTaskId() {
  return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

function getBackendWebSocketUrl(taskId: string) {
  const url = new URL(
    `/api/generate/ws/${encodeURIComponent(taskId)}`,
    getBackendApiBase() || window.location.href,
  )
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

async function uploadReferenceImage(blob: Blob, filename: string): Promise<BackendReferenceImage> {
  const formData = new FormData()
  formData.append('file', blob, filename)

  const response = await fetch(getBackendHttpUrl('/api/uploads/reference'), {
    method: 'POST',
    body: formData,
    cache: 'no-store',
  })

  if (!response.ok) throw new Error(await getApiErrorMessage(response))
  return response.json() as Promise<BackendReferenceImage>
}

async function uploadInputImages(inputImageDataUrls: string[]): Promise<ReferenceImage[]> {
  return Promise.all(inputImageDataUrls.map(async (dataUrl, index) => {
    if (isHttpUrl(dataUrl)) {
      return {
        name: `reference-${index + 1}.${getImageExtensionFromUrl(dataUrl)}`,
        type: getImageMimeTypeFromUrl(dataUrl),
        url: dataUrl,
      }
    }

    const blob = await dataUrlToBlob(dataUrl)
    const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type.replace('image/', '') || 'png'
    return uploadReferenceImage(blob, `reference-${index + 1}.${ext}`)
  }))
}

function getImageExtensionFromUrl(url: string) {
  try {
    const ext = new URL(url).pathname.split('.').pop()?.toLowerCase()
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'webp' || ext === 'png') return ext === 'jpeg' ? 'jpg' : ext
  } catch {
    /* fall through */
  }
  return 'png'
}

function getImageMimeTypeFromUrl(url: string) {
  const ext = getImageExtensionFromUrl(url)
  if (ext === 'jpg') return 'image/jpeg'
  if (ext === 'webp') return 'image/webp'
  return 'image/png'
}

async function uploadMaskImage(maskDataUrl: string | undefined): Promise<ReferenceImage | undefined> {
  if (!maskDataUrl) return undefined
  const blob = await maskDataUrlToPngBlob(maskDataUrl)
  return uploadReferenceImage(blob, 'mask.png')
}

function getTaskImages(task: BackendTaskStatus) {
  return task.images ?? task.result?.images ?? []
}

function waitForTaskViaWebSocket(taskId: string): Promise<BackendTaskStatus> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(getBackendWebSocketUrl(taskId))

    socket.onmessage = (event) => {
      try {
        const task = JSON.parse(String(event.data)) as BackendTaskStatus
        if (task.status === 'completed') {
          socket.close()
          resolve(task)
        } else if (task.status === 'failed') {
          socket.close()
          reject(new Error(task.error ?? task.errorMessage ?? 'image generation failed'))
        }
      } catch (error) {
        socket.close()
        reject(error)
      }
    }

    socket.onerror = () => {
      socket.close()
      reject(new Error('WebSocket connection failed'))
    }
    socket.onclose = () => reject(new Error('WebSocket connection closed'))
  })
}

async function waitForTaskByPolling(taskId: string): Promise<BackendTaskStatus> {
  while (true) {
    const response = await fetch(getBackendHttpUrl(`/api/generate/status/${encodeURIComponent(taskId)}`), {
      cache: 'no-store',
    })
    if (!response.ok) throw new Error(await getApiErrorMessage(response))

    const task = await response.json() as BackendTaskStatus
    if (task.status === 'completed') return task
    if (task.status === 'failed') {
      throw new Error(task.error ?? task.errorMessage ?? 'image generation failed')
    }

    await new Promise((resolve) => window.setTimeout(resolve, 1500))
  }
}

async function waitForTask(taskId: string): Promise<BackendTaskStatus> {
  try {
    return await waitForTaskViaWebSocket(taskId)
  } catch {
    return waitForTaskByPolling(taskId)
  }
}

export async function callBackendImageApi(opts: CallApiOptions): Promise<CallApiResult> {
  const taskId = opts.taskId ?? createBackendTaskId()
  const [referenceImages, maskImage] = await Promise.all([
    uploadInputImages(opts.inputImageDataUrls),
    uploadMaskImage(opts.maskDataUrl),
  ])

  const response = await fetch(getBackendHttpUrl('/api/generate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      taskId,
      prompt: opts.prompt,
      size: opts.params.size,
      quality: opts.params.quality,
      format: opts.params.output_format,
      n: opts.params.n,
      referenceImages,
      maskImage,
    }),
  })

  if (!response.ok) throw new Error(await getApiErrorMessage(response))

  const task = await waitForTask(taskId)
  const imageUrls = getTaskImages(task).map((image) => image.src).filter(Boolean)
  if (!imageUrls.length) throw new Error('接口未返回可用图片数据')

  return {
    images: imageUrls,
    actualParams: { ...opts.params, n: imageUrls.length },
    actualParamsList: imageUrls.map(() => opts.params),
  }
}
