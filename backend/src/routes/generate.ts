import type { FastifyInstance } from "fastify";
import type { Images } from "openai/resources/images";

import { getImageModel, getOpenAI } from "../lib/openai.js";
import {
  FORMAT_OPTIONS,
  QUALITY_OPTIONS,
  SIZE_OPTIONS,
  type Format,
  type GenerateRequest,
  type GenerateResponse,
  type Quality,
  type Size,
} from "../types/index.js";

type GenerateBody = Partial<GenerateRequest>;

function normalizeRequest(body: GenerateBody): GenerateRequest | { error: string } {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return { error: "prompt is required" };
  }

  const size =
    typeof body.size === "string" &&
    (SIZE_OPTIONS as readonly string[]).includes(body.size)
      ? (body.size as Size)
      : "auto";
  const quality: Quality =
    typeof body.quality === "string" &&
    (QUALITY_OPTIONS as readonly string[]).includes(body.quality)
      ? (body.quality as Quality)
      : "auto";
  const format: Format =
    typeof body.format === "string" &&
    (FORMAT_OPTIONS as readonly string[]).includes(body.format)
      ? (body.format as Format)
      : "png";
  const n =
    typeof body.n === "number" && body.n >= 1 && body.n <= 4
      ? Math.floor(body.n)
      : 1;

  return { prompt, size, quality, format, n };
}

export async function generateRoutes(app: FastifyInstance) {
  app.post<{ Body: GenerateBody }>("/api/generate", async (request, reply) => {
    const normalized = normalizeRequest(request.body ?? {});
    if ("error" in normalized) {
      return reply.status(400).send({ error: normalized.error });
    }

    try {
      const openai = getOpenAI();
      const model = getImageModel();
      const requestParams: Images.ImageGenerateParamsNonStreaming = {
        model,
        prompt: normalized.prompt,
        size: normalized.size,
        n: normalized.n,
        quality: normalized.quality,
        output_format: normalized.format,
      };

      const responses = [await openai.images.generate(requestParams)];

      const imageCount = () =>
        responses.reduce(
          (total, response) => total + (response.data?.length ?? 0),
          0,
        );

      while (imageCount() < normalized.n && responses.length < normalized.n) {
        responses.push(
          await openai.images.generate({
            ...requestParams,
            n: normalized.n - imageCount(),
          }),
        );
      }

      const mime =
        normalized.format === "jpeg" ? "image/jpeg" : `image/${normalized.format}`;
      const sources = responses
        .flatMap((response) => response.data ?? [])
        .map((data) =>
          data.url
            ? data.url
            : data.b64_json
              ? `data:${mime};base64,${data.b64_json}`
              : null,
        )
        .filter((source): source is string => Boolean(source))
        .slice(0, normalized.n);

      if (sources.length === 0) {
        return reply.status(502).send({ error: "model returned no images" });
      }

      const payload: GenerateResponse = {
        images: sources.map((src) => ({ src })),
        created: responses[0]?.created ?? Math.floor(Date.now() / 1000),
      };
      return reply.send(payload);
    } catch (e: unknown) {
      const err = e as {
        name?: string;
        status?: number;
        message?: string;
        error?: { message?: string };
      };
      const isTimeout =
        err.name === "APIConnectionTimeoutError" ||
        (typeof err.message === "string" &&
          err.message.toLowerCase().includes("timed out"));
      const status =
        typeof err.status === "number" ? err.status : isTimeout ? 504 : 500;
      const message = isTimeout
        ? "Image generation timed out. Try again, or increase OPENAI_REQUEST_TIMEOUT_MS."
        : err.error?.message ?? err.message ?? "image generation failed";
      return reply.status(status).send({ error: message });
    }
  });
}
