import axios from "axios";
import { AxiosHeaders, type AxiosRequestConfig } from "axios";

import { getAuthToken } from "@/lib/auth-token";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3112"
).replace(/\/$/, "");

const requestClient = axios.create({
  baseURL: API_BASE_URL,
});

requestClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set("Authorization", `Bearer ${token}`);
    config.headers = headers;
  }
  return config;
});

export class ApiRequestError extends Error {
  status?: number;
  data?: unknown;

  constructor(message: string, status?: number, data?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.data = data;
  }
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? error.message;
  }

  return error instanceof Error ? error.message : "request failed";
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const { data } = await requestClient.request<T>(config);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new ApiRequestError(
        getErrorMessage(error),
        error.response?.status,
        error.response?.data,
      );
    }

    throw new ApiRequestError(getErrorMessage(error));
  }
}

export function getWebsocketUrl(path: string, includeAuth = false): string {
  const url = new URL(path, API_BASE_URL);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const token = includeAuth ? getAuthToken() : null;
  if (token) url.searchParams.set("access_token", token);
  return url.toString();
}
