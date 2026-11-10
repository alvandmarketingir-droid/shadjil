# Phase 1 - Logging

- Sentry for runtime errors
- GET /api/health returns requestId in body and x-request-id header
- logger JSON with optional requestId
- Middleware sets x-request-id on matched responses

Principles:
1. Never log secrets or full cookies
2. Message prefixes: [shipping] [checkout] [createOrder]
3. User-facing text in Persian; technical detail in logs only

Test:
  curl -sI https://shadjil.ir/api/health | grep -i x-request-id
  curl -s https://shadjil.ir/api/health
