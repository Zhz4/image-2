import { createHmac, timingSafeEqual } from "node:crypto";

export type JwtUserPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};

const DEFAULT_EXPIRES_IN_SECONDS = 7 * 24 * 60 * 60;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not configured");
  return secret;
}

function getJwtExpiresInSeconds(): number {
  const configured = Number.parseInt(process.env.JWT_EXPIRES_IN_SECONDS ?? "", 10);
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_EXPIRES_IN_SECONDS;
}

function base64UrlEncode(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

function base64UrlJson(value: unknown): string {
  return base64UrlEncode(JSON.stringify(value));
}

function signData(data: string): string {
  return createHmac("sha256", getJwtSecret()).update(data).digest("base64url");
}

function hasValidSignature(data: string, signature: string): boolean {
  const expected = Buffer.from(signData(data), "base64url");
  const actual = Buffer.from(signature, "base64url");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function parsePayload(value: string): JwtUserPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<JwtUserPayload>;

    if (
      typeof parsed.sub !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.iat !== "number" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }

    return {
      sub: parsed.sub,
      email: parsed.email,
      iat: parsed.iat,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function createUserToken(user: { id: string; email: string }): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" });
  const payload = base64UrlJson({
    sub: user.id,
    email: user.email,
    iat: now,
    exp: now + getJwtExpiresInSeconds(),
  } satisfies JwtUserPayload);
  const data = `${header}.${payload}`;
  return `${data}.${signData(data)}`;
}

export function verifyUserToken(token: string): JwtUserPayload | null {
  const [header, payload, signature, ...rest] = token.split(".");
  if (!header || !payload || !signature || rest.length > 0) return null;
  if (!hasValidSignature(`${header}.${payload}`, signature)) return null;

  const parsed = parsePayload(payload);
  if (!parsed) return null;

  const now = Math.floor(Date.now() / 1000);
  return parsed.exp > now ? parsed : null;
}
