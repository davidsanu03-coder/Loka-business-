# LOKA Frontend ↔ Backend Contract

Backend owner: David
Frontend owner: Gemini Gem
Repository: davidsanu03-coder/Loka-business-
Base API: `<LOKA_BACKEND_URL>`
Backend: Fastify + TypeScript + Supabase Auth/PostgreSQL + Zod

## Non-negotiable integration rules

- Do not invent endpoints.
- Do not change endpoint names or response shapes from the backend without coordinating with David.
- Frontend sends the Supabase access token as:
  `Authorization: Bearer <access_token>`
- Never expose Supabase service-role/secret keys in browser code.
- Use the public Supabase URL/key only where appropriate.
- API JSON responses generally use `{ data: ... }`; some endpoints also return `message`, `meta`, `checkout`, or `providerStatus`.
- Treat UUIDs as strings.
- Money values from the API may arrive as numeric strings; convert safely for display/calculation.
- Authentication is handled by Supabase Auth through the backend auth endpoints.
- On 401, clear the stale session and send the user to login.
- On 403, show an authorization error rather than retrying.
- On 4xx validation errors, display the backend error message when safe.
- Do not put payment secret keys in frontend environment variables.

## Authentication

### POST /api/auth/register
Body:
```json
{ "email": "user@example.com", "password": "password", "fullName": "Name", "phone": "080..." }
```

### POST /api/auth/login
Body:
```json
{ "email": "user@example.com", "password": "password" }
```

### GET /api/auth/me
Authenticated.

### POST /api/auth/logout
Authenticated. Client must discard the access token/session.

### PATCH /api/user/profile
Authenticated.
Body fields may include:
```json
{ "fullName": "Name", "phone": "080...", "avatarUrl": "https://..." }
```

## Public marketplace

### GET /api/categories
Returns active categories.

### GET /api/products/:productId/reviews
Returns:
```json
{ "data": [], "meta": { "count": 0, "averageRating": 0 } }
```

## Buyer / user

All below require authentication.

### GET /api/user/profile
### GET /api/user/orders
### GET /api/user/notifications
### PATCH /api/user/notifications/:id/read
### POST /api/user/notifications/read-all
### GET /api/user/wishlist

### GET /api/user/cart
Returns cart, items, itemCount, subtotal, shippingFee, total, currency.

### PUT /api/user/cart/items/:productId
Body:
```json
{ "quantity": 1 }
```

### DELETE /api/user/cart/items/:productId
### DELETE /api/user/cart

### GET /api/user/addresses
### POST /api/user/addresses
### PATCH /api/user/addresses/:id
### DELETE /api/user/addresses/:id

Address fields:
```json
{
  "label": "Home",
  "recipientName": "Name",
  "phone": "080...",
  "addressLine1": "Address",
  "addressLine2": "Optional",
  "city": "Ibadan",
  "state": "Oyo",
  "country": "Nigeria",
  "postalCode": "200001",
  "isDefault": true
}
```

### POST /api/user/checkout
Creates an atomic checkout session and reserves inventory.
Body:
```json
{ "addressId": "uuid", "notes": "Optional" }
```

### GET /api/user/checkout-sessions/:id
### POST /api/user/checkout-sessions/:id/cancel

### GET /api/user/orders/:id
### POST /api/user/orders/:id/cancel

### GET /api/user/disputes
### POST /api/user/orders/:orderId/disputes
### PATCH /api/user/disputes/:id

### POST /api/products/:productId/reviews
### PATCH /api/products/:productId/reviews/:id
### DELETE /api/products/:productId/reviews/:id

A review requires a delivered purchase of the product.

## Seller

Seller endpoints require an authenticated seller. Admin may have access where implemented.

### GET /api/seller/profile

### GET /api/seller/stores
### POST /api/seller/store
### PATCH /api/seller/store/:id

### GET /api/seller/products
### GET /api/seller/products/:id
### POST /api/seller/products
### PATCH /api/seller/products/:id
### DELETE /api/seller/products/:id

Product fields:
```json
{
  "storeId": "uuid",
  "categoryId": "uuid",
  "name": "Product",
  "slug": "product",
  "description": "Description",
  "price": 10000,
  "compareAtPrice": 12000,
  "currency": "NGN",
  "sku": "SKU-001",
  "status": "draft",
  "metadata": {}
}
```

### GET /api/seller/inventory/:productId
### PUT /api/seller/inventory/:productId

Inventory body:
```json
{ "quantity": 10, "reservedQuantity": 0 }
```

### GET /api/seller/orders
### PATCH /api/seller/orders/:id/status

Seller order status transitions are enforced by the backend. The frontend must only present valid actions returned/allowed by the current order state.

### GET /api/seller/commissions
### GET /api/seller/analytics
### GET /api/seller/dashboard

## Seller onboarding

### POST /api/sellers/apply
Authenticated user.
Body:
```json
{ "storeName": "Store", "description": "Description" }
```

Application begins in pending status. Admin approval is required.

## Admin / company

Admin-only endpoints:

### GET /api/admin/users
### GET /api/admin/sellers
### PATCH /api/admin/sellers/:userId/approve
### PATCH /api/admin/sellers/:userId/reject
### PATCH /api/admin/sellers/:userId/suspend

### GET /api/admin/categories
Note: category listing is currently public through `GET /api/categories`; admin mutation endpoints are:
- POST /api/admin/categories
- PATCH /api/admin/categories/:id
- DELETE /api/admin/categories/:id

### GET /api/admin/orders
### GET /api/admin/commissions
### PATCH /api/admin/commissions/:id/paid
### GET /api/admin/analytics
### GET /api/admin/dashboard
### GET /api/admin/disputes
### PATCH /api/admin/disputes/:id

## Payments

Authenticated:

### POST /api/payments/initialize
Body may contain:
```json
{ "checkoutSessionId": "uuid" }
```
Returns a Paystack authorization URL/access code/reference.

### POST /api/payments/verify
Body:
```json
{ "reference": "paystack-reference" }
```

The frontend should redirect the buyer to the returned authorization URL and then verify the reference after payment return.

Admin:

### POST /api/payments/refunds
Body:
```json
{ "orderId": "uuid", "amount": 1000, "reason": "Optional" }
```

Never implement payment settlement logic in the frontend. The backend owns payment verification, order confirmation, inventory settlement/release, payment allocation and refunds.

## Expected frontend architecture

Recommended Next.js structure:

- `app/(shop)/...` — public marketplace/customer experience
- `app/(auth)/...` — login/register
- `app/seller/...` — seller dashboard
- `app/admin/...` — company/admin dashboard
- `components/...` — shared UI
- `lib/api/...` — typed backend API client
- `lib/auth/...` — session/auth helpers
- `types/...` — shared frontend API types

Create a single API client rather than scattering fetch calls across components.

The API client must automatically attach the current access token.

## Current backend phases

Phase 1:
- Authentication
- User registration/profile
- Seller registration + approval
- Seller store creation
- Product CRUD
- Categories
- Inventory

Phase 2:
- Cart
- Checkout
- Orders
- Payment integration
- Order tracking/status

Phase 3:
- Reviews
- Seller dashboard APIs
- Admin dashboard APIs
- Commission system
- Notifications
- Analytics

The backend already contains substantial Phase 3 functionality as well as dispute/refund flows.

## Gemini's job

Build and polish the frontend against this contract.

Gemini may:
- Create pages and components
- Create responsive layouts
- Build loading/error/empty states
- Create forms
- Build dashboards
- Connect existing backend endpoints
- Add frontend validation
- Add typed API helpers
- Improve accessibility
- Improve responsive behavior
- Test frontend flows

Gemini must NOT:
- Create a second backend
- Replace Fastify
- Replace Supabase
- Invent APIs
- Change database schema
- put service-role credentials in the client
- implement payment verification client-side
- silently change business rules

When an endpoint or backend behavior is missing, Gemini should report the exact missing requirement to David instead of fabricating it.
