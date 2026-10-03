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
- Core commerce tables for products, inventory, carts, orders, payments, reviews, notifications, commissions and disputes

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
The next implementation layer is request validation and CRUD endpoints for:
1. Authentication/profile
2. Seller onboarding and store management
3. Product/category management
4. Inventory
5. Cart and checkout
6. Orders and order lifecycle
7. Payment provider integration
8. Reviews
9. Admin moderation
10. Seller commissions and analytics