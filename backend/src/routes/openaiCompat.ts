import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

import {
  countActiveImageQueueTasksForUser,
  createImageQueueTask,
  subscribeImageQueueTask,
  type ImageQueueTaskStatus,
} from "../lib/image-queue.js";
import { uploadImageToR2, type ImageMimeType } from "../lib/r2.js";
import { runImageGenerationTask } from "./generate.js";
import {
  FORMAT_OPTIONS,
  QUALITY_OPTIONS,
  SIZE_OPTIONS,
  type Format,
  type Quality,
  type Size,
} from "../types/index.js";

type ReferenceImageEntry = { name: string; type: "image/png" | "image/jpeg" | "image/webp"; url: string };

const ANONYMOUS_OWNER_ID = "anonymous";
const DEFAULT_MAX_ACTIVE_TASKS = 2;

function getMaxActiveTasks(): number {
  const configured = Number.parseInt(
    process.env.IMAGE_GENERATION_MAX_ACTIVE_TASKS_PER_USER ?? "",
    10,
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_MAX_ACTIVE_TASKS;
}

function parseSize(value: unknown): Size {
  return typeof value === "string" && (SIZE_OPTIONS as string[]).includes(value)
    ? (value as Size)
    : "auto";
}

function parseQuality(value: unknown): Quality {
  return typeof value === "string" && (QUALITY_OPTIONS as string[]).includes(value)
    ? (value as Quality)
    : "auto";
}

function parseFormat(value: unknown): Format {
  // OpenAI uses output_format; some clients send format
  return typeof value === "string" && (FORMAT_OPTIONS as string[]).includes(value)
    ? (value as Format)
    : "png";
}

function parseN(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 4 ? Math.floor(n) : 1;
}

function waitForTask(taskId: string): Promise<ImageQueueTaskStatus> {
  return new Promise((resolve, reject) => {
    const unsubscribe = subscribeImageQueueTask(taskId, (task) => {
      if (task.status === "completed") {
        unsubscribe();
        resolve(task);
      } else if (task.status === "failed") {
        unsubscribe();
        reject(new Error(task.errorMessage ?? "image generation failed"));
      }
    });
  });
}


export async function openaiCompatRoutes(app: FastifyInstance) {
  // POST /api/v1/images/generations  — text-to-image
  app.post<{ Body: Record<string, unknown> }>(
    "/api/v1/images/generations",
    async (request, reply) => {
      const body = request.body ?? {};
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) {
        return reply.status(400).send({ error: { message: "prompt is required" } });
      }

      const format = parseFormat(body.output_format ?? body.format);
      const normalized = {
        prompt,
        size: parseSize(body.size),
        quality: parseQuality(body.quality),
        format,
        n: parseN(body.n),
      };

      if (countActiveImageQueueTasksForUser(ANONYMOUS_OWNER_ID) >= getMaxActiveTasks()) {
        return reply.status(429).send({
          error: { message: `最多同时生成 ${getMaxActiveTasks()} 个任务，请等待当前任务完成后再试` },
        });
      }

      const taskId = randomUUID();
      createImageQueueTask(taskId, normalized.n, ANONYMOUS_OWNER_ID);
      void runImageGenerationTask(taskId, normalized, []);

      try {
        const task = await waitForTask(taskId);
        const images = task.result?.images ?? [];
        return reply.send({
          created: task.result?.created ?? Math.floor(Date.now() / 1000),
          data: images.map((img) => ({ url: img.src })),
        });
      } catch (err) {
        return reply.status(500).send({
          error: { message: err instanceof Error ? err.message : "image generation failed" },
        });
      }
    },
  );

  // POST /api/v1/images/edits  — image editing (multipart)
  app.post(
    "/api/v1/images/edits",
    async (request, reply) => {
      // Collect all parts from multipart form
      const parts = request.parts();
      let prompt = "";
      let size: Size = "auto";
      let quality: Quality = "auto";
      let format: Format = "png";
      let n = 1;
      const uploadedImageUrls: ReferenceImageEntry[] = [];

      for await (const part of parts) {
        if (part.type === "file") {
          const mime = part.mimetype.toLowerCase();
          if (mime === "image/png" || mime === "image/jpeg" || mime === "image/webp") {
            const validMime = mime as "image/png" | "image/jpeg" | "image/webp";
            const buf = await part.toBuffer();
            const ext = validMime === "image/jpeg" ? "jpg" : validMime.replace("image/", "");
            const key = `references/shared/${randomUUID()}.${ext}`;
            const url = await uploadImageToR2({ buffer: buf }, key, validMime);
            uploadedImageUrls.push({
              name: part.filename || `image.${ext}`,
              type: validMime,
              url,
            });
          }
        } else {
          // field
          const value = part.value as string;
          if (part.fieldname === "prompt") prompt = value.trim();
          else if (part.fieldname === "size") size = parseSize(value);
          else if (part.fieldname === "quality") quality = parseQuality(value);
          else if (part.fieldname === "output_format" || part.fieldname === "format") {
            format = parseFormat(value);
          } else if (part.fieldname === "n") n = parseN(Number(value));
        }
      }

      if (!prompt) {
        return reply.status(400).send({ error: { message: "prompt is required" } });
      }

      const normalized = { prompt, size, quality, format, n };

      if (countActiveImageQueueTasksForUser(ANONYMOUS_OWNER_ID) >= getMaxActiveTasks()) {
        return reply.status(429).send({
          error: { message: `最多同时生成 ${getMaxActiveTasks()} 个任务，请等待当前任务完成后再试` },
        });
      }

      const taskId = randomUUID();
      createImageQueueTask(taskId, normalized.n, ANONYMOUS_OWNER_ID);
      void runImageGenerationTask(taskId, normalized, uploadedImageUrls);

      try {
        const task = await waitForTask(taskId);
        const images = task.result?.images ?? [];
        return reply.send({
          created: task.result?.created ?? Math.floor(Date.now() / 1000),
          data: images.map((img) => ({ url: img.src })),
        });
      } catch (err) {
        return reply.status(500).send({
          error: { message: err instanceof Error ? err.message : "image generation failed" },
        });
      }
    },
  );
}
