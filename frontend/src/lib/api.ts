import type {
  GenerateQueueStatus,
  GenerateRequest,
  GenerateResponse,
} from "@/lib/types";

export async function generateImages(
  request: GenerateRequest,
  signal?: AbortSignal,
): Promise<GenerateResponse> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  const json = (await res.json()) as GenerateResponse | { error: string };

  if (!res.ok || "error" in json) {
    const message = "error" in json ? json.error : `HTTP ${res.status}`;
    throw new Error(message);
  }

  return json;
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
