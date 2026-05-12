import type { FastifyInstance } from "fastify";
import { toFile } from "openai";
import type { Images } from "openai/resources/images";

import {
  addTrackedImageGeneration,
  createImageQueueTask,
  getImageQueueTask,
} from "../lib/image-queue.js";
import { getImageModel, getOpenAI } from "../lib/openai.js";
import {
  FORMAT_OPTIONS,
  QUALITY_OPTIONS,
  SIZE_OPTIONS,
  type Format,
  type GenerateRequest,
  type GenerateResponse,
  type Quality,
  type ReferenceImage,
  type Size,
} from "../types/index.js";

type GenerateBody = Partial<GenerateRequest>;
type NormalizedReferenceImage = {
  name: string;
  type: "image/png" | "image/jpeg" | "image/webp";
  buffer: Buffer;
};

const MAX_REFERENCE_IMAGES = 4;
const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_REFERENCE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function normalizeRequest(body: GenerateBody): GenerateRequest | { error: string } {
  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : undefined;
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

  return { taskId, prompt, size, quality, format, n };
}

function normalizeReferenceImages(
  images: ReferenceImage[] | undefined,
): NormalizedReferenceImage[] | { error: string } {
  if (!Array.isArray(images) || images.length === 0) return [];
  if (images.length > MAX_REFERENCE_IMAGES) {
    return { error: `referenceImages supports up to ${MAX_REFERENCE_IMAGES} images` };
  }

  const normalized: NormalizedReferenceImage[] = [];
  for (const [index, image] of images.entries()) {
    if (!image || typeof image.dataUrl !== "string") {
      return { error: `referenceImages[${index}] is invalid` };
    }

    const match = /^data:(image\/(?:png|jpeg|webp));base64,([a-z0-9+/=]+)$/i.exec(
      image.dataUrl,
    );
    if (!match) {
      return {
        error: "reference images must be PNG, JPG, or WEBP data URLs",
      };
    }

    const type = match[1].toLowerCase() as NormalizedReferenceImage["type"];
    if (!SUPPORTED_REFERENCE_TYPES.has(type)) {
      return { error: "reference images must be PNG, JPG, or WEBP" };
    }

    const buffer = Buffer.from(match[2], "base64");
    if (buffer.byteLength > MAX_REFERENCE_IMAGE_BYTES) {
      return { error: "each reference image must be 10MB or smaller" };
    }

    const ext = type === "image/jpeg" ? "jpg" : type.replace("image/", "");
    const safeName =
      typeof image.name === "string" && image.name.trim()
        ? image.name.trim().replace(/[\\/:*?"<>|]+/g, "-")
        : `reference-${index + 1}.${ext}`;

    normalized.push({ name: safeName, type, buffer });
  }

  return normalized;
}

function imageSourceToDataUrl(data: Images.Image, mime: string): string | null {
  if (data.url) return data.url;
  if (data.b64_json) return `data:${mime};base64,${data.b64_json}`;
  return null;
}

async function enqueueImageGeneration(
  taskId: string | undefined,
  task: () => Promise<Images.ImagesResponse>,
): Promise<Images.ImagesResponse> {
  return addTrackedImageGeneration(taskId, task);
}

export async function generateRoutes(app: FastifyInstance) {
  app.get<{ Params: { taskId: string } }>(
    "/api/generate/status/:taskId",
    async (request, reply) => {
      const task = getImageQueueTask(request.params.taskId);
      if (!task) {
        return reply.status(404).send({ error: "task not found" });
      }
      return reply.send(task);
    },
  );

  app.post<{ Body: GenerateBody }>("/api/generate", async (request, reply) => {
    const normalized = normalizeRequest(request.body ?? {});
    if ("error" in normalized) {
      return reply.status(400).send({ error: normalized.error });
    }
    const referenceImages = normalizeReferenceImages(request.body?.referenceImages);
    if ("error" in referenceImages) {
      return reply.status(400).send({ error: referenceImages.error });
    }

    try {
      const openai = getOpenAI();
      const model = getImageModel();
      const mime =
        normalized.format === "jpeg" ? "image/jpeg" : `image/${normalized.format}`;
      const responses: Images.ImagesResponse[] = [];
      createImageQueueTask(normalized.taskId ?? request.id, normalized.n);
      const queueTaskId = normalized.taskId ?? request.id;

      if (referenceImages.length > 0) {
        responses.push(
          ...(await Promise.all(
            Array.from({ length: normalized.n }, async () => {
              const uploadables = await Promise.all(
                referenceImages.map((image) =>
                  toFile(image.buffer, image.name, { type: image.type }),
                ),
              );
              const editParams: Images.ImageEditParamsNonStreaming = {
                image: uploadables,
                model,
                prompt: normalized.prompt,
                size: normalized.size,
                n: 1,
                quality: normalized.quality,
                output_format: normalized.format,
              };
              return enqueueImageGeneration(queueTaskId, () =>
                openai.images.edit(editParams),
              );
            }),
          )),
        );
      } else {
        const requestParams: Images.ImageGenerateParamsNonStreaming = {
          model,
          prompt: normalized.prompt,
          size: normalized.size,
          n: 1,
          quality: normalized.quality,
          output_format: normalized.format,
        };
        responses.push(
          ...(await Promise.all(
            Array.from({ length: normalized.n }, () =>
              enqueueImageGeneration(queueTaskId, () =>
                openai.images.generate(requestParams),
              ),
            ),
          )),
        );
      }

      const sources = responses
        .flatMap((response) => response.data ?? [])
        .map((data) => imageSourceToDataUrl(data, mime))
        .filter((source): source is string => Boolean(source))
        .slice(0, normalized.n);

      if (sources.length === 0) {
        return reply.status(502).send({ error: "model returned no images" });
      }

      const payload: GenerateResponse = {
        images: sources.map((src) => ({ src })),
        created: responses[0]?.created ?? Math.floor(Date.now() / 1000),
      };
      const queueTask = getImageQueueTask(queueTaskId);
      if (queueTask) {
        payload.queuedAt = queueTask.queuedAt;
        payload.generationStartedAt = queueTask.generationStartedAt;
        payload.completedAt = queueTask.completedAt;
      }
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
