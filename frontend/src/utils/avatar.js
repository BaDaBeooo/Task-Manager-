import api from "../services/api";

/**
 * Resolve avatar paths returned by the backend for both supported deployments:
 * - direct API during local development: http://127.0.0.1:8000 + /users/{id}/avatar
 * - reverse proxy deployment: /api/users/{id}/avatar
 */
export function resolveAvatarUrl(value) {
  if (!value || typeof value !== "string") return "";

  // Absolute URL already supplied by the API.
  if (/^https?:\/\//i.test(value)) return value;

  const baseURL = String(api.defaults.baseURL || "").replace(/\/$/, "");

  // In direct-backend mode, avatar_url is persisted with an /api prefix for
  // Nginx, but FastAPI itself exposes /users/... (without /api).
  if (/^https?:\/\//i.test(baseURL)) {
    const backendBase = new URL(baseURL);
    const path = value.replace(/^\/api(?=\/)/, "");
    return new URL(path.startsWith("/") ? path : `/${path}`, backendBase.origin).toString();
  }

  // With Nginx/reverse proxy, keep /api so the proxy can strip it and forward
  // the request to FastAPI. A root-relative URL also avoids localhost:5173
  // being mistaken for the backend in direct-API development mode.
  return value.startsWith("/") ? value : `/${value}`;
}
