import type { FastifyInstance } from "fastify";

import { requireAuth } from "../lib/auth.js";
import { createUserToken } from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  isValidEmail,
  normalizeEmail,
  toPublicUser,
} from "../lib/users.js";

type AuthBody = {
  email?: unknown;
  password?: unknown;
};

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function parseAuthBody(body: AuthBody | undefined):
  | { email: string; password: string }
  | { error: string } {
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !isValidEmail(email)) {
    return { error: "valid email is required" };
  }

  if (
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return {
      error: `password must be ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`,
    };
  }

  return { email, password };
}

function makeAuthResponse(user: Parameters<typeof toPublicUser>[0]) {
  return {
    token: createUserToken({ id: user.id, email: user.email }),
    user: toPublicUser(user),
  };
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: AuthBody }>("/api/auth/register", async (request, reply) => {
    const parsed = parseAuthBody(request.body);
    if ("error" in parsed) {
      return reply.status(400).send({ error: parsed.error });
    }

    const existing = await findUserByEmail(parsed.email);
    if (existing) {
      return reply.status(409).send({ error: "email is already registered" });
    }

    try {
      const user = await createUser(parsed.email, await hashPassword(parsed.password));
      return reply.status(201).send(makeAuthResponse(user));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.toLowerCase().includes("unique")) {
        return reply.status(409).send({ error: "email is already registered" });
      }
      throw error;
    }
  });

  app.post<{ Body: AuthBody }>("/api/auth/login", async (request, reply) => {
    const parsed = parseAuthBody(request.body);
    if ("error" in parsed) {
      return reply.status(400).send({ error: parsed.error });
    }

    const user = await findUserByEmail(parsed.email);
    if (!user || !(await verifyPassword(parsed.password, user.password_hash))) {
      return reply.status(401).send({ error: "invalid email or password" });
    }

    return reply.send(makeAuthResponse(user));
  });

  app.get("/api/auth/me", { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUser?.id;
    const user = userId ? await findUserById(userId) : null;
    if (!user) {
      return reply.status(401).send({ error: "authentication required" });
    }

    return reply.send({ user: toPublicUser(user) });
  });
}
