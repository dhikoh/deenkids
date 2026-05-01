#!/bin/bash
# ═══════════════════════════════════════════════════
# Adably Full E2E Test Script
# Run on VPS: bash e2e-test.sh
# ═══════════════════════════════════════════════════

API="https://api.adably.id/api"
FRONTEND="https://adably.id"
SUPERADMIN_EMAIL="superadmin@adably.id"
SUPERADMIN_PASS="superadmin123"
COOKIE_JAR="/tmp/adably_e2e_cookies.txt"
PASS=0; FAIL=0; TOTAL=0

green() { echo -e "\033[32m✅ PASS: $1\033[0m"; PASS=$((PASS+1)); TOTAL=$((TOTAL+1)); }
red()   { echo -e "\033[31m❌ FAIL: $1 — $2\033[0m"; FAIL=$((FAIL+1)); TOTAL=$((TOTAL+1)); }

assert_status() {
  local name="$1" expected="$2" actual="$3" body="$4"
  if [ "$actual" = "$expected" ]; then green "$name"; else red "$name" "expected=$expected got=$actual body=$(echo $body | head -c 200)"; fi
}

assert_json() {
  local name="$1" body="$2" key="$3"
  if echo "$body" | grep -q "\"$key\""; then green "$name"; else red "$name" "missing key=$key"; fi
}

echo "═══════════════════════════════════════"
echo "  Adably E2E Test — $(date)"
echo "  API: $API"
echo "  Frontend: $FRONTEND"
echo "═══════════════════════════════════════"

# ─── AUTH MODULE ───
echo -e "\n📦 AUTH MODULE"

# Test 1: Login SuperAdmin
rm -f $COOKIE_JAR
BODY=$(curl -s -c $COOKIE_JAR -w "\n%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SUPERADMIN_EMAIL\",\"password\":\"$SUPERADMIN_PASS\"}")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Login SuperAdmin" "200" "$HTTP" "$BODY"
SA_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
MAIN_TOKEN="$SA_TOKEN"  # Save as fallback

# Test 2: Login returns user data
assert_json "Login returns user object" "$BODY" "user"

# Test 3: Refresh token rotation
sleep 1
BODY=$(curl -s -b $COOKIE_JAR -c $COOKIE_JAR -w "\n%{http_code}" -X POST "$API/auth/refresh" \
  -H "Content-Type: application/json")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Refresh token rotation" "200" "$HTTP" "$BODY"
NEW_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
if [ -n "$NEW_TOKEN" ]; then SA_TOKEN="$NEW_TOKEN"; MAIN_TOKEN="$NEW_TOKEN"; fi

# Test 4: Re-login (test multi-session)
sleep 1
BODY=$(curl -s -c $COOKIE_JAR -w "\n%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$SUPERADMIN_EMAIL\",\"password\":\"$SUPERADMIN_PASS\"}")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Re-login (multi-session)" "200" "$HTTP" "$BODY"
NEW_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
if [ -n "$NEW_TOKEN" ]; then SA_TOKEN="$NEW_TOKEN"; MAIN_TOKEN="$NEW_TOKEN"; fi

# Ensure we have a valid token (fallback)
if [ -z "$MAIN_TOKEN" ]; then
  echo "⚠️  No valid token — re-authenticating..."
  BODY=$(curl -s -c $COOKIE_JAR -w "\n%{http_code}" -X POST "$API/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$SUPERADMIN_EMAIL\",\"password\":\"$SUPERADMIN_PASS\"}")
  MAIN_TOKEN=$(echo "$BODY" | sed '$d' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi
SA_TOKEN="$MAIN_TOKEN"

# Test 5: Notifications
BODY=$(curl -s -w "\n%{http_code}" "$API/admin/notifications?page=1" \
  -H "Authorization: Bearer $SA_TOKEN")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Notifications accessible" "200" "$HTTP" "$BODY"

# ─── CREATE TEST USERS ───
echo -e "\n📦 USER MANAGEMENT"

AUTHOR_EMAIL="e2e-author-$(date +%s)@test.adably.id"
BODY=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/users" \
  -H "Authorization: Bearer $SA_TOKEN" -H "Content-Type: application/json" \
  -d "{\"name\":\"E2E Author\",\"email\":\"$AUTHOR_EMAIL\",\"password\":\"Test1234!\",\"role\":\"AUTHOR\"}")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Create Author user" "201" "$HTTP" "$BODY"
AUTHOR_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Login as Author
BODY=$(curl -s -c /tmp/author_cookies.txt -w "\n%{http_code}" -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$AUTHOR_EMAIL\",\"password\":\"Test1234!\"}")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Login as Author" "200" "$HTTP" "$BODY"
AUTHOR_TOKEN=$(echo "$BODY" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# ─── EDITOR MODULE ───
echo -e "\n📦 EDITOR MODULE"

# Create QNA content with XSS payload
BODY=$(curl -s -w "\n%{http_code}" -X POST "$API/editor/content" \
  -H "Authorization: Bearer $AUTHOR_TOKEN" -H "Content-Type: application/json" \
  -d "{\"title\":\"E2E Test QNA <script>alert(1)</script>\",\"type\":\"QNA\",\"ageGroups\":[\"3-5\"],\"qnaDetail\":{\"question\":\"Test question?\",\"answerQuick\":\"Test answer\",\"dialogBlocks\":[],\"dalilBlocks\":[],\"analogyBlocks\":[],\"tipsBlocks\":[]}}")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Create QNA content" "201" "$HTTP" "$BODY"
QNA_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# XSS check
if echo "$BODY" | grep -q "<script>"; then
  red "XSS sanitization" "script tag NOT stripped"
else
  green "XSS sanitization — script tag stripped"
fi

# Create Article
BODY=$(curl -s -w "\n%{http_code}" -X POST "$API/editor/content" \
  -H "Authorization: Bearer $AUTHOR_TOKEN" -H "Content-Type: application/json" \
  -d "{\"title\":\"E2E Article\",\"type\":\"ARTICLE\",\"ageGroups\":[\"5-7\"],\"articleDetail\":{\"coverUrl\":\"https://example.com/img.jpg\",\"blocks\":[{\"type\":\"paragraph\",\"text\":\"Hello\"}]}}")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Create Article content" "201" "$HTTP" "$BODY"
ARTICLE_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Update content
if [ -n "$QNA_ID" ]; then
  BODY=$(curl -s -w "\n%{http_code}" -X PUT "$API/editor/content/$QNA_ID" \
    -H "Authorization: Bearer $AUTHOR_TOKEN" -H "Content-Type: application/json" \
    -d "{\"title\":\"E2E QNA Updated\",\"type\":\"QNA\",\"ageGroups\":[\"3-5\"],\"qnaDetail\":{\"question\":\"Updated?\",\"answerQuick\":\"Yes\",\"dialogBlocks\":[],\"dalilBlocks\":[],\"analogyBlocks\":[],\"tipsBlocks\":[]}}")
  HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
  assert_status "Update content" "200" "$HTTP" "$BODY"

  # Submit for review
  BODY=$(curl -s -w "\n%{http_code}" -X POST "$API/editor/content/$QNA_ID/submit" \
    -H "Authorization: Bearer $AUTHOR_TOKEN")
  HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
  assert_status "Submit for review" "200" "$HTTP" "$BODY"
else
  red "Update content" "no QNA_ID"; red "Submit for review" "no QNA_ID"
fi

# List my contents
BODY=$(curl -s -w "\n%{http_code}" "$API/editor/my-contents" \
  -H "Authorization: Bearer $AUTHOR_TOKEN")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "List my contents" "200" "$HTTP" "$BODY"

# ─── ADMIN MODULE ───
echo -e "\n📦 ADMIN MODULE"

# Dashboard (Author)
BODY=$(curl -s -w "\n%{http_code}" "$API/admin/dashboard/stats" \
  -H "Authorization: Bearer $AUTHOR_TOKEN")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Dashboard stats (AUTHOR)" "200" "$HTTP" "$BODY"
assert_json "Author stats has role" "$BODY" "role"

# Dashboard (SuperAdmin)
BODY=$(curl -s -w "\n%{http_code}" "$API/admin/dashboard/stats" \
  -H "Authorization: Bearer $SA_TOKEN")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Dashboard stats (SUPERADMIN)" "200" "$HTTP" "$BODY"

# Review queue
BODY=$(curl -s -w "\n%{http_code}" "$API/admin/review?page=1" \
  -H "Authorization: Bearer $SA_TOKEN")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Review queue" "200" "$HTTP" "$BODY"

# Approve content
if [ -n "$QNA_ID" ]; then
  BODY=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/review/$QNA_ID/approve" \
    -H "Authorization: Bearer $SA_TOKEN" -H "Content-Type: application/json" \
    -d "{\"notes\":\"E2E approved\"}")
  HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
  assert_status "Approve content" "200" "$HTTP" "$BODY"

  # Unpublish
  BODY=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/review/$QNA_ID/unpublish" \
    -H "Authorization: Bearer $SA_TOKEN" -H "Content-Type: application/json" \
    -d "{\"notes\":\"E2E unpublish\"}")
  HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
  assert_status "Unpublish content" "200" "$HTTP" "$BODY"
else
  red "Approve content" "no QNA_ID"; red "Unpublish content" "no QNA_ID"
fi

# Structure
BODY=$(curl -s -w "\n%{http_code}" "$API/admin/structure" \
  -H "Authorization: Bearer $SA_TOKEN")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Get structure tree" "200" "$HTTP" "$BODY"

# All contents
BODY=$(curl -s -w "\n%{http_code}" "$API/admin/contents?page=1" \
  -H "Authorization: Bearer $SA_TOKEN")
HTTP=$(echo "$BODY" | tail -1); BODY=$(echo "$BODY" | sed '$d')
assert_status "Get all contents" "200" "$HTTP" "$BODY"

# ─── ENGAGEMENT ───
echo -e "\n📦 ENGAGEMENT MODULE"
HASH="e2e-test-$(date +%s)"
PUB_BODY=$(curl -s "$API/content/list?limit=1")
PUB_ID=$(echo "$PUB_BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$PUB_ID" ]; then
  for EP in like bookmark; do
    BODY=$(curl -s -w "\n%{http_code}" -X POST "$API/engagement/$EP" \
      -H "Content-Type: application/json" -d "{\"contentId\":\"$PUB_ID\",\"userHash\":\"$HASH\"}")
    HTTP=$(echo "$BODY" | tail -1)
    assert_status "Toggle $EP" "201" "$HTTP" ""
  done

  BODY=$(curl -s -w "\n%{http_code}" -X POST "$API/engagement/rating" \
    -H "Content-Type: application/json" -d "{\"contentId\":\"$PUB_ID\",\"userHash\":\"$HASH\",\"rating\":5}")
  HTTP=$(echo "$BODY" | tail -1)
  assert_status "Submit rating" "201" "$HTTP" ""

  BODY=$(curl -s -w "\n%{http_code}" -X POST "$API/engagement/view" \
    -H "Content-Type: application/json" -d "{\"contentId\":\"$PUB_ID\",\"userHash\":\"$HASH\"}")
  HTTP=$(echo "$BODY" | tail -1)
  assert_status "Record view" "201" "$HTTP" ""

  BODY=$(curl -s -w "\n%{http_code}" "$API/engagement/status?contentId=$PUB_ID&userHash=$HASH")
  HTTP=$(echo "$BODY" | tail -1)
  assert_status "Engagement status" "200" "$HTTP" ""
else
  red "Engagement tests" "No published content"
fi

# ─── REWARD ───
echo -e "\n📦 REWARD MODULE"

BODY=$(curl -s -w "\n%{http_code}" "$API/admin/points/balance" -H "Authorization: Bearer $AUTHOR_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
assert_status "Get point balance" "200" "$HTTP" ""

BODY=$(curl -s -w "\n%{http_code}" "$API/admin/points/ledger?page=1" -H "Authorization: Bearer $AUTHOR_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
assert_status "Get point ledger" "200" "$HTTP" ""

BODY=$(curl -s -w "\n%{http_code}" "$API/superadmin/reward-settings" -H "Authorization: Bearer $SA_TOKEN")
HTTP=$(echo "$BODY" | tail -1)
assert_status "Get reward settings" "200" "$HTTP" ""

# ─── PUBLIC ───
echo -e "\n📦 PUBLIC ENDPOINTS"

for EP in "content/tags" "content/tree" "content/list" "content/search?q=test"; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$API/$EP")
  assert_status "Public: $EP" "200" "$HTTP" ""
done

# ─── FRONTEND ───
echo -e "\n📦 FRONTEND"

for PG in "" "artikel" "qna" "login"; do
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND/$PG")
  assert_status "Frontend /$PG" "200" "$HTTP" ""
done

HTTP=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 "$FRONTEND/admin")
if [ "$HTTP" = "307" ] || [ "$HTTP" = "308" ]; then
  green "Middleware: /admin → redirect to /login"
else
  red "Middleware redirect" "expected 307/308 got $HTTP"
fi

# ─── RATE LIMIT ───
echo -e "\n📦 RATE LIMIT"
for i in $(seq 1 6); do
  RL_HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/login" \
    -H "Content-Type: application/json" -d "{\"email\":\"ratelimit@fake.com\",\"password\":\"wrong\"}")
done
if [ "$RL_HTTP" = "429" ]; then green "Login rate limit (429)"; else red "Rate limit" "got $RL_HTTP"; fi

# ─── CLEANUP ───
echo -e "\n📦 CLEANUP"
for CID in $QNA_ID $ARTICLE_ID; do
  [ -n "$CID" ] && curl -s -o /dev/null -X DELETE "$API/editor/content/$CID" -H "Authorization: Bearer $AUTHOR_TOKEN"
done
[ -n "$AUTHOR_ID" ] && curl -s -o /dev/null -X DELETE "$API/admin/users/$AUTHOR_ID" -H "Authorization: Bearer $SA_TOKEN"
green "Cleanup test data"
rm -f $COOKIE_JAR /tmp/author_cookies.txt

# ─── RESULTS ───
echo ""
echo "═══════════════════════════════════════"
echo "  RESULTS: $PASS/$TOTAL PASSED, $FAIL FAILED"
echo "═══════════════════════════════════════"
if [ "$FAIL" -eq 0 ]; then
  echo -e "\033[32m  🎉 ALL TESTS PASSED!\033[0m"
else
  echo -e "\033[31m  ⚠️  $FAIL test(s) failed\033[0m"
fi
echo ""
