import { dataUrlToBlob } from './canvasImage'
import { getBackendHttpUrl } from './backend'
import { getApiErrorMessage, isDataUrl, isHttpUrl } from './imageApiShared'

export function getProxiedImageUrl(src: string) {
  return getBackendHttpUrl(`/api/images/proxy?url=${encodeURIComponent(src)}`)
}

async function fetchImageBlob(url: string, fallbackType: string): Promise<Blob> {
  const response = await fetch(url, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response))
  }

  const blob = await response.blob()
  return blob.type ? blob : new Blob([await blob.arrayBuffer()], { type: fallbackType })
}

export async function imageSourceToBlob(src: string, fallbackType = 'image/png'): Promise<Blob> {
  if (isDataUrl(src)) return dataUrlToBlob(src, fallbackType)

  if (isHttpUrl(src)) {
    try {
      return await fetchImageBlob(getProxiedImageUrl(src), fallbackType)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!/only configured R2 image URLs|url must be a valid R2 public URL/i.test(message)) {
        throw error
      }
    }
  }

  return fetchImageBlob(src, fallbackType)
}

export function getImageBlobExtension(blob: Blob) {
  if (blob.type === 'image/jpeg') return 'jpg'
  if (blob.type === 'image/webp') return 'webp'
  if (blob.type === 'image/png') return 'png'
  return blob.type.replace(/^image\//, '') || 'png'
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
