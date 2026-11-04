import { notifyPaymentSuccess } from "@/lib/sms/transactional";
import { emailPaymentSuccess } from "@/lib/email/send";
import { createServiceClient } from "@/lib/supabase/service";

export type PaymentVerifyInput = {
  provider?: string;
  authority: string;
  amount: number;
  orderId: string;
  eventKey: string;
  statusFromGateway?: string;
};

export type PaymentVerifyResult =
  | { ok: true; alreadyProcessed: boolean; refId?: string | null; paymentStatus: string }
  | { ok: false; error: string; detail?: string };

/**
 * جریان استاندارد فروشگاه‌های ایرانی:
 * 1) callback مرورگر فقط شروع verify است
 * 2) مبلغ verify === مبلغ سفارش
 * 3) event_key یکتا → دوبار paid نشود
 * 4) بدون MERCHANT_ID → paid جعلی از query پذیرفته نمی‌شود
 */
export async function verifyAndApplyPayment(
  input: PaymentVerifyInput,
): Promise<PaymentVerifyResult> {
  const provider = input.provider || "zarinpal";
  const authority = String(input.authority || "").trim();
  const orderId = String(input.orderId || "").trim();
  const amount = Number(input.amount);
  const eventKey = String(input.eventKey || authority).trim();

  if (!authority || !orderId || !eventKey) {
    return { ok: false, error: "invalid_input" };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "invalid_amount" };
  }

  const service = createServiceClient();

  const { data: existing } = await service
    .from("payment_webhook_events")
    .select("id, verified, status")
    .eq("provider", provider)
    .eq("event_key", eventKey)
    .maybeSingle();

  if (existing?.verified) {
    return { ok: true, alreadyProcessed: true, paymentStatus: "paid" };
  }

  const { data: order, error: orderErr } = await service
    .from("orders")
    .select("id, total, total_amount, payment_status, status, shipping_phone, shipping_name, shipping_email, user_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return { ok: false, error: "order_not_found" };
  }

  const orderTotal = Number((order as { total?: number }).total ?? 0);
  if (Math.round(orderTotal) !== Math.round(amount)) {
    await service.from("payment_webhook_events").upsert(
      {
        provider,
        event_key: eventKey,
        authority,
        order_id: orderId,
        amount,
        status: "amount_mismatch",
        verified: false,
        error_message: `expected ${orderTotal} got ${amount}`,
        payload: { authority, amount },
      },
      { onConflict: "provider,event_key" },
    );
    return { ok: false, error: "amount_mismatch" };
  }

  const payStatus = String((order as { payment_status?: string }).payment_status || "");
  if (payStatus === "paid" || payStatus === "refunded") {
    return { ok: true, alreadyProcessed: true, paymentStatus: payStatus };
  }

  const merchantId = process.env.ZARINPAL_MERCHANT_ID?.trim();
  let refId: string | null = null;
  let gatewayOk = false;

  if (merchantId) {
    try {
      const res = await fetch("https://api.zarinpal.com/pg/v4/payment/verify.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          amount: Math.round(amount),
          authority,
        }),
      });
      const json = (await res.json()) as {
        data?: { code?: number; ref_id?: number | string };
      };
      const code = Number(json?.data?.code);
      if (code === 100 || code === 101) {
        gatewayOk = true;
        refId = json?.data?.ref_id != null ? String(json.data.ref_id) : null;
      } else {
        await service.from("payment_webhook_events").upsert(
          {
            provider,
            event_key: eventKey,
            authority,
            order_id: orderId,
            amount,
            status: "gateway_rejected",
            verified: false,
            payload: json as any,
            error_message: `code ${code}`,
          },
          { onConflict: "provider,event_key" },
        );
        return { ok: false, error: "gateway_rejected", detail: String(code) };
      }
    } catch (e) {
      return {
        ok: false,
        error: "gateway_network",
        detail: e instanceof Error ? e.message : "err",
      };
    }
  } else if (
    process.env.PAYMENT_TEST_MODE === "true" &&
    process.env.VERCEL_ENV !== "production" &&
    process.env.NODE_ENV !== "production"
  ) {
    // فقط غیرپروداکشن — در پروداکشن بدون MERCHANT_ID هرگز paid نشود
    gatewayOk = true;
    refId = `TEST-${authority.slice(0, 12)}`;
  } else {
    return { ok: false, error: "merchant_not_configured" };
  }

  if (!gatewayOk) return { ok: false, error: "verify_failed" };

  const { error: upErr } = await service
    .from("orders")
    .update({
      payment_status: "paid",
      status: "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .neq("payment_status", "paid");

  if (upErr) {
    console.error("[verifyAndApplyPayment order]", upErr);
    return { ok: false, error: "order_update_failed" };
  }

  await service.from("payment_webhook_events").upsert(
    {
      provider,
      event_key: eventKey,
      authority,
      ref_id: refId,
      order_id: orderId,
      amount,
      status: "paid",
      verified: true,
      payload: { authority, refId },
    },
    { onConflict: "provider,event_key" },
  );

  try {
    const { writeFinancialAudit } = await import("@/lib/finance/audit");
    await writeFinancialAudit({
      eventType: "payment_verified",
      orderId,
      amount,
      meta: { provider, authority, refId },
    });
  } catch {
    /* optional */
  }

  
  try {
    const phone = String((order as { shipping_phone?: string }).shipping_phone ?? "");
    const name = String((order as { shipping_name?: string }).shipping_name ?? "مشتری");
    const total = String(
      (order as { total_amount?: number }).total_amount ??
        (order as { total?: number }).total ??
        amount ??
        "",
    );
    await notifyPaymentSuccess({ phone, name, orderId, amount: total });
  } catch (smsErr) {
    console.warn("[sms payment]", smsErr);
  }

  
  try {
    let emailTo = String((order as { shipping_email?: string }).shipping_email ?? "").trim();
    if (!emailTo) {
      try {
        const uid = String((order as { user_id?: string }).user_id ?? "");
        if (uid) {
          const { data: u } = await service.auth.admin.getUserById(uid);
          emailTo = String(u?.user?.email ?? "").trim();
        }
      } catch {
        /* optional */
      }
    }
    if (emailTo) {
      await emailPaymentSuccess({
        to: emailTo,
        customerName: String((order as { shipping_name?: string }).shipping_name ?? "مشتری"),
        orderId,
        amount: String(
          (order as { total_amount?: number }).total_amount ??
            (order as { total?: number }).total ??
            amount ??
            "",
        ),
      });
    }
  } catch (emErr) {
    console.warn("[email payment]", emErr);
  }

  return { ok: true, alreadyProcessed: false, refId, paymentStatus: "paid" };
}
