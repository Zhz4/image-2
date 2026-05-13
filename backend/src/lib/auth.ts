import type { FastifyReply, FastifyRequest } from "fastify";

import { verifyUserToken } from "./jwt.js";
import { findUserById } from "./users.js";

export type AuthenticatedUser = {
  id: string;
  email: string;
};

declare module "fastify" {
  interface FastifyRequest {
    authUser?: AuthenticatedUser;
  }
}

function getBearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function getQueryToken(request: FastifyRequest): string | null {
  const query = request.query as { access_token?: unknown } | undefined;
  return typeof query?.access_token === "string" ? query.access_token : null;
}

async function getUserFromToken(token: string | null): Promise<AuthenticatedUser | null> {
  if (!token) return null;
  const payload = verifyUserToken(token);
  if (!payload) return null;

  const user = await findUserById(payload.sub);
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
  };
}

export async function getUserFromRequest(
  request: FastifyRequest,
): Promise<AuthenticatedUser | null> {
  const bearerToken = getBearerToken(request.headers.authorization);
  return getUserFromToken(bearerToken ?? getQueryToken(request));
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = await getUserFromRequest(request);
  if (!user) {
    await reply.status(401).send({ error: "authentication required" });
    return;
  }

  request.authUser = user;
}

export function getRequiredUser(request: FastifyRequest): AuthenticatedUser {
  if (!request.authUser) throw new Error("authenticated user missing");
  return request.authUser;
}
