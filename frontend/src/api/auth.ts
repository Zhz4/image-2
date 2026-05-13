import { request } from "@/api/request";
import type { AuthResponse, AuthUser } from "@/lib/types";

type AuthCredentials = {
  email: string;
  password: string;
};

export function login(credentials: AuthCredentials): Promise<AuthResponse> {
  return request<AuthResponse>({
    url: "/api/auth/login",
    method: "POST",
    data: credentials,
  });
}

export function register(credentials: AuthCredentials): Promise<AuthResponse> {
  return request<AuthResponse>({
    url: "/api/auth/register",
    method: "POST",
    data: credentials,
  });
}

export function getCurrentUser(): Promise<{ user: AuthUser }> {
  return request<{ user: AuthUser }>({
    url: "/api/auth/me",
  });
}
