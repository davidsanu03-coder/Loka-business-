# LOKA Nigeria  Business 
foundation for LOKA — a multi-seller e-commerce marketplace.

## Backend domains
- **User / Buyer** — account, profile, cart, wishlist, orders, reviews and notifications.
- **Seller** — seller onboarding, store, products, inventory, seller orders and earnings.
- **Company / Admin** — platform users, sellers, products, orders, commissions, disputes and operational oversight.

## Architecture
One backend with role-based access control:
`/api/user`
`/api/seller`
`/api/admin`

Shared infrastructure:
- Node.js + TypeScript
- Fastify REST API
- Supabase PostgreSQL
- Supabase Auth
- PostgreSQL Row Level Security
- Zod validation

## Current foundation
- Fastify server
- Health endpoint
- Supabase bearer-token authentication
- User/seller/admin RBAC
- Initial buyer, seller and admin routes
- Marketplace database schema
- RLS policies for buyer/seller/admin access
- Core commerce tables for products, inventory, carts, checkout sessions, seller orders, payments, payment allocations, reviews, notifications, commissions and disputes
- Atomic multi-seller checkout: one checkout session can create multiple seller orders
- One Paystack transaction per checkout session with payment allocation across seller orders
- Payment settlement confirms orders and converts reserved stock into sold stock
- Failed/cancelled/expired checkout flows release reserved inventory
- Seller order lifecycle: confirmed → processing → shipped → delivered
- Commission accounting with seller-rate snapshots, eligibility on delivery and refund reversals
- Paystack partial/full refund workflow with webhook reconciliation
- Buyer/seller notification inbox and order/payment/refund notifications
- Admin and seller operational analytics endpoints

## Local setup
```bash
npm install
cp .env.example .env
npm run dev
```

Required environment variables are documented in `.env.example`.

## Database
The initial marketplace schema is in `supabase/schema.sql`. It is intended for a dedicated LOKA Supabase project, not the existing Royexa CRM database.

## Build direction
Phase 1 and Phase 2 are implemented. Phase 2.5 now covers the production checkout boundary:
1. Checkout session creation
2. Multi-seller order splitting
3. Single Paystack payment initialization/verification/webhook handling
4. Payment allocation to seller orders
5. Inventory reservation, settlement and release
6. Order lifecycle enforcement
7. Automatic expiry of unpaid checkout sessions

Next: payment/refund settlement hardening, commissions, notifications and analytics before Phase 3.