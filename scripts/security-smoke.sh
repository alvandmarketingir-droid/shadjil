#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://shadjil.ir}"
echo "== Security smoke against $BASE_URL =="

echo "-- health"
curl -sf "$BASE_URL/api/health" | head -c 500
echo ""

echo "-- contact rate limit (expect eventual 429)"
HIT_429=0
for i in $(seq 1 12); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/api/contact" \
    -H "Content-Type: application/json" \
    -d '{"name":"sec-test","email":"sec@test.local","message":"security smoke"}' || true)
  echo "  attempt $i -> $CODE"
  if [ "$CODE" = "429" ]; then
    HIT_429=1
    break
  fi
  sleep 0.3
done

if [ "$HIT_429" != "1" ]; then
  echo "WARN: did not observe 429 on contact. Continuing."
else
  echo "OK: contact rate limit returned 429"
fi

echo "-- security headers sample (homepage)"
HEADERS=$(curl -sI "$BASE_URL/" || true)
echo "$HEADERS" | grep -iE 'strict-transport|x-frame|content-security|x-content-type' || true

echo "== security smoke done =="
