"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import { requestLoginOtp, verifyLoginOtp } from "@/lib/otp/service";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import {
  getLoginLockStatus,
  recordLoginFailure,
  clearLoginFailures,
} from "@/lib/security/login-lockout";
import { headers } from "next/headers";
import {
  normalizeIranMobile,
  phoneLookupVariants,
  otpPhoneEmail,
} from "@/lib/numbers";
import { recordUserSession } from "@/lib/security/sessions";

async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

function otpEmail(phone: string) {
  return otpPhoneEmail(phone);
}

async function findAuthEmailByPhone(phone09: string): Promise<string | null> {
  const admin = createServiceClient();
  const variants = phoneLookupVariants(phone09);
  if (!variants.length) return null;

  // 1) پروفایل با هر فرمت رایج
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, phone")
    .in("phone", variants)
    .limit(5);

  for (const row of profiles ?? []) {
    const uid = (row as { id?: string }).id;
    if (!uid) continue;
    const { data, error } = await admin.auth.admin.getUserById(uid);
    if (!error && data?.user?.email) return data.user.email;
  }

  // 2) Auth user با phone — هم +98… و هم 98… (فرمت ذخیره‌شده در داشبورد)
  const phoneCandidates = [`+98${phone09.slice(1)}`, `98${phone09.slice(1)}`, phone09];
  for (const phoneQ of phoneCandidates) {
    try {
      const url = new URL(
        process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/admin/users",
      );
      url.searchParams.set("phone", phoneQ);
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const body = (await res.json()) as {
        users?: { email?: string; phone?: string }[];
        email?: string;
      };
      const users = body.users ?? (body.email ? [body as { email?: string }] : []);
      const hit = users.find((u) => u.email);
      if (hit?.email) return hit.email;
    } catch (e) {
      console.warn("[resolveAuthEmail phone lookup]", phoneQ, e);
    }
  }

  // 3) ایمیل سنتتیک مسیر OTP (همان identity ایمیل در Auth)
  return otpEmail(phone09);
}

async function authEmailExists(email: string): Promise<boolean | null> {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/admin/users");
    url.searchParams.set("email", email);
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { users?: unknown[]; id?: string };
    if (Array.isArray(body.users)) return body.users.length > 0;
    return Boolean(body.id);
  } catch {
    return null;
  }
}

/** همه ایمیل‌های محتمل برای یک شناسه ورود (ایمیل یا موبایل) */
async function resolveAuthEmailCandidates(loginId: string): Promise<string[]> {
  const raw = (loginId || "").trim();
  if (!raw) return [];
  if (raw.includes("@")) return [raw.toLowerCase()];

  const phone = normalizeIranMobile(raw);
  if (!phone) return [];

  const out: string[] = [];
  const push = (e: string | null | undefined) => {
    const v = (e || "").trim().toLowerCase();
    if (v && v.includes("@") && !out.includes(v)) out.push(v);
  };

  try {
    push(await findAuthEmailByPhone(phone));
  } catch (e) {
    console.warn("[resolveAuthEmailCandidates]", e);
  }
  // همیشه ایمیل سنتتیک OTP را هم امتحان کن (ممکن است پروفایل به ایمیل دیگری اشاره کند)
  push(otpEmail(phone));
  return out;
}

async function resolveAuthEmail(loginId: string): Promise<string | null> {
  const list = await resolveAuthEmailCandidates(loginId);
  return list[0] ?? null;
}

export async function signInAction(loginId: string, password: string) {
  const ip = await getClientIp();
  const rl = await checkRateLimit({ identifier: ip, type: "auth" });
  if (!rl.success) {
    logger.warn("[auth] rate limited", { ip });
    return { ok: false as const, error: "تعداد تلاش بیش از حد مجاز. کمی بعد دوباره تلاش کنید." };
  }
  const candidates = await resolveAuthEmailCandidates(loginId);
  if (!candidates.length) {
    return { ok: false as const, error: "شناسه ورود نامعتبر است" };
  }

  // قفل روی اولین کاندید (موبایل/ایمیل اصلی)
  const lockKey = candidates[0].toLowerCase() + "|" + ip;
  const lock = await getLoginLockStatus(lockKey);
  if (lock.locked) {
    const sec = lock.retryAfterSec ?? 900;
    const min = Math.max(1, Math.ceil(sec / 60));
    return {
      ok: false as const,
      error: "به دلیل تلاش‌های ناموفق، ورود تا حدود " + min + " دقیقه قفل است.",
    };
  }

  const supabase = await createClient();
  let lastError: string | null = null;
  let anyExists: boolean | null = null;

  for (const email of candidates) {
    const exists = await authEmailExists(email);
    if (exists === false) {
      if (anyExists !== true) anyExists = false;
      continue;
    }
    if (exists === true) anyExists = true;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      await clearLoginFailures(lockKey);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let role = "customer";
      if (user?.id) {
        let ua: string | null = null;
        try {
          const h = await headers();
          ua = h.get("user-agent");
        } catch {}
        await recordUserSession({
          userId: user.id,
          userAgent: ua,
          ipAddress: ip,
        });
        try {
          const admin = createServiceClient();
          const { data: prof } = await admin
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();
          if (prof && (prof as { role?: string }).role) {
            role = String((prof as { role: string }).role);
          }
        } catch (e) {
          console.warn("[signIn role]", e);
        }
      }
      logger.info("[auth] sign-in ok", { via: email.includes("@phone.") ? "synthetic" : "email" });
      return { ok: true as const, role };
    }
    lastError = error.message;
  }

  if (anyExists === false) {
    logger.warn("[auth] no auth user for candidates", {
      phoneLogin: !String(loginId).includes("@"),
      n: candidates.length,
    });
    return {
      ok: false as const,
      error:
        "حسابی با این موبایل/ایمیل یافت نشد. ابتدا ثبت‌نام کنید یا با OTP وارد شوید.",
      code: "user_not_found" as const,
    };
  }

  const fail = await recordLoginFailure(lockKey);
  if (fail.locked) {
    const min = Math.max(1, Math.ceil((fail.retryAfterSec ?? 900) / 60));
    return {
      ok: false as const,
      error: "ورود موقتاً قفل شد. حدود " + min + " دقیقه دیگر تلاش کنید.",
    };
  }
  logger.warn("[auth] bad credentials", {
    phoneLogin: !String(loginId).includes("@"),
    msg: lastError,
    tried: candidates.length,
  });
  return {
    ok: false as const,
    error:
      "رمز عبور نادرست است یا برای این حساب رمز تنظیم نشده. از «ورود با OTP» استفاده کنید یا در Supabase Auth برای همان کاربر OTP رمز را مستقیم Set کنید.",
    code: "bad_password" as const,
  };
}

export async function signUpAction(
  email: string,
  password: string,
  fullName?: string,
) {
  const ip = await getClientIp();
  const rl = await checkRateLimit({ identifier: ip, type: "auth" });
  if (!rl.success) {
    return { ok: false as const, error: "تعداد تلاش بیش از حد مجاز. کمی بعد دوباره تلاش کنید." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName ?? "" } },
  });
  if (error) return { ok: false as const, error: error.message };
  const userId = data.user?.id;
  if (userId) {
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: fullName ?? null,
    } as never);
    if (profileError) console.error("[signUp profile]", profileError);
  }
  return { ok: true as const };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function resetPasswordAction(emailOrPhone: string) {
  const email = await resolveAuthEmail(emailOrPhone);
  if (!email) return { ok: false as const, error: "شناسه نامعتبر" };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/ورود`,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function requestOtpAction(phone: string) {
  return requestLoginOtp(phone);
}

function isValidOptionalEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findAuthUserIdByEmails(
  admin: ReturnType<typeof createServiceClient>,
  emails: string[],
): Promise<{ id: string; email: string } | null> {
  for (const email of emails) {
    try {
      const url = new URL(
        process.env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/admin/users",
      );
      url.searchParams.set("email", email);
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
        },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const body = (await res.json()) as {
        users?: { id?: string; email?: string }[];
        id?: string;
        email?: string;
      };
      if (body.id && body.email) return { id: body.id, email: body.email };
      const hit = (body.users ?? []).find((u) => u.id && u.email);
      if (hit?.id && hit.email) return { id: hit.id, email: hit.email };
    } catch (e) {
      console.warn("[findAuthUserIdByEmails]", email, e);
    }
  }
  return null;
}

/**
 * OTP تأیید شد → کاربر Auth را پیدا/بساز و در صورت ارسال، رمز (+ایمیل اختیاری) را
 * حتماً روی همان کاربر بنویس. باگ قبلی: اگر createUser به «کاربر موجود» می‌خورد،
 * رمز هرگز update نمی‌شد.
 */
export async function verifyOtpAction(
  phone: string,
  code: string,
  opts?: { password?: string; fullName?: string; email?: string },
) {
  const verified = await verifyLoginOtp(phone, code);
  if (!verified.ok) return verified;

  const normalized = verified.phone;
  const syntheticEmail = otpEmail(normalized);
  const admin = createServiceClient();
  const password =
    typeof opts?.password === "string" && opts.password.length >= 8
      ? opts.password
      : undefined;
  const fullName = (opts?.fullName || "").trim() || undefined;
  const contactEmailRaw = (opts?.email || "").trim().toLowerCase();
  const contactEmail =
    contactEmailRaw && isValidOptionalEmail(contactEmailRaw)
      ? contactEmailRaw
      : undefined;

  const variants = phoneLookupVariants(normalized);
  const { data: profileRows } = await admin
    .from("profiles")
    .select("id, role, phone")
    .in("phone", variants)
    .limit(5);
  const profile = (profileRows ?? [])[0] ?? null;

  let userId = (profile as { id?: string } | null)?.id as string | undefined;
  let role = String((profile as { role?: string } | null)?.role || "customer");
  // ترجیح: ایمیل واقعی کاربر برای login با جیمیل؛ وگرنه سنتتیک OTP
  let authEmail = contactEmail || syntheticEmail;

  if (!userId) {
    const byEmail = await findAuthUserIdByEmails(
      admin,
      [contactEmail, syntheticEmail].filter(Boolean) as string[],
    );
    if (byEmail) {
      userId = byEmail.id;
      authEmail = byEmail.email;
    }
  }

  if (!userId) {
    const createPayload: Parameters<typeof admin.auth.admin.createUser>[0] = {
      email: authEmail,
      email_confirm: true,
      user_metadata: {
        phone: normalized,
        full_name: fullName,
        ...(contactEmail ? { contact_email: contactEmail } : {}),
      },
      phone: `+98${normalized.slice(1)}`,
      phone_confirm: true,
    };
    if (password) createPayload.password = password;
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser(createPayload);
    if (createErr) {
      console.warn("[otp createUser]", createErr.message);
      const found = await findAuthUserIdByEmails(admin, [
        authEmail,
        syntheticEmail,
        contactEmail || "",
      ].filter(Boolean));
      if (found) {
        userId = found.id;
        authEmail = found.email;
      } else {
        try {
          const { data: listed } = await admin.auth.admin.listUsers({
            page: 1,
            perPage: 200,
          });
          const hit = listed?.users?.find(
            (u) =>
              u.email === syntheticEmail ||
              u.email === authEmail ||
              (contactEmail && u.email === contactEmail) ||
              u.phone === `+98${normalized.slice(1)}` ||
              u.phone === `98${normalized.slice(1)}`,
          );
          userId = hit?.id;
          if (hit?.email) authEmail = hit.email;
        } catch (e) {
          console.warn("[otp listUsers]", e);
        }
      }
    } else {
      userId = created.user?.id;
      if (created.user?.email) authEmail = created.user.email;
    }
  }

  if (!userId) {
    console.error("[otp] no userId");
    return { ok: false as const, error: "server" as const };
  }

  // همیشه بعد از داشتن userId: رمز / ایمیل / تلفن را روی Auth بنویس
  // (هم کاربر تازه‌ساخته، هم کاربر موجود پس از createUser conflict)
  let passwordSaved = false;
  try {
    const { data: u } = await admin.auth.admin.getUserById(userId);
    if (u?.user?.email) authEmail = u.user.email;

    const patch: Parameters<typeof admin.auth.admin.updateUserById>[1] = {
      email_confirm: true,
      user_metadata: {
        ...(u?.user?.user_metadata || {}),
        phone: normalized,
        ...(fullName ? { full_name: fullName } : {}),
        ...(contactEmail ? { contact_email: contactEmail } : {}),
      },
      phone: `+98${normalized.slice(1)}`,
      phone_confirm: true,
    };
    if (password) {
      patch.password = password;
    }
    // اگر ایمیل واقعی داده شده و با ایمیل فعلی فرق دارد، ارتقا بده (login با جیمیل)
    if (contactEmail && authEmail !== contactEmail) {
      patch.email = contactEmail;
      patch.email_confirm = true;
      authEmail = contactEmail;
    }

    const { error: updErr } = await admin.auth.admin.updateUserById(
      userId,
      patch,
    );
    if (updErr) {
      console.error("[otp updateUserById]", updErr);
      // اگر تغییر ایمیل conflict داد، حداقل رمز را جدا ست کن
      if (password) {
        const { error: pwOnly } = await admin.auth.admin.updateUserById(
          userId,
          { password },
        );
        if (pwOnly) {
          console.error("[otp setPassword only]", pwOnly);
          return { ok: false as const, error: "server" as const };
        }
        passwordSaved = true;
      }
    } else if (password) {
      passwordSaved = true;
    }

    // تأیید ثانویه: خواندن دوباره ایمیل
    const { data: again } = await admin.auth.admin.getUserById(userId);
    if (again?.user?.email) authEmail = again.user.email;

    // اگر رمز خواسته شده ولی ذخیره نشد → شکست صریح (نه OTP موفقِ بدون رمز)
    if (password && !passwordSaved) {
      console.error("[otp] password required but not saved", { userId });
      return { ok: false as const, error: "server" as const };
    }
  } catch (e) {
    console.warn("[otp touch user]", e);
    if (password) {
      return { ok: false as const, error: "server" as const };
    }
  }

  await admin.from("profiles").upsert({
    id: userId,
    phone: normalized,
    full_name: fullName ?? null,
    role: role === "admin" ? "admin" : "customer",
  } as never);

  try {
    const ip = await getClientIp();
    let ua: string | null = null;
    try {
      const h = await headers();
      ua = h.get("user-agent");
    } catch {}
    await recordUserSession({ userId, userAgent: ua, ipAddress: ip });
  } catch (e) {
    console.warn("[otp recordUserSession]", e);
  }

  try {
    const { data: prof2 } = await admin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (prof2 && (prof2 as { role?: string }).role) {
      role = String((prof2 as { role: string }).role);
    }
  } catch {}

  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: authEmail,
    });
  if (linkErr || !linkData?.properties?.hashed_token) {
    console.error("[otp generateLink]", linkErr);
    return { ok: false as const, error: "server" as const };
  }

  return {
    ok: true as const,
    role,
    email: authEmail,
    token_hash: linkData.properties.hashed_token as string,
    password_saved: passwordSaved,
  };
}

export async function changeMyPasswordAction(
  currentPassword: string,
  newPassword: string,
) {
  const cur = (currentPassword || "").trim();
  const next = (newPassword || "").trim();
  if (next.length < 8) {
    return { ok: false as const, error: "weak" as const };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false as const, error: "login_required" as const };
  }

  // کاربران OTP اغلب رمز قبلی ندارند — با نشست فعال می‌توانند اولین رمز را ست کنند
  if (cur) {
    const { error: checkErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: cur,
    });
    if (checkErr) {
      return { ok: false as const, error: "bad_current" as const };
    }
  }

  const { error: updErr } = await supabase.auth.updateUser({ password: next });
  if (updErr) {
    console.error("[changeMyPassword]", updErr);
    return { ok: false as const, error: "server" as const };
  }
  return { ok: true as const, firstSet: !cur };
}

export async function resendEmailVerificationAction() {
  const ip = await getClientIp();
  const rl = await checkRateLimit({ identifier: ip + ":verify", type: "auth" });
  if (!rl.success) {
    return { ok: false as const, error: "تعداد درخواست بیش از حد. کمی بعد تلاش کنید." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { ok: false as const, error: "login_required" as const };
  }
  if (user.email_confirmed_at) {
    return { ok: true as const, already: true as const };
  }
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
  });
  if (error) {
    console.error("[resendEmailVerification]", error);
    return { ok: false as const, error: "server" as const };
  }
  return { ok: true as const, already: false as const };
}

export async function listMySessionsAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "login_required" as const, items: [] };

  let { data, error } = await supabase
    .from("user_sessions")
    .select("id, session_label, user_agent, ip_address, created_at, last_seen_at, revoked_at")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(5);

  // اگر هنوز نشستی نیست، همین الان یکی ثبت کن (لاگین قبلی / OTP / کوکی)
  if (!error && (!data || data.length === 0)) {
    try {
      const ip = await getClientIp();
      let ua: string | null = null;
      try {
        const h = await headers();
        ua = h.get("user-agent");
      } catch {}
      await recordUserSession({ userId: user.id, userAgent: ua, ipAddress: ip });
      const again = await supabase
        .from("user_sessions")
        .select("id, session_label, user_agent, ip_address, created_at, last_seen_at, revoked_at")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(5);
      data = again.data;
      error = again.error;
    } catch (e) {
      console.warn("[listMySessions ensure]", e);
    }
  }

  if (error) {
    console.error("[listMySessions]", error);
    return { ok: false as const, error: "server" as const, items: [] };
  }
  return { ok: true as const, items: data ?? [] };
}

export async function revokeMySessionAction(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "login_required" as const };
  const { error } = await supabase
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id);
  if (error) {
    console.error("[revokeMySession]", error);
    return { ok: false as const, error: "server" as const };
  }
  return { ok: true as const };
}

export async function signOutOtherDevicesAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "login_required" as const };
  try {
    await supabase.auth.signOut({ scope: "others" } as { scope: "others" });
  } catch {
    /* ignore if unsupported */
  }
  const admin = createServiceClient();
  await admin
    .from("user_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("revoked_at", null);
  return { ok: true as const };
}
