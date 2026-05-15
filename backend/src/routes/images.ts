import type { FastifyInstance } from "fastify";

import {
  getR2ObjectByKey,
  getR2PublicObjectKey,
} from "../lib/r2.js";

type ProxyImageQuery = {
  url?: string;
};

function getFallbackContentType(key: string) {
  const lower = key.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/png";
}

export async function imageRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ProxyImageQuery }>(
    "/api/images/proxy",
    async (request, reply) => {
      const sourceUrl = request.query.url?.trim();
      if (!sourceUrl) {
        return reply.status(400).send({ error: "url is required" });
      }

      let key: string | null;
      try {
        key = getR2PublicObjectKey(sourceUrl);
      } catch {
        return reply.status(400).send({ error: "url must be a valid R2 public URL" });
      }

      if (!key) {
        return reply.status(403).send({ error: "only configured R2 image URLs can be proxied" });
      }

      try {
        const object = await getR2ObjectByKey(key);
        reply.header("Content-Type", object.contentType ?? getFallbackContentType(key));
        reply.header("Cache-Control", "private, max-age=300");
        if (object.contentLength != null) {
          reply.header("Content-Length", String(object.contentLength));
        }
        if (object.etag) reply.header("ETag", object.etag);
        if (object.lastModified) reply.header("Last-Modified", object.lastModified.toUTCString());
        return reply.send(object.body);
      } catch (error) {
        request.log.error({ error, key }, "failed to proxy R2 image");
        return reply.status(404).send({ error: "image not found" });
      }
    },
  );
}
