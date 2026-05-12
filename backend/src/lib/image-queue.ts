import PQueue from "p-queue";

const DEFAULT_IMAGE_CONCURRENCY = 2;
const TASK_RETENTION_MS = 5 * 60 * 1000;

let queue: PQueue | null = null;

export type ImageQueueTaskStatus = {
  id: string;
  status: "waiting" | "generating" | "completed" | "failed";
  total: number;
  completed: number;
  active: number;
  queuedAt: number;
  generationStartedAt?: number;
  completedAt?: number;
  failedAt?: number;
};

const tasks = new Map<string, ImageQueueTaskStatus>();

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
  }, TASK_RETENTION_MS).unref();
}

export function createImageQueueTask(taskId: string, total: number) {
  tasks.set(taskId, {
    id: taskId,
    status: "waiting",
    total,
    completed: 0,
    active: 0,
    queuedAt: Date.now(),
  });
}

export function getImageQueueTask(taskId: string) {
  return tasks.get(taskId);
}

export async function addTrackedImageGeneration<T>(
  taskId: string | undefined,
  task: () => Promise<T>,
): Promise<T> {
  return getImageGenerationQueue().add(async () => {
    const trackedTask = taskId ? tasks.get(taskId) : undefined;
    if (trackedTask) {
      trackedTask.status = "generating";
      trackedTask.active += 1;
      trackedTask.generationStartedAt ??= Date.now();
    }

    try {
      const result = await task();
      if (trackedTask) {
        trackedTask.completed += 1;
        trackedTask.active = Math.max(0, trackedTask.active - 1);
        if (trackedTask.completed >= trackedTask.total) {
          trackedTask.status = "completed";
          trackedTask.completedAt = Date.now();
          scheduleTaskCleanup(trackedTask.id);
        }
      }
      return result;
    } catch (error) {
      if (trackedTask) {
        trackedTask.status = "failed";
        trackedTask.active = Math.max(0, trackedTask.active - 1);
        trackedTask.failedAt = Date.now();
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
