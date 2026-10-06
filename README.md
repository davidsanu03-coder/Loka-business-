# LOKA — Multi-Seller E-commerce Marketplace Backend

The backend foundation for LOKA, a multi-seller marketplace designed around buyers, sellers and platform administration.

## Architecture

Role-based route domains:

`/api/user` · `/api/seller` · `/api/admin`

### Buyer
Account, profile, cart, wishlist, checkout, orders, reviews and notifications.

### Seller
Onboarding, store management, products, inventory, orders and earnings.

### Platform / Admin
User and seller management, product/order oversight, commissions, disputes and operational analytics.

## Technology

- Node.js
- TypeScript
- Fastify
- Supabase PostgreSQL
- Supabase Auth
- PostgreSQL Row Level Security
- Zod
- Paystack integration

## Commerce architecture

The backend supports multi-seller checkout, seller-order splitting, payment allocation, inventory reservation and settlement, order lifecycle management, refunds, commissions and notifications.

The key design goal is transactional consistency: one buyer checkout can produce multiple seller orders while preserving payment and inventory state.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Type-check:

```bash
npm run typecheck
```

Tests:

```bash
npm test
```

## Status

Phase 1 and Phase 2 functionality are implemented, with continued production hardening and Phase 3 capabilities.

> Built as an independent full-stack marketplace engineering project by Ojelabi David Ayomide.