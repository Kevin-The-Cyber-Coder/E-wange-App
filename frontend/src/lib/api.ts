/**
 * Tiny fetch wrapper for the Express backend.
 *
 * Keeps the base URL, auth header and error handling in one place so
 * page code can just call `api.get("/devices")`.
 */
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "e-wange.token";

export interface RequestOptions {
  headers?: Record<string, string>;
}

export interface ApiErrorDetails {
  field: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function send(
  method: string,
  endpoint: string,
  body?: unknown,
  options: RequestOptions = {},
) {
  const token = getToken();

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Request failed (${response.status})`,
      response.status,
      payload?.details ?? null,
    );
  }

  return payload;
}

async function request(
  method: string,
  endpoint: string,
  body?: unknown,
  options: RequestOptions = {},
) {
  const payload = await send(method, endpoint, body, options);
  return payload?.data ?? payload;
}

export const api = {
  get: (endpoint: string, options?: RequestOptions) =>
    request("GET", endpoint, undefined, options),
  /** Same as `get`, but returns the whole body (`{ data, meta, ... }`). */
  getFull: (endpoint: string, options?: RequestOptions) =>
    send("GET", endpoint, undefined, options),
  post: (endpoint: string, body?: unknown, options?: RequestOptions) =>
    request("POST", endpoint, body, options),
  patch: (endpoint: string, body?: unknown, options?: RequestOptions) =>
    request("PATCH", endpoint, body, options),
  put: (endpoint: string, body?: unknown, options?: RequestOptions) =>
    request("PUT", endpoint, body, options),
  delete: (endpoint: string, options?: RequestOptions) =>
    request("DELETE", endpoint, undefined, options),
};

export default api;
