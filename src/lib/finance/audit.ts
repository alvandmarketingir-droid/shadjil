import { createServiceClient } from "@/lib/supabase/service";

export type FinancialEvent =
  | "order_created"
  | "payment_status_change"
  | "refund_marked"
  | "discount_applied"
  | "order_cancelled";

export async function writeFinancialAudit(input: {
  eventType: FinancialEvent | string;
  orderId?: string | null;
  returnId?: string | null;
  amount?: number | null;
  meta?: Record<string, unknown>;
  actorId?: string | null;
}) {
  try {
    const service = createServiceClient();
    const { error } = await service.from("financial_audit_logs").insert({
      event_type: input.eventType,
      order_id: input.orderId ?? null,
      return_id: input.returnId ?? null,
      amount: input.amount ?? null,
      meta: (input.meta ?? null) as any,
      actor_id: input.actorId ?? null,
    });
    if (error) console.error("[writeFinancialAudit]", error.message);
  } catch (e) {
    console.error("[writeFinancialAudit]", e);
  }
}
