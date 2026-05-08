import "server-only";

import OpenAI from "openai";

let client: OpenAI | null = null;

function getRequestTimeoutMs(): number {
  const configured = Number.parseInt(
    process.env.OPENAI_REQUEST_TIMEOUT_MS ?? "",
    10,
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : 10 * 60 * 1000;
}

export function getOpenAI(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  client = new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
    timeout: getRequestTimeoutMs(),
    maxRetries: 0,
  });
  return client;
}

export function getImageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
}
