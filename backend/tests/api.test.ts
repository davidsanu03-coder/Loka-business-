import test from "node:test";
import assert from "node:assert/strict";

process.env.SUPABASE_URL ??= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ??= "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
process.env.CORS_ORIGIN ??= "http://localhost:3000";

const { buildApp } = await import("../src/app.js");

test("GET /health returns healthy", async () => {
  const app = await buildApp();
  const response = await app.inject({ method: "GET", url: "/health" });
  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.status, "ok");
  await app.close();
});

test("invalid JSON returns a client error", async () => {
  const app = await buildApp();
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/login",
    headers: { "content-type": "application/json" },
    payload: '{"email":'
  });
  assert.ok(response.statusCode >= 400 && response.statusCode < 500);
  await app.close();
});
