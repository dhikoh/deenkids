#!/bin/bash
# Adably E2E Test — Part 1: Auth, Public, Editor, Admin, Engagement
API="https://api.adably.id/api"
FE="https://adably.id"
SA_EMAIL="superadmin@adably.id"
SA_PASS="superadmin123"
CJ="/tmp/e2e_sa.txt"; CJ2="/tmp/e2e_au.txt"
P=0; F=0; T=0
g(){ echo -e "\033[32m✅ $1\033[0m"; P=$((P+1)); T=$((T+1)); }
f(){ echo -e "\033[31m❌ $1 — $2\033[0m"; F=$((F+1)); T=$((T+1)); }
chk(){ if [ "$2" = "$3" ]; then g "$1"; else f "$1" "exp=$3 got=$2 $(echo $4|head -c 150)"; fi; }
chk2(){ local h="$2"; if [ "$h" = "$3" ] || [ "$h" = "$4" ]; then g "$1"; else f "$1" "exp=$3/$4 got=$h"; fi; }
has(){ if echo "$2"|grep -q "\"$3\""; then g "$1"; else f "$1" "key=$3 missing"; fi; }

echo "══════════════════════════════════════════"
echo " Adably E2E Part 1 — $(date)"
echo "══════════════════════════════════════════"

# ═══ HEALTH ═══
echo -e "\n📦 HEALTH"
B=$(curl -s -w "\n%{http_code}" "$API/health"); H=$(echo "$B"|tail -1); B=$(echo "$B"|sed '$d')
chk "GET /health" "$H" "200"; has "Health DB connected" "$B" "connected"

# ═══ AUTH ═══
echo -e "\n📦 AUTH"
rm -f $CJ $CJ2
B=$(curl -s -c $CJ -w "\n%{http_code}" -X POST "$API/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$SA_EMAIL\",\"password\":\"$SA_PASS\"}")
H=$(echo "$B"|tail -1); B=$(echo "$B"|sed '$d'); chk "Login SuperAdmin" "$H" "200"
SA=$(echo "$B"|grep -o '"accessToken":"[^"]*"'|cut -d'"' -f4); has "Login returns user" "$B" "user"

sleep 1
B=$(curl -s -b $CJ -c $CJ -w "\n%{http_code}" -X POST "$API/auth/refresh" -H "Content-Type: application/json")
H=$(echo "$B"|tail -1); B=$(echo "$B"|sed '$d'); chk "Refresh token rotation" "$H" "200"
NT=$(echo "$B"|grep -o '"accessToken":"[^"]*"'|cut -d'"' -f4); [ -n "$NT" ] && SA="$NT"

sleep 1
B=$(curl -s -c $CJ -w "\n%{http_code}" -X POST "$API/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$SA_EMAIL\",\"password\":\"$SA_PASS\"}")
H=$(echo "$B"|tail -1); B=$(echo "$B"|sed '$d'); chk "Re-login multi-session" "$H" "200"
NT=$(echo "$B"|grep -o '"accessToken":"[^"]*"'|cut -d'"' -f4); [ -n "$NT" ] && SA="$NT"

# Logout
B=$(curl -s -b $CJ -w "\n%{http_code}" -X POST "$API/auth/logout" -H "Authorization: Bearer $SA")
H=$(echo "$B"|tail -1); chk "Logout" "$H" "200"

# Re-login after logout
B=$(curl -s -c $CJ -w "\n%{http_code}" -X POST "$API/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$SA_EMAIL\",\"password\":\"$SA_PASS\"}")
H=$(echo "$B"|tail -1); B=$(echo "$B"|sed '$d')
SA=$(echo "$B"|grep -o '"accessToken":"[^"]*"'|cut -d'"' -f4); chk "Re-login after logout" "$H" "200"

# Change password (change then revert)
B=$(curl -s -w "\n%{http_code}" -X POST "$API/auth/change-password" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"currentPassword\":\"$SA_PASS\",\"newPassword\":\"TempPass999!\"}")
H=$(echo "$B"|tail -1); chk "Change password" "$H" "200"
# Revert
B=$(curl -s -c $CJ -w "\n%{http_code}" -X POST "$API/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$SA_EMAIL\",\"password\":\"TempPass999!\"}")
SA=$(echo "$B"|sed '$d'|grep -o '"accessToken":"[^"]*"'|cut -d'"' -f4)
curl -s -o /dev/null -X POST "$API/auth/change-password" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"currentPassword\":\"TempPass999!\",\"newPassword\":\"$SA_PASS\"}"
B=$(curl -s -c $CJ -w "\n%{http_code}" -X POST "$API/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$SA_EMAIL\",\"password\":\"$SA_PASS\"}")
SA=$(echo "$B"|sed '$d'|grep -o '"accessToken":"[^"]*"'|cut -d'"' -f4)
chk "Password reverted" "$(echo $B|tail -c 4)" "200"

# ═══ PUBLIC CONTENT ═══
echo -e "\n📦 PUBLIC CONTENT"
for EP in "content/tree" "content/list" "content/tags" "content/search?q=test" "content/donation" "content/announcement" "content/ai-status" "content/banners/active" "content/donation/testimonials"; do
  H=$(curl -s -o /dev/null -w "%{http_code}" "$API/$EP"); chk "GET /$EP" "$H" "200"
done

# Content detail (get first published slug)
SLUG=$(curl -s "$API/content/list?limit=1"|grep -o '"slug":"[^"]*"'|head -1|cut -d'"' -f4)
if [ -n "$SLUG" ]; then
  H=$(curl -s -o /dev/null -w "%{http_code}" "$API/content/$SLUG"); chk "GET /content/:slug detail" "$H" "200"
else
  f "GET /content/:slug" "no published content"
fi

# Public feedback
B=$(curl -s -w "\n%{http_code}" -X POST "$API/content/feedback" -H "Content-Type: application/json" -d "{\"name\":\"E2E Tester\",\"type\":\"SARAN\",\"message\":\"Test feedback from E2E\"}")
H=$(echo "$B"|tail -1); chk2 "POST /content/feedback" "$H" "200" "201"

# Public settings
H=$(curl -s -o /dev/null -w "%{http_code}" "$API/admin/settings/public"); chk "GET /admin/settings/public" "$H" "200"

# ═══ USER MANAGEMENT ═══
echo -e "\n📦 USER MANAGEMENT"
AE="e2e-author-$(date +%s)@test.adably.id"
B=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/users" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"name\":\"E2E Author\",\"email\":\"$AE\",\"password\":\"Test1234!\",\"role\":\"AUTHOR\"}")
H=$(echo "$B"|tail -1); B=$(echo "$B"|sed '$d'); chk "Create Author" "$H" "201"
AID=$(echo "$B"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)

B=$(curl -s -w "\n%{http_code}" "$API/admin/users" -H "Authorization: Bearer $SA")
H=$(echo "$B"|tail -1); chk "List users" "$H" "200"

if [ -n "$AID" ]; then
  B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/users/$AID" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"name\":\"E2E Author Updated\"}")
  H=$(echo "$B"|tail -1); chk "Update user" "$H" "200"

  B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/users/$AID/reset-password" -H "Authorization: Bearer $SA")
  H=$(echo "$B"|tail -1); chk "Reset password" "$H" "200"
  NP=$(echo "$B"|sed '$d'|grep -o '"newPassword":"[^"]*"'|cut -d'"' -f4)

  B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/users/$AID/set-password" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"password\":\"Test1234!\"}")
  H=$(echo "$B"|tail -1); chk "Set password" "$H" "200"
fi

# Login as Author
B=$(curl -s -c $CJ2 -w "\n%{http_code}" -X POST "$API/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$AE\",\"password\":\"Test1234!\"}")
H=$(echo "$B"|tail -1); B=$(echo "$B"|sed '$d'); chk "Login Author" "$H" "200"
AT=$(echo "$B"|grep -o '"accessToken":"[^"]*"'|cut -d'"' -f4)

# ═══ PROFILE ═══
echo -e "\n📦 PROFILE"
B=$(curl -s -w "\n%{http_code}" "$API/admin/profile" -H "Authorization: Bearer $AT")
H=$(echo "$B"|tail -1); chk "GET profile" "$H" "200"

B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/profile" -H "Authorization: Bearer $AT" -H "Content-Type: application/json" -d "{\"name\":\"E2E Updated\",\"bio\":\"Test bio\"}")
H=$(echo "$B"|tail -1); chk "PUT profile" "$H" "200"

B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/profile/bank" -H "Authorization: Bearer $AT" -H "Content-Type: application/json" -d "{\"bankName\":\"BCA\",\"bankAccount\":\"1234567890\",\"bankHolder\":\"E2E Test\"}")
H=$(echo "$B"|tail -1); chk "PUT profile/bank" "$H" "200"

# ═══ EDITOR ═══
echo -e "\n📦 EDITOR"
B=$(curl -s -w "\n%{http_code}" -X POST "$API/editor/content" -H "Authorization: Bearer $AT" -H "Content-Type: application/json" -d "{\"title\":\"E2E QNA <script>alert(1)</script>\",\"type\":\"QNA\",\"ageGroups\":[\"3-5\"],\"qnaDetail\":{\"question\":\"Q?\",\"answerQuick\":\"A\",\"dialogBlocks\":[],\"dalilBlocks\":[],\"analogyBlocks\":[],\"tipsBlocks\":[]}}")
H=$(echo "$B"|tail -1); B=$(echo "$B"|sed '$d'); chk "Create QNA" "$H" "201"
QID=$(echo "$B"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
if echo "$B"|grep -q "<script>"; then f "XSS strip" "tag present"; else g "XSS sanitization"; fi

B=$(curl -s -w "\n%{http_code}" -X POST "$API/editor/content" -H "Authorization: Bearer $AT" -H "Content-Type: application/json" -d "{\"title\":\"E2E Article\",\"type\":\"ARTICLE\",\"ageGroups\":[\"5-7\"],\"articleDetail\":{\"coverUrl\":\"https://example.com/i.jpg\",\"blocks\":[{\"type\":\"paragraph\",\"text\":\"Hello\"}]}}")
H=$(echo "$B"|tail -1); B=$(echo "$B"|sed '$d'); chk "Create Article" "$H" "201"
ARID=$(echo "$B"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)

[ -n "$QID" ] && {
  B=$(curl -s -w "\n%{http_code}" "$API/editor/content/$QID" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); chk "GET content/:id" "$H" "200"
  B=$(curl -s -w "\n%{http_code}" -X PUT "$API/editor/content/$QID" -H "Authorization: Bearer $AT" -H "Content-Type: application/json" -d "{\"title\":\"E2E QNA Up\",\"type\":\"QNA\",\"ageGroups\":[\"3-5\"],\"qnaDetail\":{\"question\":\"U?\",\"answerQuick\":\"Y\",\"dialogBlocks\":[],\"dalilBlocks\":[],\"analogyBlocks\":[],\"tipsBlocks\":[]}}"); H=$(echo "$B"|tail -1); chk "Update content" "$H" "200"
  B=$(curl -s -w "\n%{http_code}" -X POST "$API/editor/content/$QID/submit" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); chk "Submit review" "$H" "201"
}

B=$(curl -s -w "\n%{http_code}" "$API/editor/my-contents" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); chk "My contents" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/editor/nodes" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); chk "Editor nodes" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/editor/tags" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); chk "Editor tags" "$H" "200"

# ═══ ADMIN ═══
echo -e "\n📦 ADMIN"
B=$(curl -s -w "\n%{http_code}" "$API/admin/dashboard/stats" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); B=$(echo "$B"|sed '$d')
chk "Dashboard AUTHOR" "$H" "200"; has "Dashboard role" "$B" "role"

B=$(curl -s -w "\n%{http_code}" "$API/admin/dashboard/stats" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Dashboard SA" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/admin/review?page=1" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Review queue" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/admin/contents?page=1" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "All contents" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/admin/structure" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Structure tree" "$H" "200"

# Structure CRUD
B=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/structure" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"title\":\"E2E Node\",\"type\":\"TOPIC\"}"); H=$(echo "$B"|tail -1); B=$(echo "$B"|sed '$d')
chk2 "Create node" "$H" "200" "201"
NID=$(echo "$B"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
[ -n "$NID" ] && {
  B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/structure/$NID" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"title\":\"E2E Node Up\"}"); H=$(echo "$B"|tail -1); chk "Update node" "$H" "200"
  B=$(curl -s -w "\n%{http_code}" -X DELETE "$API/admin/structure/$NID" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Delete node" "$H" "200"
}

# Review: approve, reject (re-submit first), revision
[ -n "$QID" ] && {
  B=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/review/$QID/approve" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"notes\":\"ok\"}"); H=$(echo "$B"|tail -1); chk2 "Approve" "$H" "200" "201"
  B=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/review/$QID/unpublish" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"notes\":\"test\"}"); H=$(echo "$B"|tail -1); chk2 "Unpublish" "$H" "200" "201"
  # Re-submit for reject test
  curl -s -o /dev/null -X POST "$API/editor/content/$QID/submit" -H "Authorization: Bearer $AT"
  B=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/review/$QID/reject" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"notes\":\"rejected\"}"); H=$(echo "$B"|tail -1); chk2 "Reject" "$H" "200" "201"
  # Re-submit for revision test
  curl -s -o /dev/null -X POST "$API/editor/content/$QID/submit" -H "Authorization: Bearer $AT"
  B=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/review/$QID/revision" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"notes\":\"revise\"}"); H=$(echo "$B"|tail -1); chk2 "Revision" "$H" "200" "201"
}

# Assign node
[ -n "$ARID" ] && {
  FN=$(curl -s "$API/admin/structure" -H "Authorization: Bearer $SA"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
  [ -n "$FN" ] && { B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/content/$ARID/assign-node" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"nodeId\":\"$FN\"}"); H=$(echo "$B"|tail -1); chk "Assign node" "$H" "200"; }
}

# ═══ ENGAGEMENT ═══
echo -e "\n📦 ENGAGEMENT"
UH="e2e-$(date +%s)"
PID=$(curl -s "$API/content/list?limit=1"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
if [ -n "$PID" ]; then
  for EP in like bookmark; do H=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/engagement/$EP" -H "Content-Type: application/json" -d "{\"contentId\":\"$PID\",\"userHash\":\"$UH\"}"); chk "Toggle $EP" "$H" "201"; done
  H=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/engagement/rating" -H "Content-Type: application/json" -d "{\"contentId\":\"$PID\",\"userHash\":\"$UH\",\"rating\":5}"); chk "Rating" "$H" "201"
  H=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/engagement/view" -H "Content-Type: application/json" -d "{\"contentId\":\"$PID\",\"userHash\":\"$UH\"}"); chk "View" "$H" "201"
  H=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/engagement/share" -H "Content-Type: application/json" -d "{\"contentId\":\"$PID\",\"userHash\":\"$UH\"}"); chk "Share" "$H" "201"
  H=$(curl -s -o /dev/null -w "%{http_code}" "$API/engagement/status?contentId=$PID&userHash=$UH"); chk "Status" "$H" "200"
fi

# Save vars for part 2
echo "SA=$SA" > /tmp/e2e_vars.sh
echo "AT=$AT" >> /tmp/e2e_vars.sh
echo "AID=$AID" >> /tmp/e2e_vars.sh
echo "QID=$QID" >> /tmp/e2e_vars.sh
echo "ARID=$ARID" >> /tmp/e2e_vars.sh
echo "AE=$AE" >> /tmp/e2e_vars.sh
echo "P1_PASS=$P" >> /tmp/e2e_vars.sh
echo "P1_FAIL=$F" >> /tmp/e2e_vars.sh
echo "P1_TOTAL=$T" >> /tmp/e2e_vars.sh

echo ""
echo "══════════════════════════════════════════"
echo " Part 1: $P/$T PASSED, $F FAILED"
echo "══════════════════════════════════════════"
echo " → Run: bash e2e-part2.sh"
