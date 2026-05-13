import PQueue from "p-queue";

const DEFAULT_IMAGE_CONCURRENCY = 2;
const TASK_RETENTION_MS = 5 * 60 * 1000;

let queue: PQueue | null = null;

export type ImageQueueTaskResult = {
  images: { src: string }[];
  created: number;
};

export type ImageQueueTaskStatus = {
  id: string;
  ownerId: string;
  status: "waiting" | "generating" | "completed" | "failed";
  total: number;
  completed: number;
  active: number;
  queuedAt: number;
  generationStartedAt?: number;
  completedAt?: number;
  failedAt?: number;
  result?: ImageQueueTaskResult;
  errorMessage?: string;
};

const tasks = new Map<string, ImageQueueTaskStatus>();
const listeners = new Map<string, Set<(task: ImageQueueTaskStatus) => void>>();

function getImageConcurrency(): number {
  const configured = Number.parseInt(
    process.env.IMAGE_GENERATION_CONCURRENCY ?? "",
    10,
  );

  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_IMAGE_CONCURRENCY;
}

export function getImageGenerationQueue(): PQueue {
  queue ??= new PQueue({
    concurrency: getImageConcurrency(),
  });
  return queue;
}

function scheduleTaskCleanup(taskId: string) {
  setTimeout(() => {
    tasks.delete(taskId);
    listeners.delete(taskId);
  }, TASK_RETENTION_MS).unref();
}

function cloneTask(task: ImageQueueTaskStatus): ImageQueueTaskStatus {
  return {
    ...task,
    result: task.result
      ? {
          ...task.result,
          images: task.result.images.map((image) => ({ ...image })),
        }
      : undefined,
  };
}

function notifyImageQueueTask(task: ImageQueueTaskStatus) {
  const subscribers = listeners.get(task.id);
  if (!subscribers) return;
  const snapshot = cloneTask(task);
  for (const listener of subscribers) {
    listener(snapshot);
  }
}

export function createImageQueueTask(
  taskId: string,
  total: number,
  ownerId: string,
) {
  const task: ImageQueueTaskStatus = {
    id: taskId,
    ownerId,
    status: "waiting",
    total,
    completed: 0,
    active: 0,
    queuedAt: Date.now(),
  };
  tasks.set(taskId, task);
  notifyImageQueueTask(task);
  return cloneTask(task);
}

export function getImageQueueTask(taskId: string) {
  const task = tasks.get(taskId);
  return task ? cloneTask(task) : undefined;
}

export function subscribeImageQueueTask(
  taskId: string,
  listener: (task: ImageQueueTaskStatus) => void,
) {
  let subscribers = listeners.get(taskId);
  if (!subscribers) {
    subscribers = new Set();
    listeners.set(taskId, subscribers);
  }

  subscribers.add(listener);
  return () => {
    const current = listeners.get(taskId);
    if (!current) return;
    current.delete(listener);
    if (current.size === 0) listeners.delete(taskId);
  };
}

export function completeImageQueueTask(
  taskId: string,
  result: ImageQueueTaskResult,
) {
  const trackedTask = tasks.get(taskId);
  if (!trackedTask) return;
  if (trackedTask.status === "failed") return;
  trackedTask.status = "completed";
  trackedTask.completed = trackedTask.total;
  trackedTask.active = 0;
  trackedTask.completedAt = Date.now();
  trackedTask.result = result;
  notifyImageQueueTask(trackedTask);
  scheduleTaskCleanup(trackedTask.id);
}

export function failImageQueueTask(taskId: string, message: string) {
  const trackedTask = tasks.get(taskId);
  if (!trackedTask) return;
  trackedTask.status = "failed";
  trackedTask.active = 0;
  trackedTask.failedAt = Date.now();
  trackedTask.errorMessage = message;
  notifyImageQueueTask(trackedTask);
  scheduleTaskCleanup(trackedTask.id);
}

export async function addTrackedImageGeneration<T>(
  taskId: string | undefined,
  task: () => Promise<T>,
): Promise<T> {
  return getImageGenerationQueue().add(async () => {
    const trackedTask = taskId ? tasks.get(taskId) : undefined;
    if (
      trackedTask &&
      (trackedTask.status === "failed" || trackedTask.status === "completed")
    ) {
      throw new Error("image generation task already finished");
    }
    if (
      trackedTask &&
      trackedTask.status !== "failed" &&
      trackedTask.status !== "completed"
    ) {
      trackedTask.status = "generating";
      trackedTask.active += 1;
      trackedTask.generationStartedAt ??= Date.now();
      notifyImageQueueTask(trackedTask);
    }

    try {
      const result = await task();
      if (trackedTask) {
        trackedTask.completed += 1;
        trackedTask.active = Math.max(0, trackedTask.active - 1);
        if (trackedTask.status !== "failed") {
          notifyImageQueueTask(trackedTask);
        }
      }
      return result;
    } catch (error) {
      if (
        trackedTask &&
        trackedTask.status !== "failed" &&
        trackedTask.status !== "completed"
      ) {
        trackedTask.status = "failed";
        trackedTask.active = Math.max(0, trackedTask.active - 1);
        trackedTask.failedAt = Date.now();
        trackedTask.errorMessage =
          error instanceof Error ? error.message : "image generation failed";
        notifyImageQueueTask(trackedTask);
        scheduleTaskCleanup(trackedTask.id);
      }
      throw error;
    }
  });
}

export function getImageQueueStatus() {
  const imageGenerationQueue = getImageGenerationQueue();
  return {
    concurrency: imageGenerationQueue.concurrency,
    pending: imageGenerationQueue.pending,
    queued: imageGenerationQueue.size,
  };
}
