import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { env } from "../config.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { getRequestSupabase } from "../lib/request-supabase.js";
import { authenticate, requireRole } from "../plugins/auth.js";
import { paymentInitializeSchema, paymentVerifySchema, refundSchema } from "../lib/validation.js";

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

function createReference(checkoutSessionId: string) {
  return `LOKA-CS-${checkoutSessionId}-${Date.now()}`;
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

async function completeSessionPayment(paymentId: string, providerData: any) {
  if (!supabaseAdmin) throw new Error("Server service-role key is not configured");

  const { data, error } = await supabaseAdmin.rpc("complete_checkout_payment", {
    p_payment_id: paymentId,
    p_provider_data: providerData ?? {}
  });

  if (error) throw new Error(error.message);
  return data;
}

async function failSessionPayment(paymentId: string, providerData: any) {
  if (!supabaseAdmin) throw new Error("Server service-role key is not configured");

  const { data, error } = await supabaseAdmin.rpc("fail_checkout_payment", {
    p_payment_id: paymentId,
    p_provider_data: providerData ?? {}
  });

  if (error) throw new Error(error.message);
  return data;
}

async function recordLegacySuccessfulPayment(payment: any, verified: any) {
  if (!supabaseAdmin) throw new Error("Server service-role key is not configured");

  const { data: order, error: orderLookupError } = await supabaseAdmin
    .from("orders")
    .select("id, buyer_id, total, currency")
    .eq("id", payment.order_id)
    .single();

  if (orderLookupError || !order) {
    throw new Error(orderLookupError?.message ?? "Order not found");
  }

  const paidAt = verified.paidAt ?? verified.paid_at ?? new Date().toISOString();

  const { error: paymentError } = await supabaseAdmin
    .from("payments")
    .update({
      status: "paid",
      paid_at: paidAt,
      metadata: verified,
      updated_at: new Date().toISOString()
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
    .update({ status: "confirmed", updated_at: new Date().toISOString() })
    .eq("id", payment.order_id)
    .eq("buyer_id", order.buyer_id)
    .eq("status", "pending");

  if (orderError) throw new Error(orderError.message);
}

async function handleSuccessfulPayment(payment: any, providerData: any) {
  if (payment.checkout_session_id) {
    return completeSessionPayment(payment.id, providerData);
  }

  return recordLegacySuccessfulPayment(payment, providerData);
}

async function handleFailedPayment(payment: any, providerData: any) {
  if (payment.checkout_session_id) {
    return failSessionPayment(payment.id, providerData);
  }

  if (!supabaseAdmin) throw new Error("Server service-role key is not configured");

  const { error } = await supabaseAdmin
    .from("payments")
    .update({
      status: "failed",
      metadata: providerData,
      updated_at: new Date().toISOString()
    })
    .eq("id", payment.id);

  if (error) throw new Error(error.message);
}

async function findSessionForOrder(orderId: string, userId: string) {
  if (!supabaseAdmin) throw new Error("Server service-role key is not configured");

  const { data, error } = await supabaseAdmin
    .from("checkout_session_orders")
    .select("checkout_session_id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const { data: session, error: sessionError } = await supabaseAdmin
    .from("checkout_sessions")
    .select("id")
    .eq("id", data.checkout_session_id)
    .eq("buyer_id", userId)
    .maybeSingle();

  if (sessionError) throw new Error(sessionError.message);
  return session?.id ?? null;
}

async function getSessionForBuyer(request: any, sessionId: string) {
  const { data, error } = await getRequestSupabase(request)
    .from("checkout_sessions")
    .select("id, buyer_id, status, subtotal, shipping_fee, total, currency, expires_at")
    .eq("id", sessionId)
    .eq("buyer_id", request.user!.id)
    .single();

  if (error || !data) return null;
  return data;
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

    if (
      signature.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    ) {
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

        if (
          verifiedAmount === expectedAmount &&
          verifiedCurrency === String(payment.currency).toUpperCase()
        ) {
          await handleSuccessfulPayment(payment, event.data);
        }
      }
    }

    if (
      typeof event.event === "string" &&
      event.event.startsWith("refund.") &&
      event.data &&
      supabaseAdmin
    ) {
      const transactionReference =
        typeof event.data.transaction === "string"
          ? event.data.transaction
          : event.data.transaction?.reference;

      if (transactionReference) {
        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, provider_reference")
          .eq("provider", "paystack")
          .eq("provider_reference", String(transactionReference))
          .maybeSingle();

        if (payment) {
          const rawStatus = String(event.data.status ?? "").toLowerCase();
          const statusMap: Record<string, string> = {
            pending: "pending",
            processing: "processing",
            "needs-attention": "needs_attention",
            "needs_attention": "needs_attention",
            processed: "processed",
            failed: "failed"
          };
          const mappedStatus = statusMap[rawStatus];

          if (mappedStatus) {
            let refundId: string | null = null;

            if (event.data.id != null) {
              const { data: existingRefund } = await supabaseAdmin
                .from("payment_refunds")
                .select("id")
                .eq("provider_refund_id", String(event.data.id))
                .maybeSingle();
              refundId = existingRefund?.id ?? null;
            }

            if (!refundId) {
              const { data: pendingRefund } = await supabaseAdmin
                .from("payment_refunds")
                .select("id")
                .eq("payment_id", payment.id)
                .in("status", ["pending", "processing", "needs_attention"])
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              refundId = pendingRefund?.id ?? null;
            }

            if (refundId) {
              await supabaseAdmin.rpc("update_payment_refund", {
                p_refund_id: refundId,
                p_status: mappedStatus,
                p_provider_refund_id: event.data.id != null ? String(event.data.id) : null,
                p_metadata: event.data
              });
            }
          }
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

      let sessionId = body.checkoutSessionId ?? null;

      if (!sessionId && body.orderId) {
        sessionId = await findSessionForOrder(body.orderId, request.user!.id);
      }

      if (!sessionId) {
        throw payments.httpErrors.badRequest(
          "A checkout session is required. Complete checkout before payment."
        );
      }

      await supabaseAdmin.rpc("expire_checkout_sessions");

      let session = await getSessionForBuyer(request, sessionId);

      if (!session) {
        throw payments.httpErrors.notFound("Checkout session not found");
      }

      if (session.status === "pending" && new Date(session.expires_at).getTime() <= Date.now()) {
        await getRequestSupabase(request).rpc("expire_checkout_session", {
          p_session_id: session.id
        });
        session = await getSessionForBuyer(request, sessionId);
      }

      if (!session) throw payments.httpErrors.notFound("Checkout session not found");
      if (session.status !== "pending") {
        throw payments.httpErrors.badRequest("Checkout session is no longer payable");
      }
      if (session.currency !== "NGN") {
        throw payments.httpErrors.badRequest("Only NGN payments are currently supported");
      }

      const { data: existing } = await supabaseAdmin
        .from("payments")
        .select("id, checkout_session_id, provider_reference, status, amount, currency")
        .eq("checkout_session_id", session.id)
        .eq("provider", "paystack")
        .in("status", ["pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing?.provider_reference) {
        return {
          data: existing,
          checkoutSessionId: session.id
        };
      }

      const reference = createReference(session.id);
      const amount = toMinorUnits(String(session.total));

      const initialized = await paystackRequest("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: request.user!.email,
          amount: String(amount),
          currency: "NGN",
          reference,
          ...(env.PAYSTACK_CALLBACK_URL ? { callback_url: env.PAYSTACK_CALLBACK_URL } : {}),
          metadata: {
            checkout_session_id: session.id,
            buyer_id: request.user!.id,
            order_count: (await supabaseAdmin
              .from("checkout_session_orders")
              .select("order_id", { count: "exact", head: true })
              .eq("checkout_session_id", session.id)).count ?? 0
          }
        })
      });

      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          checkout_session_id: session.id,
          provider: "paystack",
          provider_reference: initialized.data.reference,
          amount: session.total,
          currency: session.currency,
          status: "pending",
          metadata: {
            access_code: initialized.data.access_code,
            authorization_url: initialized.data.authorization_url
          }
        })
        .select("id, checkout_session_id, provider, provider_reference, amount, currency, status")
        .single();

      if (paymentError) throw payments.httpErrors.internalServerError(paymentError.message);

      return {
        data: payment,
        checkoutSessionId: session.id,
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

      if (payment.checkout_session_id) {
        const session = await getSessionForBuyer(request, payment.checkout_session_id);
        if (!session) throw payments.httpErrors.notFound("Checkout session not found");

        const verified = await paystackRequest(
          `/transaction/verify/${encodeURIComponent(body.reference)}`
        );
        const transaction = verified.data;

        const expectedAmount = toMinorUnits(String(session.total));
        const actualAmount = Number(transaction.amount);
        const currency = String(transaction.currency ?? "").toUpperCase();

        if (currency !== "NGN" || actualAmount !== expectedAmount) {
          throw payments.httpErrors.badRequest(
            "Payment amount or currency does not match the checkout session"
          );
        }

        if (transaction.status === "success") {
          await handleSuccessfulPayment(payment, transaction);
        } else if (["failed", "abandoned", "reversed"].includes(transaction.status)) {
          await handleFailedPayment(payment, transaction);
        }

        const { data: updatedPayment } = await supabaseAdmin
          .from("payments")
          .select("id, checkout_session_id, provider, provider_reference, amount, currency, status, paid_at")
          .eq("id", payment.id)
          .single();

        return {
          data: updatedPayment,
          checkoutSessionId: session.id,
          providerStatus: transaction.status
        };
      }

      // Legacy single-order payment compatibility for records created before checkout sessions.
      const { data: order } = await getRequestSupabase(request)
        .from("orders")
        .select("id, buyer_id, total, currency, status")
        .eq("id", payment.order_id)
        .eq("buyer_id", request.user!.id)
        .single();

      if (!order) throw payments.httpErrors.notFound("Order not found");

      const verified = await paystackRequest(
        `/transaction/verify/${encodeURIComponent(body.reference)}`
      );
      const transaction = verified.data;

      const expectedAmount = toMinorUnits(String(order.total));
      const actualAmount = Number(transaction.amount);
      const currency = String(transaction.currency ?? "").toUpperCase();

      if (currency !== "NGN" || actualAmount !== expectedAmount) {
        throw payments.httpErrors.badRequest("Payment amount or currency does not match the order");
      }

      if (transaction.status === "success") {
        await handleSuccessfulPayment(payment, transaction);
      } else if (["failed", "abandoned", "reversed"].includes(transaction.status)) {
        await handleFailedPayment(payment, transaction);
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
    payments.post("/refunds", { preHandler: requireRole("admin") }, async (request) => {
      const body = refundSchema.parse(request.body);

      if (!supabaseAdmin) {
        throw payments.httpErrors.internalServerError("Server service-role key is not configured");
      }

      if (!env.PAYSTACK_SECRET_KEY) {
        throw payments.httpErrors.serviceUnavailable("Payment provider is not configured");
      }

      const { data: prepared, error: prepareError } = await supabaseAdmin.rpc("prepare_order_refund", {
        p_order_id: body.orderId,
        p_amount: body.amount,
        p_reason: body.reason ?? null
      });

      if (prepareError) throw payments.httpErrors.badRequest(prepareError.message);

      const refund = prepared as {
        refund_id: string;
        payment_id: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
      };

      const { data: payment, error: paymentError } = await supabaseAdmin
        .from("payments")
        .select("id, provider_reference, amount, currency")
        .eq("id", refund.payment_id)
        .single();

      if (paymentError || !payment) {
        throw payments.httpErrors.internalServerError(paymentError?.message ?? "Payment not found");
      }

      try {
        const provider = await paystackRequest("/refund", {
          method: "POST",
          body: JSON.stringify({
            transaction: payment.provider_reference,
            amount: toMinorUnits(String(refund.amount)),
            currency: refund.currency,
            customer_note: body.reason ?? "LOKA order refund",
            merchant_note: "LOKA refund for order " + refund.order_id
          })
        });

        const providerRefund = provider.data;
        const rawStatus = String(providerRefund?.status ?? "pending").toLowerCase();
        const statusMap: Record<string, "pending" | "processing" | "needs_attention" | "processed" | "failed"> = {
          pending: "pending",
          processing: "processing",
          "needs-attention": "needs_attention",
          "needs_attention": "needs_attention",
          processed: "processed",
          failed: "failed"
        };
        const mappedStatus = statusMap[rawStatus] ?? "pending";

        const { data: updated, error: updateError } = await supabaseAdmin.rpc("update_payment_refund", {
          p_refund_id: refund.refund_id,
          p_status: mappedStatus,
          p_provider_refund_id: providerRefund?.id != null ? String(providerRefund.id) : null,
          p_metadata: providerRefund ?? {}
        });

        if (updateError) throw new Error(updateError.message);

        return {
          data: updated,
          provider: providerRefund
        };
      } catch (error) {
        await supabaseAdmin.rpc("update_payment_refund", {
          p_refund_id: refund.refund_id,
          p_status: "failed",
          p_metadata: { error: error instanceof Error ? error.message : String(error) }
        });

        throw payments.httpErrors.badRequest(
          error instanceof Error ? error.message : "Refund request failed"
        );
      }
    });

  }, { prefix: "/api/payments" });
}
