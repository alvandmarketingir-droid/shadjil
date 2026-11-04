import { createServiceClient } from "@/lib/supabase/service";

export type JobType =
  | "email.order_placed"
  | "email.payment_success"
  | "email.shipped"
  | "sms.generic"
  | "generic";

export async function enqueueJob(
  jobType: JobType | string,
  payload: Record<string, unknown> = {},
  opts?: { delaySeconds?: number; maxAttempts?: number },
) {
  const service = createServiceClient();
  const available_at = new Date(
    Date.now() + Math.max(0, opts?.delaySeconds ?? 0) * 1000,
  ).toISOString();
  const { data, error } = await service
    .from("job_queue")
    .insert({
      job_type: jobType,
      payload: payload as any,
      status: "pending",
      available_at,
      max_attempts: opts?.maxAttempts ?? 5,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[enqueueJob]", error.message);
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, id: data.id as string };
}

async function processOne(job: {
  id: string;
  job_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
}) {
  const { job_type, payload } = job;
  // Handlers — expand later; fail-soft import
  if (job_type.startsWith("email.")) {
    const { sendTransactionalEmail, emailOrderPlaced, emailPaymentSuccess, emailShipped } =
      await import("@/lib/email/send");
    if (job_type === "email.order_placed") {
      return emailOrderPlaced({
        to: String(payload.to ?? ""),
        customerName: String(payload.customerName ?? ""),
        orderId: payload.orderId as string | number,
        amount: payload.amount as string | number | undefined,
      });
    }
    if (job_type === "email.payment_success") {
      return emailPaymentSuccess({
        to: String(payload.to ?? ""),
        customerName: String(payload.customerName ?? ""),
        orderId: payload.orderId as string | number,
        amount: payload.amount as string | number | undefined,
      });
    }
    if (job_type === "email.shipped") {
      return emailShipped({
        to: String(payload.to ?? ""),
        customerName: String(payload.customerName ?? ""),
        orderId: payload.orderId as string | number,
        tracking: payload.tracking as string | null | undefined,
      });
    }
    return sendTransactionalEmail({
      to: String(payload.to ?? ""),
      subject: String(payload.subject ?? "پیام"),
      html: String(payload.html ?? ""),
      text: payload.text ? String(payload.text) : undefined,
    });
  }
  // unknown job types: mark done after log
  console.warn("[job] unhandled type", job_type);
  return { ok: true as const };
}

export async function processPendingJobs(limit = 10) {
  const service = createServiceClient();
  const now = new Date().toISOString();

  const { data: jobs, error } = await service
    .from("job_queue")
    .select("id, job_type, payload, attempts, max_attempts")
    .eq("status", "pending")
    .lte("available_at", now)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[processPendingJobs]", error.message);
    return { ok: false as const, error: error.message, processed: 0 };
  }
  if (!jobs?.length) return { ok: true as const, processed: 0 };

  let processed = 0;
  for (const job of jobs) {
    const { error: lockErr } = await service
      .from("job_queue")
      .update({
        status: "processing",
        locked_at: now,
        attempts: (job.attempts ?? 0) + 1,
        updated_at: now,
      })
      .eq("id", job.id)
      .eq("status", "pending");
    if (lockErr) continue;

    try {
      const result = await processOne({
        id: job.id,
        job_type: job.job_type,
        payload: (job.payload as Record<string, unknown>) || {},
        attempts: (job.attempts ?? 0) + 1,
        max_attempts: job.max_attempts ?? 5,
      });
      const failed = result && "ok" in result && result.ok === false && !(result as { skipped?: boolean }).skipped;
      if (failed) {
        const attempts = (job.attempts ?? 0) + 1;
        const max = job.max_attempts ?? 5;
        if (attempts >= max) {
          await service
            .from("job_queue")
            .update({
              status: "failed",
              last_error: String((result as { error?: string }).error ?? "failed"),
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        } else {
          // backoff ~ attempts * 60s
          const avail = new Date(Date.now() + attempts * 60_000).toISOString();
          await service
            .from("job_queue")
            .update({
              status: "pending",
              available_at: avail,
              last_error: String((result as { error?: string }).error ?? "retry"),
              locked_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        }
      } else {
        await service
          .from("job_queue")
          .update({
            status: "done",
            last_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
      }
      processed += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      const attempts = (job.attempts ?? 0) + 1;
      const max = job.max_attempts ?? 5;
      await service
        .from("job_queue")
        .update({
          status: attempts >= max ? "failed" : "pending",
          available_at:
            attempts >= max
              ? now
              : new Date(Date.now() + attempts * 60_000).toISOString(),
          last_error: msg,
          locked_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      processed += 1;
    }
  }
  return { ok: true as const, processed };
}

/** enqueue + تلاش فوری برای پردازش (مناسب Hobby بدون کرون هر ۵ دقیقه) */
export async function enqueueAndKick(
  jobType: JobType | string,
  payload: Record<string, unknown> = {},
  opts?: { delaySeconds?: number; maxAttempts?: number },
) {
  const enq = await enqueueJob(jobType, payload, opts);
  // best-effort; خطا مانع enqueue نیست
  try {
    await processPendingJobs(5);
  } catch (e) {
    console.warn("[enqueueAndKick process]", e);
  }
  return enq;
}
