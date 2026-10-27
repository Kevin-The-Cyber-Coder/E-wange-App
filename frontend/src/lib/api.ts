/**
 * Tiny fetch wrapper for the Express backend.
 *
 * Keeps the base URL, auth header and error handling in one place so
 * page code can just call `api.get("/devices")`.
 */
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const TOKEN_KEY = "e-wange.token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, endpoint, body, options = {}) {
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
    const error = new Error(payload?.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.details = payload?.details ?? null;
    throw error;
  }

  return payload?.data ?? payload;
}

export const api = {
  get: (endpoint, options) => request("GET", endpoint, undefined, options),
  post: (endpoint, body, options) => request("POST", endpoint, body, options),
  patch: (endpoint, body, options) => request("PATCH", endpoint, body, options),
  put: (endpoint, body, options) => request("PUT", endpoint, body, options),
  delete: (endpoint, options) => request("DELETE", endpoint, undefined, options),
};

export default api;
