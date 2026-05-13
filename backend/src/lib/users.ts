import { randomUUID } from "node:crypto";

import { firstD1, queryD1 } from "./d1.js";

export type StoredUser = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

export type PublicUser = {
  id: string;
  email: string;
  createdAt: string;
};

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.created_at,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  return firstD1<StoredUser>(
    "SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = ? LIMIT 1",
    [normalizeEmail(email)],
  );
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  return firstD1<StoredUser>(
    "SELECT id, email, password_hash, created_at, updated_at FROM users WHERE id = ? LIMIT 1",
    [id],
  );
}

export async function createUser(
  email: string,
  passwordHash: string,
): Promise<StoredUser> {
  const now = new Date().toISOString();
  const user: StoredUser = {
    id: randomUUID(),
    email: normalizeEmail(email),
    password_hash: passwordHash,
    created_at: now,
    updated_at: now,
  };

  await queryD1(
    `INSERT INTO users (id, email, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [user.id, user.email, user.password_hash, user.created_at, user.updated_at],
  );

  return user;
}
