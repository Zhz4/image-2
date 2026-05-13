import { scrypt as scryptCallback, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const PASSWORD_HASH_PREFIX = "scrypt";

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [prefix, salt, storedKey] = passwordHash.split("$");
  if (prefix !== PASSWORD_HASH_PREFIX || !salt || !storedKey) return false;

  const storedBuffer = Buffer.from(storedKey, "base64url");
  const derivedBuffer = (await scrypt(password, salt, storedBuffer.length)) as Buffer;

  return (
    storedBuffer.length === derivedBuffer.length &&
    timingSafeEqual(storedBuffer, derivedBuffer)
  );
}
