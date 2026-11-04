import { createServiceClient } from "@/lib/supabase/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { beginApiRequest, apiJson } from "@/lib/api-request";
import { emailSchema } from "@/lib/validation/common";

export async function POST(req: Request) {
  const { requestId, log } = beginApiRequest(req);
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const { success, retryAfterSec } = await checkRateLimit({
      identifier: ip,
      type: "contact",
    });

    if (!success) {
      log.warn("[contact] rate limited", { ip });
      return apiJson(
        { error: "too_many_requests", retryAfterSec, requestId },
        {
          status: 429,
          requestId,
          headers: retryAfterSec ? { "Retry-After": String(retryAfterSec) } : {},
        },
      );
    }

    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 120);
    const company = String(body.company || "")
      .trim()
      .replace(/[<>]/g, "")
      .slice(0, 120);
    const emailRaw = String(body.email || "").trim().slice(0, 200);
    const message = String(body.message || "").trim().slice(0, 4000);
    const emailParsed = emailSchema.safeParse(emailRaw);

    if (!name || name.length < 2 || !message || message.length < 5 || !emailParsed.success) {
      return apiJson({ error: "invalid", requestId }, { status: 400, requestId });
    }
    const email = emailParsed.data;

    const supabase = createServiceClient();
    const { error } = await supabase.from("contact_messages").insert({
      name,
      company: company || null,
      email,
      message,
      status: "new",
    });

    if (error) {
      log.error("[contact] db insert", { message: error.message });
      return apiJson({ error: "db", requestId }, { status: 500, requestId });
    }

    log.info("[contact] ok");
    return apiJson({ ok: true, requestId }, { requestId });
  } catch (e) {
    log.error("[contact] server", {
      err: e instanceof Error ? e.message : "unknown",
    });
    return apiJson({ error: "server", requestId }, { status: 500, requestId });
  }
}
