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


type JsonRecord = Record<string, unknown>;
const json = (value: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(value) });
const patch = (value: unknown): RequestInit => ({ method: "PATCH", body: JSON.stringify(value) });
const put = (value: unknown): RequestInit => ({ method: "PUT", body: JSON.stringify(value) });
const id = (value: string) => encodeURIComponent(value);

/**
 * Typed route map for the endpoints documented in FRONTEND_BACKEND_CONTRACT.md.
 * UI features should call this map instead of creating ad-hoc fetch requests.
 */
export const lokaApi = {
  categories: {
    list: () => apiRequest<JsonRecord>("/api/categories", {}, false),
    adminList: () => apiRequest<JsonRecord>("/api/admin/categories"),
    create: (body: JsonRecord) => apiRequest<JsonRecord>("/api/admin/categories", json(body)),
    update: (categoryId: string, body: JsonRecord) => apiRequest<JsonRecord>(`/api/admin/categories/${id(categoryId)}`, patch(body)),
    remove: (categoryId: string) => apiRequest<JsonRecord>(`/api/admin/categories/${id(categoryId)}`, { method: "DELETE" })
  },
  products: {
    reviews: (productId: string) => apiRequest<JsonRecord>(`/api/products/${id(productId)}/reviews`, {}, false),
    createReview: (productId: string, body: JsonRecord) => apiRequest<JsonRecord>(`/api/products/${id(productId)}/reviews`, json(body)),
    updateReview: (productId: string, reviewId: string, body: JsonRecord) => apiRequest<JsonRecord>(`/api/products/${id(productId)}/reviews/${id(reviewId)}`, patch(body)),
    deleteReview: (productId: string, reviewId: string) => apiRequest<JsonRecord>(`/api/products/${id(productId)}/reviews/${id(reviewId)}`, { method: "DELETE" })
  },
  user: {
    profile: () => apiRequest<JsonRecord>("/api/user/profile"),
    updateProfile: (body: JsonRecord) => apiRequest<JsonRecord>("/api/user/profile", patch(body)),
    orders: () => apiRequest<JsonRecord>("/api/user/orders"),
    order: (orderId: string) => apiRequest<JsonRecord>(`/api/user/orders/${id(orderId)}`),
    cancelOrder: (orderId: string) => apiRequest<JsonRecord>(`/api/user/orders/${id(orderId)}/cancel`, { method: "POST" }),
    notifications: () => apiRequest<JsonRecord>("/api/user/notifications"),
    markNotificationRead: (notificationId: string) => apiRequest<JsonRecord>(`/api/user/notifications/${id(notificationId)}/read`, patch({})),
    markAllNotificationsRead: () => apiRequest<JsonRecord>("/api/user/notifications/read-all", { method: "POST" }),
    wishlist: () => apiRequest<JsonRecord>("/api/user/wishlist"),
    cart: () => apiRequest<JsonRecord>("/api/user/cart"),
    setCartItem: (productId: string, quantity: number) => apiRequest<JsonRecord>(`/api/user/cart/items/${id(productId)}`, put({ quantity })),
    removeCartItem: (productId: string) => apiRequest<JsonRecord>(`/api/user/cart/items/${id(productId)}`, { method: "DELETE" }),
    clearCart: () => apiRequest<JsonRecord>("/api/user/cart", { method: "DELETE" }),
    addresses: () => apiRequest<JsonRecord>("/api/user/addresses"),
    createAddress: (body: JsonRecord) => apiRequest<JsonRecord>("/api/user/addresses", json(body)),
    updateAddress: (addressId: string, body: JsonRecord) => apiRequest<JsonRecord>(`/api/user/addresses/${id(addressId)}`, patch(body)),
    deleteAddress: (addressId: string) => apiRequest<JsonRecord>(`/api/user/addresses/${id(addressId)}`, { method: "DELETE" }),
    checkout: (body: JsonRecord) => apiRequest<JsonRecord>("/api/user/checkout", json(body)),
    checkoutSession: (sessionId: string) => apiRequest<JsonRecord>(`/api/user/checkout-sessions/${id(sessionId)}`),
    cancelCheckoutSession: (sessionId: string) => apiRequest<JsonRecord>(`/api/user/checkout-sessions/${id(sessionId)}/cancel`, { method: "POST" }),
    disputes: () => apiRequest<JsonRecord>("/api/user/disputes"),
    createOrderDispute: (orderId: string, body: JsonRecord) => apiRequest<JsonRecord>(`/api/user/orders/${id(orderId)}/disputes`, json(body)),
    updateDispute: (disputeId: string, body: JsonRecord) => apiRequest<JsonRecord>(`/api/user/disputes/${id(disputeId)}`, patch(body))
  },
  seller: {
    apply: (body: SellerApplication) => apiRequest<JsonRecord>("/api/sellers/apply", json(body)),
    profile: () => apiRequest<JsonRecord>("/api/seller/profile"),
    stores: () => apiRequest<JsonRecord>("/api/seller/stores"),
    createStore: (body: JsonRecord) => apiRequest<JsonRecord>("/api/seller/store", json(body)),
    updateStore: (storeId: string, body: JsonRecord) => apiRequest<JsonRecord>(`/api/seller/store/${id(storeId)}`, patch(body)),
    products: () => apiRequest<JsonRecord>("/api/seller/products"),
    product: (productId: string) => apiRequest<JsonRecord>(`/api/seller/products/${id(productId)}`),
    createProduct: (body: JsonRecord) => apiRequest<JsonRecord>("/api/seller/products", json(body)),
    updateProduct: (productId: string, body: JsonRecord) => apiRequest<JsonRecord>(`/api/seller/products/${id(productId)}`, patch(body)),
    deleteProduct: (productId: string) => apiRequest<JsonRecord>(`/api/seller/products/${id(productId)}`, { method: "DELETE" }),
    inventory: (productId: string) => apiRequest<JsonRecord>(`/api/seller/inventory/${id(productId)}`),
    updateInventory: (productId: string, body: JsonRecord) => apiRequest<JsonRecord>(`/api/seller/inventory/${id(productId)}`, put(body)),
    orders: () => apiRequest<JsonRecord>("/api/seller/orders"),
    updateOrderStatus: (orderId: string, status: string) => apiRequest<JsonRecord>(`/api/seller/orders/${id(orderId)}/status`, patch({ status })),
    commissions: () => apiRequest<JsonRecord>("/api/seller/commissions"),
    analytics: () => apiRequest<JsonRecord>("/api/seller/analytics"),
    dashboard: () => apiRequest<JsonRecord>("/api/seller/dashboard")
  },
  admin: {
    users: () => apiRequest<JsonRecord>("/api/admin/users"),
    sellers: () => apiRequest<JsonRecord>("/api/admin/sellers"),
    approveSeller: (userId: string) => apiRequest<JsonRecord>(`/api/admin/sellers/${id(userId)}/approve`, patch({})),
    rejectSeller: (userId: string) => apiRequest<JsonRecord>(`/api/admin/sellers/${id(userId)}/reject`, patch({})),
    suspendSeller: (userId: string) => apiRequest<JsonRecord>(`/api/admin/sellers/${id(userId)}/suspend`, patch({})),
    orders: () => apiRequest<JsonRecord>("/api/admin/orders"),
    commissions: () => apiRequest<JsonRecord>("/api/admin/commissions"),
    markCommissionPaid: (commissionId: string) => apiRequest<JsonRecord>(`/api/admin/commissions/${id(commissionId)}/paid`, patch({})),
    refund: (body: JsonRecord) => apiRequest<JsonRecord>("/api/payments/refunds", json(body)),
    analytics: () => apiRequest<JsonRecord>("/api/admin/analytics"),
    dashboard: () => apiRequest<JsonRecord>("/api/admin/dashboard"),
    disputes: () => apiRequest<JsonRecord>("/api/admin/disputes"),
    updateDispute: (disputeId: string, body: JsonRecord) => apiRequest<JsonRecord>(`/api/admin/disputes/${id(disputeId)}`, patch(body))
  },
  payments: {
    initialize: (body: JsonRecord) => apiRequest<JsonRecord>("/api/payments/initialize", json(body)),
    verify: (reference: string) => apiRequest<JsonRecord>("/api/payments/verify", json({ reference }))
  }
};
