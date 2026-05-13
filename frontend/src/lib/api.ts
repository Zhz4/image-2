import type {
  CreateGenerateTaskResponse,
  GenerateQueueStatus,
  GenerateRequest,
  GenerateTaskMessage,
  ReferenceImage,
} from "@/lib/types";

type GenerateTaskHandlers = {
  onMessage: (message: GenerateTaskMessage) => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
};

export async function createGenerateTask(
  request: GenerateRequest,
  signal?: AbortSignal,
): Promise<CreateGenerateTaskResponse> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  const json = (await res.json()) as CreateGenerateTaskResponse | { error: string };

  if (!res.ok || "error" in json) {
    const message = "error" in json ? json.error : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return json;
}

export async function uploadReferenceImage(
  file: File,
  signal?: AbortSignal,
): Promise<ReferenceImage> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/uploads/reference", {
    method: "POST",
    body: form,
    signal,
  });
  const json = (await res.json()) as ReferenceImage | { error: string };

  if (!res.ok || "error" in json) {
    const message = "error" in json ? json.error : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return json;
}

export function connectGenerateTask(
  taskId: string,
  handlers: GenerateTaskHandlers,
): WebSocket {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${window.location.host}/api/generate/ws/${encodeURIComponent(taskId)}`;
  const socket = new WebSocket(url);

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
  const res = await fetch(`/api/generate/status/${encodeURIComponent(taskId)}`, {
    signal,
  });

  if (res.status === 404) return null;

  const json = (await res.json()) as GenerateQueueStatus | { error: string };
  if (!res.ok || "error" in json) {
    const message = "error" in json ? json.error : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return json;
}
