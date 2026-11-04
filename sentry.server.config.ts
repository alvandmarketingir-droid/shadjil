import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0.1,
  enabled: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request?.headers) {
      const h = { ...event.request.headers };
      for (const key of Object.keys(h)) {
        const lk = key.toLowerCase();
        if (
          lk === "authorization" ||
          lk === "cookie" ||
          lk === "set-cookie" ||
          lk === "x-supabase-auth"
        ) {
          delete h[key];
        }
      }
      event.request.headers = h;
    }
    if (event.request) {
      delete event.request.cookies;
    }
    return event;
  },
});
