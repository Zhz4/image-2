import { ApiRequestError, getWebsocketUrl, request } from "@/api/request";
import type {
  CreateGenerateTaskResponse,
  GenerateQueueStatus,
  GenerateRequest,
  GenerateTaskMessage,
} from "@/lib/types";

type GenerateTaskHandlers = {
  onMessage: (message: GenerateTaskMessage) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
};

export function createGenerateTask(
  data: GenerateRequest,
  signal?: AbortSignal,
): Promise<CreateGenerateTaskResponse> {
  return request<CreateGenerateTaskResponse>({
    url: "/api/generate",
    method: "POST",
    data,
    signal,
  });
}

export function connectGenerateTask(
  taskId: string,
  handlers: GenerateTaskHandlers,
): WebSocket {
  const socket = new WebSocket(
    getWebsocketUrl(`/api/generate/ws/${encodeURIComponent(taskId)}`, true),
  );

  socket.addEventListener("message", (event) => {
    try {
      handlers.onMessage(JSON.parse(event.data as string) as GenerateTaskMessage);
    } catch {
      handlers.onMessage({
        id: taskId,
        status: "failed",
        total: 0,
        completed: 0,
        active: 0,
        queuedAt: Date.now(),
        failedAt: Date.now(),
        error: "invalid task message",
      });
    }
  });

  if (handlers.onError) socket.addEventListener("error", handlers.onError);
  if (handlers.onClose) socket.addEventListener("close", handlers.onClose);

  return socket;
}

export async function getGenerateQueueStatus(
  taskId: string,
  signal?: AbortSignal,
): Promise<GenerateQueueStatus | null> {
  try {
    return await request<GenerateQueueStatus>({
      url: `/api/generate/status/${encodeURIComponent(taskId)}`,
      signal,
    });
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}
