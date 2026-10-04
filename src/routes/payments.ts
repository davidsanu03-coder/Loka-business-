import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { env } from "../config.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { getRequestSupabase } from "../lib/request-supabase.js";
import { authenticate } from "../plugins/auth.js";
import { paymentInitializeSchema, paymentVerifySchema } from "../lib/validation.js";

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}

function toMinorUnits(amount: string | number) {
  const value = String(amount);
  const [whole, fraction = ""] = value.split(".");
  const cents = fraction.padEnd(2, "0").slice(0, 2);
  return Number(BigInt(whole) * 100n + BigInt(cents));
}

function createReference(orderId: string) {
  return `LOKA-${orderId}-${Date.now()}`;
}

async function paystackRequest(path: string, init?: RequestInit) {
  if (!env.PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const body = await response.json() as {
    status?: boolean;
    message?: string;
    data?: any;
  };

  if (!response.ok || body.status !== true) {
    throw new Error(body.message ?? "Paystack request failed");
  }

  return body;
}

async function recordSuccessfulPayment(payment: any, verified: any) {
  if (!supabaseAdmin) throw new Error("Server service-role key is not configured");

  const { data: order, error: orderLookupError } = await supabaseAdmin
    .from("orders")
    .select("id, buyer_id")
    .eq("id", payment.order_id)
    .single();

  if (orderLookupError || !order) throw new Error(orderLookupError?.message ?? "Order not found");

  const paidAt = verified.paidAt ?? verified.paid_at ?? new Date().toISOString();

  const { error: paymentError } = await supabaseAdmin
    .from("payments")
    .update({
      status: "paid",
      paid_at: paidAt,
      metadata: verified
    })
    .eq("id", payment.id);

  if (paymentError) throw new Error(paymentError.message);

  const { error: transactionError } = await supabaseAdmin
    .from("transactions")
    .upsert({
      payment_id: payment.id,
      order_id: payment.order_id,
      user_id: order.buyer_id,
      type: "payment",
      amount: payment.amount,
      currency: payment.currency,
      reference: payment.provider_reference,
      status: "success",
      metadata: verified
    }, { onConflict: "reference" });

  if (transactionError) throw new Error(transactionError.message);

  const { error: orderError } = await supabaseAdmin
    .from("orders")
    .update({ status: "confirmed" })
    .eq("id", payment.order_id)
    .eq("buyer_id", payment.user_id)
    .eq("status", "pending");

  if (orderError) throw new Error(orderError.message);
}

export async function paymentRoutes(app: FastifyInstance) {
  app.post("/api/payments/webhook", async (request, reply) => {
    if (!env.PAYSTACK_SECRET_KEY) {
      return reply.code(503).send({ error: "Payment provider is not configured" });
    }

    const signature = request.headers["x-paystack-signature"];
    if (typeof signature !== "string") {
      return reply.code(401).send({ error: "Missing payment signature" });
    }

    const rawBody = request.rawBody;
    const payload = rawBody ?? JSON.stringify(request.body);
    const expected = crypto
      .createHmac("sha512", env.PAYSTACK_SECRET_KEY)
      .update(payload)
      .digest("hex");

    if (signature.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return reply.code(401).send({ error: "Invalid payment signature" });
    }

    const event = request.body as { event?: string; data?: any };

    if (event.event === "charge.success" && event.data?.reference && supabaseAdmin) {
      const reference = String(event.data.reference);
      const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("provider", "paystack")
        .eq("provider_reference", reference)
        .maybeSingle();

      if (payment && payment.status !== "paid") {
        const expectedAmount = toMinorUnits(String(payment.amount));
        const verifiedAmount = Number(event.data.amount);
        const verifiedCurrency = String(event.data.currency ?? "").toUpperCase();

        if (verifiedAmount === expectedAmount && verifiedCurrency === String(payment.currency).toUpperCase()) {
          await recordSuccessfulPayment(payment, event.data);
        }
      }
    }

    return reply.code(200).send({ received: true });
  });

  app.register(async (payments) => {
    payments.addHook("preHandler", authenticate);

    payments.post("/initialize", async (request) => {
      const body = paymentInitializeSchema.parse(request.body);

      if (!supabaseAdmin) {
        throw payments.httpErrors.internalServerError("Server service-role key is not configured");
      }

      if (!env.PAYSTACK_SECRET_KEY) {
        throw payments.httpErrors.serviceUnavailable("Payment provider is not configured");
      }

      const client = getRequestSupabase(request);
      const { data: order, error: orderError } = await client
        .from("orders")
        .select("id, buyer_id, total, currency, status")
        .eq("id", body.orderId)
        .eq("buyer_id", request.user!.id)
        .single();

      if (orderError || !order) throw payments.httpErrors.notFound("Order not found");
      if (order.status !== "pending") throw payments.httpErrors.badRequest("Only pending orders can be paid");
      if (order.currency !== "NGN") throw payments.httpErrors.badRequest("Only NGN payments are currently supported");

      const { data: existing } = await supabaseAdmin
        .from("payments")
        .select("id, provider_reference, status, amount, currency")
        .eq("order_id", order.id)
        .eq("provider", "paystack")
        .in("status", ["pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.provider_reference) {
        return {
          data: {
            reference: existing.provider_reference,
            status: existing.status,
            amount: existing.amount,
            currency: existing.currency
          }
        };
      }

      const reference = createReference(order.id);
      const amount = toMinorUnits(String(order.total));

      const initialized = await paystackRequest("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: request.user!.email,
          amount: String(amount),
          currency: "NGN",
          reference,
          ...(env.PAYSTACK_CALLBACK_URL ? { callback_url: env.PAYSTACK_CALLBACK_URL } : {}),
          metadata: {
            order_id: order.id,
            buyer_id: request.user!.id
          }
        })
      });

      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          order_id: order.id,
          provider: "paystack",
          provider_reference: initialized.data.reference,
          amount: order.total,
          currency: order.currency,
          status: "pending",
          metadata: {
            access_code: initialized.data.access_code,
            authorization_url: initialized.data.authorization_url
          }
        })
        .select("id, order_id, provider, provider_reference, amount, currency, status")
        .single();

      if (paymentError) throw payments.httpErrors.internalServerError(paymentError.message);

      return {
        data: payment,
        checkout: {
          authorizationUrl: initialized.data.authorization_url,
          accessCode: initialized.data.access_code,
          reference: initialized.data.reference
        }
      };
    });

    payments.post("/verify", async (request) => {
      const body = paymentVerifySchema.parse(request.body);

      if (!supabaseAdmin) {
        throw payments.httpErrors.internalServerError("Server service-role key is not configured");
      }

      if (!env.PAYSTACK_SECRET_KEY) {
        throw payments.httpErrors.serviceUnavailable("Payment provider is not configured");
      }

      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("payments")
        .select("*")
        .eq("provider", "paystack")
        .eq("provider_reference", body.reference)
        .maybeSingle();

      if (paymentError) throw payments.httpErrors.internalServerError(paymentError.message);
      if (!payment) throw payments.httpErrors.notFound("Payment not found");

      const { data: order } = await getRequestSupabase(request)
        .from("orders")
        .select("id, buyer_id, total, currency, status")
        .eq("id", payment.order_id)
        .eq("buyer_id", request.user!.id)
        .single();

      if (!order) throw payments.httpErrors.notFound("Order not found");

      const verified = await paystackRequest(`/transaction/verify/${encodeURIComponent(body.reference)}`);
      const transaction = verified.data;

      const expectedAmount = toMinorUnits(String(order.total));
      const actualAmount = Number(transaction.amount);
      const currency = String(transaction.currency ?? "").toUpperCase();

      if (currency !== "NGN" || actualAmount !== expectedAmount) {
        throw payments.httpErrors.badRequest("Payment amount or currency does not match the order");
      }

      if (transaction.status === "success") {
        await recordSuccessfulPayment(payment, transaction);
      } else if (["failed", "abandoned", "reversed"].includes(transaction.status)) {
        await supabaseAdmin
          .from("payments")
          .update({ status: "failed", metadata: transaction })
          .eq("id", payment.id);
      }

      const { data: updatedPayment } = await supabaseAdmin
        .from("payments")
        .select("id, order_id, provider, provider_reference, amount, currency, status, paid_at")
        .eq("id", payment.id)
        .single();

      return {
        data: updatedPayment,
        providerStatus: transaction.status
      };
    });
  }, { prefix: "/api/payments" });
}
