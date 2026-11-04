import type { createServiceClient } from "@/lib/supabase/service";

type Admin = ReturnType<typeof createServiceClient>;

const MAX_PAGES = 20;
const PER_PAGE = 200;

/**
 * Paginated Auth admin user scan for phone / email identities.
 * Avoids the old page-1-only (200 user) blind spot.
 */
export async function findAuthUserByPhoneOrEmails(
  admin: Admin,
  opts: {
    emails: string[];
    phoneE164: string;
    phoneAlt?: string;
  },
): Promise<{ id: string; email: string } | null> {
  const emailSet = new Set(
    opts.emails.map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
  const phones = new Set(
    [opts.phoneE164, opts.phoneAlt].filter(Boolean) as string[],
  );

  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data: listed, error } = await admin.auth.admin.listUsers({
      page,
      perPage: PER_PAGE,
    });
    if (error) {
      console.warn("[findAuthUserByPhoneOrEmails]", page, error.message);
      return null;
    }
    const users = listed?.users ?? [];
    if (!users.length) return null;

    const hit = users.find((u) => {
      const em = (u.email || "").toLowerCase();
      if (em && emailSet.has(em)) return true;
      const ph = u.phone || "";
      return ph && phones.has(ph);
    });
    if (hit?.id) {
      return { id: hit.id, email: hit.email || opts.emails[0] || "" };
    }
    if (users.length < PER_PAGE) return null;
  }
  return null;
}
