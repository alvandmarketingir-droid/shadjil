import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HealthBody = {
  ok?: boolean;
  latencyMs?: number;
  region?: string;
  checks?: Record<string, string>;
  ts?: string;
};

export default async function StatusPage() {
  const startedAt = Date.now();
  let health: HealthBody | null = null;
  let fetchOk = false;
  let errorMsg: string | null = null;

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host") || "shadjil.ir";
    const proto = h.get("x-forwarded-proto") || "https";
    const base = `${proto}://${host}`;
    const res = await fetch(`${base}/api/health`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    fetchOk = res.ok;
    health = (await res.json()) as HealthBody;
    if (!res.ok) errorMsg = `health status ${res.status}`;
  } catch (e: unknown) {
    errorMsg = e instanceof Error ? e.message : "خطای ناشناخته";
  }

  const totalMs = Date.now() - startedAt;
  const overallOk = Boolean(fetchOk && health?.ok);
  const checks = health?.checks ?? {};

  const rows: { label: string; value: string; ok?: boolean }[] = [
    { label: "سایت", value: "آنلاین", ok: true },
    {
      label: "API سلامت",
      value: fetchOk ? "پاسخ‌گو" : "خطا",
      ok: fetchOk,
    },
    {
      label: "دیتابیس (Supabase)",
      value: checks.supabase === "ok" ? "سالم" : checks.supabase || "نامشخص",
      ok: checks.supabase === "ok" || checks.supabase === "skip",
    },
    {
      label: "Rate limit",
      value: checks.rateLimit || "نامشخص",
      ok: true,
    },
    {
      label: "R2 ذخیره‌سازی",
      value: checks.r2 === "ok" ? "پیکربندی شده" : checks.r2 || "نامشخص",
      ok: checks.r2 === "ok",
    },
    {
      label: "Cron",
      value: checks.cronBackup === "ok" ? "پیکربندی شده" : checks.cronBackup || "نامشخص",
      ok: checks.cronBackup === "ok",
    },
    {
      label: "منطقه",
      value: health?.region || "unknown",
      ok: true,
    },
    {
      label: "زمان پاسخ health",
      value: `${health?.latencyMs ?? "—"}ms`,
      ok: true,
    },
    {
      label: "زمان پاسخ کل صفحه",
      value: `${totalMs}ms`,
      ok: true,
    },
  ];

  return (
    <div className="bg-background flex min-h-screen items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">وضعیت سیستم</h1>
          <p className="text-muted-foreground mt-1 text-sm">shadjil.ir</p>
        </div>

        <div
          className={`rounded-2xl border p-6 text-center ${
            overallOk
              ? "border-green-500/40 bg-green-500/10"
              : "border-red-500/40 bg-red-500/10"
          }`}
        >
          <div
            className={`inline-flex h-4 w-4 rounded-full ${
              overallOk ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <p className="mt-3 text-xl font-semibold">
            {overallOk ? "همه چیز عادی است" : "مشکل در سرویس‌ها"}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            آخرین بررسی:{" "}
            {health?.ts
              ? new Date(health.ts).toLocaleString("fa-IR")
              : new Date().toLocaleString("fa-IR")}
          </p>
        </div>

        <div className="bg-card divide-y rounded-2xl border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm">{r.label}</span>
              <span
                className={`text-sm font-medium ${
                  r.ok === false ? "text-red-600" : "text-green-700"
                }`}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>

        {errorMsg ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-xs break-all text-red-700">
            {errorMsg}
          </div>
        ) : null}

        <p className="text-muted-foreground text-center text-xs">
          مانیتورینگ:{" "}
          <a className="underline" href="/api/health">
            /api/health
          </a>{" "}
          · این صفحه عمومی است و رمز نیاز ندارد.
        </p>
      </div>
    </div>
  );
}
