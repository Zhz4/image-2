import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import https from "node:https";
import { toFile, type Uploadable } from "openai";
import type { Images } from "openai/resources/images";

import {
  addTrackedImageGeneration,
  completeImageQueueTask,
  createImageQueueTask,
  failImageQueueTask,
  getImageQueueTask,
  subscribeImageQueueTask,
} from "../lib/image-queue.js";
import { getImageModel, getOpenAI } from "../lib/openai.js";
import {
  isR2PublicObjectUrl,
  uploadImageToR2,
  type ImageMimeType,
} from "../lib/r2.js";
import {
  FORMAT_OPTIONS,
  QUALITY_OPTIONS,
  SIZE_OPTIONS,
  type Format,
  type GenerateRequest,
  type Quality,
  type ReferenceImage,
  type Size,
} from "../types/index.js";

type GenerateBody = Partial<GenerateRequest>;
type NormalizedReferenceImage = {
  name: string;
  type: "image/png" | "image/jpeg" | "image/webp";
  url: string;
};

const MAX_REFERENCE_IMAGES = 4;
const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_REFERENCE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function isReferenceMimeType(
  value: string,
): value is NormalizedReferenceImage["type"] {
  return SUPPORTED_REFERENCE_TYPES.has(value);
}

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
    if (!image || typeof image.url !== "string") {
      return { error: `referenceImages[${index}] is invalid` };
    }

    const url = image.url.trim();
    try {
      if (!isR2PublicObjectUrl(url)) {
        return { error: "reference images must be uploaded first" };
      }
    } catch {
      return { error: "reference images must be valid URLs" };
    }

    const type =
      typeof image.type === "string"
        ? image.type.toLowerCase()
        : "";
    if (!isReferenceMimeType(type)) {
      return { error: "reference images must be PNG, JPG, or WEBP" };
    }

    const ext = type === "image/jpeg" ? "jpg" : type.replace("image/", "");
    const safeName =
      typeof image.name === "string" && image.name.trim()
        ? image.name.trim().replace(/[\\/:*?"<>|]+/g, "-")
        : `reference-${index + 1}.${ext}`;

    normalized.push({ name: safeName, type, url });
  }

  return normalized;
}

function fetchReferenceImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    const req = https.get(url, (res) => {
      if (res.statusCode !== undefined && (res.statusCode < 200 || res.statusCode >= 300)) {
        res.resume();
        reject(new Error(`Failed to fetch reference image: HTTP ${res.statusCode}`));
        return;
      }

      res.on("data", (chunk: Buffer) => {
        total += chunk.byteLength;
        if (total > MAX_REFERENCE_IMAGE_BYTES) {
          req.destroy(new Error("each reference image must be 10MB or smaller"));
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });

    req.on("error", reject);
  });
}

async function toOpenAIReferenceFile(
  image: NormalizedReferenceImage,
): Promise<Uploadable> {
  const buffer = await fetchReferenceImageBuffer(image.url);
  return toFile(buffer, image.name, { type: image.type });
}

function formatToMime(format: Format): ImageMimeType {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  return "image/webp";
}

async function uploadImage(
  data: Images.Image,
  contentType: ImageMimeType,
): Promise<string> {
  const ext = contentType === "image/jpeg" ? "jpg" : contentType.replace("image/", "");
  const key = `images/${randomUUID()}.${ext}`;
  if (data.b64_json) return uploadImageToR2({ b64_json: data.b64_json }, key, contentType);
  if (data.url) {
    // Some providers return base64 data URLs in the url field instead of a real https URL
    const dataUrlMatch = /^data:[^;]+;base64,(.+)$/.exec(data.url);
    if (dataUrlMatch) {
      return uploadImageToR2({ b64_json: dataUrlMatch[1] }, key, contentType);
    }
    return uploadImageToR2({ url: data.url }, key, contentType);
  }
  throw new Error("OpenAI returned an image with neither url nor b64_json");
}

async function enqueueImageGeneration(
  taskId: string | undefined,
  task: () => Promise<Images.ImagesResponse>,
): Promise<Images.ImagesResponse> {
  return addTrackedImageGeneration(taskId, task);
}

function getErrorMessage(e: unknown): string {
  const err = e as {
    name?: string;
    message?: string;
    error?: { message?: string };
  };
  const isTimeout =
    err.name === "APIConnectionTimeoutError" ||
    (typeof err.message === "string" &&
      err.message.toLowerCase().includes("timed out"));
  return isTimeout
    ? "Image generation timed out. Try again, or increase OPENAI_REQUEST_TIMEOUT_MS."
    : err.error?.message ?? err.message ?? "image generation failed";
}

function sendTask(socket: { send: (data: string) => void }, taskId: string) {
  const task = getImageQueueTask(taskId);
  if (!task) {
    socket.send(
      JSON.stringify({
        id: taskId,
        status: "failed",
        total: 0,
        completed: 0,
        active: 0,
        queuedAt: Date.now(),
        failedAt: Date.now(),
        error: "task not found",
      }),
    );
    return false;
  }

  socket.send(
    JSON.stringify({
      ...task,
      error: task.errorMessage,
      images: task.result?.images,
      created: task.result?.created,
    }),
  );
  return task.status !== "completed" && task.status !== "failed";
}

async function runImageGenerationTask(
  taskId: string,
  normalized: GenerateRequest,
  referenceImages: NormalizedReferenceImage[],
) {
  try {
    const openai = getOpenAI();
    const model = getImageModel();
    const contentType = formatToMime(normalized.format);
    const responses: Images.ImagesResponse[] = [];

    if (referenceImages.length > 0) {
      responses.push(
        ...(await Promise.all(
          Array.from({ length: normalized.n }, async () => {
            const uploadables = await Promise.all(
              referenceImages.map((image) => toOpenAIReferenceFile(image)),
            );
            const editParams: Images.ImageEditParamsNonStreaming = {
              image: uploadables,
              model,
              prompt: normalized.prompt,
              size: normalized.size,
              n: 1,
              quality: normalized.quality,
              output_format: normalized.format,
              response_format: "url",
              stream: false,
            };
            return enqueueImageGeneration(taskId, () => openai.images.edit(editParams));
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
        response_format: "url",
        stream: false,
      };
      responses.push(
        ...(await Promise.all(
          Array.from({ length: normalized.n }, () =>
            enqueueImageGeneration(taskId, () =>
              openai.images.generate(requestParams),
            ),
          ),
        )),
      );
    }

    const imageData = responses
      .flatMap((response) => response.data ?? [])
      .slice(0, normalized.n);

    if (imageData.length === 0) {
      failImageQueueTask(taskId, "model returned no images");
      return;
    }

    const sources = await Promise.all(
      imageData.map((data) => uploadImage(data, contentType)),
    );

    completeImageQueueTask(taskId, {
      images: sources.map((src) => ({ src })),
      created: responses[0]?.created ?? Math.floor(Date.now() / 1000),
    });
  } catch (e: unknown) {
    failImageQueueTask(taskId, getErrorMessage(e));
  }
}

export async function generateRoutes(app: FastifyInstance) {
  app.get<{ Params: { taskId: string } }>(
    "/api/generate/ws/:taskId",
    { websocket: true },
    (socket, request) => {
      const taskId = request.params.taskId;
      const shouldSubscribe = sendTask(socket, taskId);
      if (!shouldSubscribe) {
        socket.close();
        return;
      }

      const unsubscribe = subscribeImageQueueTask(taskId, (task) => {
        socket.send(
          JSON.stringify({
            ...task,
            error: task.errorMessage,
            images: task.result?.images,
            created: task.result?.created,
          }),
        );
        if (task.status === "completed" || task.status === "failed") {
          unsubscribe();
          socket.close();
        }
      });

      socket.on("close", unsubscribe);
      socket.on("error", unsubscribe);
    },
  );

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

    const queueTaskId = normalized.taskId ?? request.id;
    const queueTask = createImageQueueTask(queueTaskId, normalized.n);
    void runImageGenerationTask(queueTaskId, normalized, referenceImages);

    return reply.send({
      taskId: queueTask.id,
      status: queueTask.status,
      total: queueTask.total,
      queuedAt: queueTask.queuedAt,
    });
  });
}
