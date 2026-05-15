import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import dotenv from "dotenv";
import Fastify from "fastify";
import type { FastifyError } from "fastify";

import { generateRoutes } from "./routes/generate.js";
import { imageRoutes } from "./routes/images.js";
import { openaiCompatRoutes } from "./routes/openaiCompat.js";
import { uploadRoutes } from "./routes/uploads.js";

dotenv.config();

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: true,
});
await app.register(multipart);
await app.register(websocket);

app.setErrorHandler((error: FastifyError, request, reply) => {
  if (error.statusCode === 400 && error.code === "FST_ERR_CTP_INVALID_JSON_BODY") {
    return reply.status(400).send({ error: "invalid JSON body" });
  }

  request.log.error(error);
  const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
  return reply.status(status).send({
    error: error.message || "internal server error",
  });
});

app.get("/health", async () => ({ ok: true }));
await app.register(uploadRoutes);
await app.register(imageRoutes);
await app.register(generateRoutes);
await app.register(openaiCompatRoutes);

const port = Number.parseInt(process.env.PORT ?? "3002", 10);
const safePort = Number.isFinite(port) && port > 0 ? port : 3002;

try {
  await app.listen({ port: safePort, host: "0.0.0.0" });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
