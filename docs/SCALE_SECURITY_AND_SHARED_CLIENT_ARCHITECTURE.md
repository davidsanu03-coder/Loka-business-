# LOKA scale, security and shared-client architecture

## Current implementation boundary

The current repository contains a Fastify API, Supabase/Postgres data access, customer cart/address/checkout/order endpoints, Paystack initialize/verify/webhook handling, seller operations, and admin operations. The React/Vite client now has a role-aware dashboard entry at `/dashboard`.

This is an application foundation, **not evidence that 50,000 simultaneous active users are currently supported**. No production load test, deployment capacity review, database connection test, or payment-provider live test has been completed. Do not advertise a 50k concurrency guarantee until the acceptance tests below pass.

## Target architecture for 50,000 concurrent active users

1. **Clients:** Keep the API contract platform-neutral. React web and a future React Native/Expo Android client use the same HTTPS API, DTOs, auth token semantics, and validation rules. Share TypeScript domain types and API client code in a future workspace package; do not share browser UI components with native screens.
2. **Edge:** CDN for static assets and image transformations; WAF/bot controls and TLS at the edge; API gateway/load balancer in front of stateless Fastify instances. Autoscale instances on request rate, CPU, memory and p95 latency. Configure trusted proxy hops before relying on forwarded IP headers.
3. **API:** Keep Fastify instances stateless. Store sessions/tokens in Supabase Auth, not process memory. Add idempotency keys to checkout/payment creation and webhook processing. Set request body limits, timeouts, schema validation, and per-route quotas.
4. **Database:** Supabase Postgres remains the source of truth. Use indexed query paths, bounded pagination, short transactions, a pooler in transaction mode where compatible, and read replicas/caching for high-volume public catalogue reads if measurements justify them. Never run a connection-per-user design.
5. **Cache and queues:** Add shared Redis for rate-limit counters, short-lived catalogue/cache data, and distributed locks only where required. Use a durable queue for email, notifications, image processing, analytics events and other non-critical synchronous work. Do not rely on in-memory counters in multi-instance production.
6. **Payments:** Paystack secret keys remain server-only. Verify transaction amount, currency, reference and buyer ownership on the server. Treat signed webhooks as authoritative, verify HMAC against the raw request body, and make event handling idempotent. A browser redirect alone must never mark an order paid.
7. **Observability:** Centralized structured logs, request IDs, traces, metrics, alerting, audit events, and dashboards for API p50/p95/p99, 4xx/5xx, queue lag, DB pool saturation, payment failures and suspicious login activity. Redact passwords, tokens, payment credentials and personal data.

## Abuse prevention and login throttling

Do not block someone merely because they made three ordinary requests. That would lock out legitimate customers, and many users can share one carrier NAT or office Wi-Fi IP. Apply limits specifically to authentication and sensitive endpoints:

- Login: after 3 consecutive failed attempts for the same normalized account identifier, impose a temporary account-level cooldown (for example 15 minutes); also enforce a separate IP/network quota over a rolling window. Return a generic error so account existence is not disclosed.
- Registration, password reset, OTP, payment initialization, checkout and other sensitive routes get separate, stricter route quotas and bot challenges where risk is high.
- Record server-observed public IP, timestamp, route/action, outcome, user ID if authenticated, user-agent, request ID, and a privacy-reviewed approximate country/region from an IP intelligence provider if configured. IP geolocation is approximate and cannot identify a precise home, device, phone number, or Wi-Fi access point.
- Do not attempt to collect a person's phone location or Wi-Fi/router location silently. Precise device location requires an explicit permission flow and is not needed for ordinary login security.
- Use shared Redis or an atomic database function for counters and temporary blocks so limits work across every API instance. Trust client IP headers only from explicitly trusted proxies.
- Store security-event data with access controls, a retention schedule, audit access, and a privacy notice. Hash or truncate IPs for long-term analytics where full IP retention is unnecessary.
- Escalate repeated suspicious behavior with CAPTCHA/step-up verification and short temporary blocks. Provide a recovery/unblock path for false positives.

## Release gates for the 50k target

Before claiming 50,000 concurrent active users:

- Define workload precisely: concurrent connected users versus requests/second, endpoint mix, think time, geography, and expected peak duration.
- Run staged load tests at 1k, 5k, 10k, 25k and 50k virtual users against a production-like environment using synthetic accounts and test payments.
- Validate p95/p99 latency and error-rate SLOs, DB pool utilization, CPU/memory, cache hit ratio, queue lag, autoscaling response, and graceful degradation.
- Run spike, soak, failover, rate-limit bypass, credential-stuffing simulation, and webhook replay/idempotency tests.
- Confirm Supabase plan limits, database compute, pooler limits, storage/CDN bandwidth, API hosting concurrency and Paystack limits with the actual providers.
- Do not run high-volume tests against live payment rails; use Paystack test mode and controlled test data.

## Current completion status

- Existing backend APIs: cart, addresses, checkout sessions, buyer orders, Paystack initialization/verification/webhook, seller products/inventory/orders/analytics, and admin operations are present in the codebase.
- Frontend: role-aware dashboard entry and customer cart-to-checkout initiation UI have been added.
- Still required: end-to-end validation against configured Supabase and Paystack test credentials; checkout redirect/return verification UX; complete seller product/store management UI; admin operational controls; shared rate-limit implementation backed by Redis/atomic storage; automated integration tests; and load testing.


## Verification snapshot — 2026-11-02

- Connected Supabase project `Loka-business-` is active and healthy in `eu-west-1`, on the Free organization plan.
- Ten migrations are recorded, through `phase_three_review_dispute_indexes`.
- All inspected marketplace tables have RLS enabled. A read-only query under the `anon` database role successfully queried active public products/categories; a read-only query under `authenticated` with a synthetic unregistered subject saw zero profile rows.
- The production database currently has zero Auth users, profiles, products, orders, payments, carts and checkout sessions. Therefore no real customer/seller/admin account or checkout can be exercised against this project yet.
- Supabase security advisors reported six SECURITY DEFINER functions executable by authenticated users. The inspected checkout/order functions perform explicit `auth.uid()` and ownership checks, but each function and its grants still needs a complete security review before launch.
- Performance advisors report 12 foreign keys without covering indexes and several overlapping permissive RLS policies. The unindexed foreign keys should be prioritized before scaling.
- GitHub Actions on the current PR head passed both frontend build and backend typecheck/tests. This validates compilation and the repository's current test suite only; it is not browser E2E or production integration evidence.
- No LOKA Vercel project/backend deployment is linked in the connected Vercel account. No Paystack test transaction has been run, and no 50k load test has been run.

Do not interpret the read-only role checks as a full auth or checkout test. A real checkout requires a test buyer, approved test seller, active product with inventory, deployed API configured with the Supabase service-role key and Paystack test secret, and a configured Paystack callback/webhook URL.
