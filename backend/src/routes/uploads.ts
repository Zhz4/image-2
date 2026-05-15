import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";

import { uploadImageToR2, type ImageMimeType } from "../lib/r2.js";

const MAX_REFERENCE_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_REFERENCE_TYPES = new Set<ImageMimeType>([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function isImageMimeType(value: string): value is ImageMimeType {
  return SUPPORTED_REFERENCE_TYPES.has(value as ImageMimeType);
}

function imageExtension(contentType: ImageMimeType): string {
  return contentType === "image/jpeg" ? "jpg" : contentType.replace("image/", "");
}

function sanitizeFilename(filename: string, fallback: string): string {
  const clean = filename.trim().replace(/[\\/:*?"<>|]+/g, "-");
  return clean || fallback;
}

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/api/uploads/reference", async (request, reply) => {
    let file: Awaited<ReturnType<typeof request.file>>;

    try {
      file = await request.file({
        limits: {
          fileSize: MAX_REFERENCE_IMAGE_BYTES,
          files: 1,
        },
      });
    } catch {
      return reply.status(413).send({
        error: "each reference image must be 10MB or smaller",
      });
    }

    if (!file) {
      return reply.status(400).send({ error: "file is required" });
    }

    const contentType = file.mimetype.toLowerCase();
    if (!isImageMimeType(contentType)) {
      file.file.resume();
      return reply.status(400).send({
        error: "reference images must be PNG, JPG, or WEBP",
      });
    }

    let buffer: Buffer;
    try {
      buffer = await file.toBuffer();
    } catch {
      return reply.status(413).send({
        error: "each reference image must be 10MB or smaller",
      });
    }

    if (buffer.byteLength > MAX_REFERENCE_IMAGE_BYTES) {
      return reply.status(413).send({
        error: "each reference image must be 10MB or smaller",
      });
    }

    const ext = imageExtension(contentType);
    const key = `references/shared/${randomUUID()}.${ext}`;
    const url = await uploadImageToR2({ buffer }, key, contentType);

    return reply.send({
      name: sanitizeFilename(file.filename, `reference.${ext}`),
      type: contentType,
      url,
    });
  });
}
