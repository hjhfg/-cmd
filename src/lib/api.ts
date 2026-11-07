import { local } from "./storage";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const DEVICE_TOKEN_KEY = "mx_device_token";

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
    if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
      const b = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    /* fall through */
  }
  return `mx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable per-device identity; survives cookie blocking in embedded previews. */
export function deviceToken(): string {
  if (typeof window === "undefined") return "";
  const saved = local.get(DEVICE_TOKEN_KEY);
  if (saved && saved.length >= 16 && saved.length <= 80) return saved;
  const token = uuid();
  local.set(DEVICE_TOKEN_KEY, token);
  return token;
}

export function rotateDeviceToken(): string {
  const token = uuid();
  local.set(DEVICE_TOKEN_KEY, token);
  return token;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = "网络开小差了，请稍后重试";
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(msg, res.status);
  }
  return (await res.json()) as T;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const token = deviceToken();
  return { ...(token ? { "x-mx-token": token } : {}), ...extra };
}

async function request(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new ApiError("请求超时，请重试", 408);
    throw new ApiError("网络连接失败，请重试", 0);
  } finally {
    clearTimeout(timer);
  }
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await request(url, { cache: "no-store", credentials: "include", headers: headers() }, 20000);
  return handle<T>(res);
}

export async function apiSend<T>(url: string, body?: unknown, method: "POST" | "PATCH" | "DELETE" = "POST"): Promise<T> {
  const res = await request(
    url,
    {
      method,
      credentials: "include",
      headers: headers({ "Content-Type": "application/json" }),
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    60000,
  );
  return handle<T>(res);
}
