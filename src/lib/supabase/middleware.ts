import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function nextWithOptionalHeaders(
  request: NextRequest,
  requestHeaders?: Headers,
) {
  return requestHeaders
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : NextResponse.next({ request });
}

export async function updateSession(
  request: NextRequest,
  requestHeaders?: Headers,
) {
  let supabaseResponse = nextWithOptionalHeaders(request, requestHeaders);

  const hasAuthCookie = request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.includes("auth-token") ||
        c.name.startsWith("sb-") ||
        c.name.includes("supabase"),
    );
  if (!hasAuthCookie) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = nextWithOptionalHeaders(request, requestHeaders);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return supabaseResponse;
}
