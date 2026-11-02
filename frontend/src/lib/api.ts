const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, "");

const ACCESS_TOKEN_KEY = "loka_token";
const PENDING_SELLER_KEY = "loka_pending_seller_application";

export type AppRole = "user" | "seller" | "admin";

export interface AuthUser {
  id: string;
  email?: string;
  role: AppRole;
}

interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

interface AuthResponse {
  user: { id: string; email?: string; app_metadata?: { role?: AppRole } };
  session: AuthSession | null;
}

export interface CurrentUserResponse {
  user: AuthUser;
  profile?: Record<string, unknown>;
}

export interface SellerApplication {
  storeName: string;
  description?: string;
}

function apiUrl(path: string): string {
  if (!API_BASE_URL) {
    throw new Error("LOKA API is not configured. Set VITE_API_BASE_URL to the backend origin.");
  }
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAuth(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  authenticated = true
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (authenticated) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiUrl(path), { ...options, headers });
  const payload = response.status === 204 ? null : await response.json().catch(() => null) as Record<string, unknown> | null;

  if (!response.ok) {
    if (response.status === 401 && authenticated) clearAuth();
    const message = typeof payload?.error === "string"
      ? payload.error
      : typeof payload?.message === "string"
        ? payload.message
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

export async function registerAccount(input: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<AuthResponse> {
  const result = await apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  }, false);

  if (result.session?.access_token) saveAccessToken(result.session.access_token);
  return result;
}

export async function loginAccount(email: string, password: string): Promise<CurrentUserResponse> {
  const result = await apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }, false);

  if (!result.session?.access_token) {
    throw new Error("Login succeeded but no session was returned. Check your email verification settings.");
  }

  saveAccessToken(result.session.access_token);
  const current = await apiRequest<CurrentUserResponse>("/api/auth/me");

  const pending = localStorage.getItem(PENDING_SELLER_KEY);
  if (pending && current.user.role === "user") {
    try {
      await apiRequest("/api/sellers/apply", { method: "POST", body: pending });
      localStorage.removeItem(PENDING_SELLER_KEY);
    } catch {
      // Keep the application draft so it can be retried after login.
    }
  }

  return current;
}

export async function submitSellerApplication(application: SellerApplication): Promise<void> {
  await apiRequest("/api/sellers/apply", {
    method: "POST",
    body: JSON.stringify(application)
  });
}

export function savePendingSellerApplication(application: SellerApplication): void {
  localStorage.setItem(PENDING_SELLER_KEY, JSON.stringify(application));
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiRequest<CurrentUserResponse>("/api/auth/me");
}

export async function logoutAccount(): Promise<void> {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } finally {
    clearAuth();
  }
}
