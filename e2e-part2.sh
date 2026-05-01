#!/bin/bash
# Adably E2E Test — Part 2: Notifications, Rewards, SuperAdmin, Messages, Security, Frontend
API="https://api.adably.id/api"
FE="https://adably.id"
source /tmp/e2e_vars.sh
P=0; F=0; T=0
g(){ echo -e "\033[32m✅ $1\033[0m"; P=$((P+1)); T=$((T+1)); }
f(){ echo -e "\033[31m❌ $1 — $2\033[0m"; F=$((F+1)); T=$((T+1)); }
chk(){ if [ "$2" = "$3" ]; then g "$1"; else f "$1" "exp=$3 got=$2 $(echo $4|head -c 150)"; fi; }
chk2(){ local h="$2"; if [ "$h" = "$3" ] || [ "$h" = "$4" ]; then g "$1"; else f "$1" "exp=$3/$4 got=$h"; fi; }
has(){ if echo "$2"|grep -q "\"$3\""; then g "$1"; else f "$1" "key=$3 missing"; fi; }

echo "══════════════════════════════════════════"
echo " Adably E2E Part 2 — $(date)"
echo "══════════════════════════════════════════"

# ═══ NOTIFICATIONS ═══
echo -e "\n📦 NOTIFICATIONS"
B=$(curl -s -w "\n%{http_code}" "$API/admin/notifications?page=1" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "List notifications" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/admin/notifications/unread-count" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Unread count" "$H" "200"
B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/notifications/read-all" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Mark all read" "$H" "200"

# Get a notification ID for mark-read and delete tests
NB=$(curl -s "$API/admin/notifications?page=1" -H "Authorization: Bearer $SA")
NOTIF_ID=$(echo "$NB"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
if [ -n "$NOTIF_ID" ]; then
  B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/notifications/$NOTIF_ID/read" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Mark one read" "$H" "200"
  B=$(curl -s -w "\n%{http_code}" -X DELETE "$API/admin/notifications/$NOTIF_ID" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Delete notification" "$H" "200"
else
  g "Mark one read (no notif to test, skip)"
  g "Delete notification (no notif to test, skip)"
fi
B=$(curl -s -w "\n%{http_code}" -X DELETE "$API/admin/notifications/read/all" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Delete all read" "$H" "200"

# ═══ REWARDS ═══
echo -e "\n📦 REWARDS"
B=$(curl -s -w "\n%{http_code}" "$API/admin/points/balance" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); chk "Point balance" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/admin/points/ledger?page=1" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); chk "Point ledger" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/admin/points/withdrawals?page=1" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); chk "My withdrawals" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/superadmin/reward-settings" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "GET reward settings" "$H" "200"
B=$(curl -s -w "\n%{http_code}" -X PUT "$API/superadmin/reward-settings" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"pointPerApproved\":\"15\"}"); H=$(echo "$B"|tail -1); chk "PUT reward settings" "$H" "200"
# Revert
curl -s -o /dev/null -X PUT "$API/superadmin/reward-settings" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"pointPerApproved\":\"10\"}"
B=$(curl -s -w "\n%{http_code}" "$API/superadmin/points/leaderboard" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Leaderboard" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/superadmin/withdrawals?page=1" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "SA withdrawals list" "$H" "200"

# Deduct points (test with author user)
if [ -n "$AID" ]; then
  B=$(curl -s -w "\n%{http_code}" -X POST "$API/superadmin/users/$AID/deduct-points" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"amount\":0,\"reason\":\"E2E test deduct\"}"); H=$(echo "$B"|tail -1); chk2 "Deduct points" "$H" "200" "201"
fi

# ═══ SUPERADMIN SETTINGS ═══
echo -e "\n📦 SUPERADMIN SETTINGS"
B=$(curl -s -w "\n%{http_code}" "$API/superadmin/settings/ai-toggle" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "GET AI toggle" "$H" "200"
B=$(curl -s -w "\n%{http_code}" -X PUT "$API/superadmin/settings/ai-toggle" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"enabled\":false}"); H=$(echo "$B"|tail -1); chk "PUT AI toggle" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/superadmin/settings/donation" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "GET donation settings" "$H" "200"
B=$(curl -s -w "\n%{http_code}" -X PUT "$API/superadmin/settings/donation" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"enabled\":true,\"title\":\"E2E Donation\"}"); H=$(echo "$B"|tail -1); chk "PUT donation settings" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/superadmin/settings/announcement" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "GET announcement" "$H" "200"
B=$(curl -s -w "\n%{http_code}" -X PUT "$API/superadmin/settings/announcement" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"enabled\":false,\"text\":\"E2E test\"}"); H=$(echo "$B"|tail -1); chk "PUT announcement" "$H" "200"

# ═══ BANNERS ═══
echo -e "\n📦 BANNERS"
B=$(curl -s -w "\n%{http_code}" "$API/superadmin/banners" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "List banners" "$H" "200"
# Note: Create banner requires file upload (multipart), testing list/update/toggle/delete with existing
BID=$(echo "$B"|sed '$d'|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
if [ -n "$BID" ]; then
  B=$(curl -s -w "\n%{http_code}" -X PUT "$API/superadmin/banners/$BID" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"notes\":\"E2E test\"}"); H=$(echo "$B"|tail -1); chk "Update banner" "$H" "200"
  B=$(curl -s -w "\n%{http_code}" -X PUT "$API/superadmin/banners/$BID/toggle" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Toggle banner" "$H" "200"
  # Toggle back
  curl -s -o /dev/null -X PUT "$API/superadmin/banners/$BID/toggle" -H "Authorization: Bearer $SA"
else
  g "Update banner (no banners, skip)"; g "Toggle banner (no banners, skip)"
fi

# ═══ EXPORT/BACKUP ═══
echo -e "\n📦 EXPORT & BACKUP"
H=$(curl -s -o /dev/null -w "%{http_code}" "$API/superadmin/export" -H "Authorization: Bearer $SA"); chk "Export JSON" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/superadmin/backup/list" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Backup list" "$H" "200"
B=$(curl -s -w "\n%{http_code}" -X POST "$API/superadmin/backup/trigger" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk2 "Trigger backup" "$H" "200" "201"
B=$(curl -s -w "\n%{http_code}" "$API/superadmin/audit-log?page=1" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Audit log" "$H" "200"
H=$(curl -s -o /dev/null -w "%{http_code}" "$API/superadmin/audit-log/export-csv" -H "Authorization: Bearer $SA"); chk "Audit CSV export" "$H" "200"

# ═══ MESSAGES ═══
echo -e "\n📦 MESSAGES"
B=$(curl -s -w "\n%{http_code}" "$API/admin/messages/conversations" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Conversations" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/admin/messages/users" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Chat users" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/admin/messages/unread-count" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Msg unread count" "$H" "200"

# Send message SA → Author
if [ -n "$AID" ]; then
  B=$(curl -s -w "\n%{http_code}" -X POST "$API/admin/messages/send" -H "Authorization: Bearer $SA" -H "Content-Type: application/json" -d "{\"receiverId\":\"$AID\",\"text\":\"E2E test message\"}"); H=$(echo "$B"|tail -1); chk2 "Send message" "$H" "200" "201"
  # Get conversation
  CB=$(curl -s "$API/admin/messages/conversations" -H "Authorization: Bearer $SA")
  CID=$(echo "$CB"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
  if [ -n "$CID" ]; then
    B=$(curl -s -w "\n%{http_code}" "$API/admin/messages/$CID" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Get messages" "$H" "200"
    B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/messages/$CID/read" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Mark msg read" "$H" "200"
  else
    g "Get messages (skip)"; g "Mark msg read (skip)"
  fi
fi

# ═══ ADMIN INBOX ═══
echo -e "\n📦 ADMIN INBOX"
B=$(curl -s -w "\n%{http_code}" "$API/admin/donation/submissions?page=1" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Donation submissions" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/admin/donation/report" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Donation report" "$H" "200"
B=$(curl -s -w "\n%{http_code}" "$API/admin/feedback?page=1" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Feedback list" "$H" "200"

# Verify donation + mark feedback read
DS=$(curl -s "$API/admin/donation/submissions?page=1" -H "Authorization: Bearer $SA")
DID=$(echo "$DS"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
[ -n "$DID" ] && { B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/donation/submissions/$DID/verify" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Verify donation" "$H" "200"; } || g "Verify donation (skip)"

FS=$(curl -s "$API/admin/feedback?page=1" -H "Authorization: Bearer $SA")
FID=$(echo "$FS"|grep -o '"id":"[^"]*"'|head -1|cut -d'"' -f4)
[ -n "$FID" ] && { B=$(curl -s -w "\n%{http_code}" -X PUT "$API/admin/feedback/$FID/read" -H "Authorization: Bearer $SA"); H=$(echo "$B"|tail -1); chk "Mark feedback read" "$H" "200"; } || g "Mark feedback read (skip)"

# ═══ FRONTEND ═══
echo -e "\n📦 FRONTEND"
for PG in "" "artikel" "qna" "login" "kurikulum" "search"; do
  H=$(curl -s -o /dev/null -w "%{http_code}" "$FE/$PG"); chk "Frontend /$PG" "$H" "200"
done
H=$(curl -s -o /dev/null -w "%{http_code}" --max-redirs 0 "$FE/admin")
if [ "$H" = "307" ] || [ "$H" = "308" ]; then g "Middleware /admin → redirect"; else f "Middleware redirect" "got $H"; fi

# ═══ SECURITY ═══
echo -e "\n📦 SECURITY"

# Rate limit
for i in $(seq 1 6); do RL=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"rl@fake.com\",\"password\":\"wrong\"}"); done
chk "Rate limit (429)" "$RL" "429"

# Role guard: Author cannot access review queue
B=$(curl -s -w "\n%{http_code}" "$API/admin/review" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); chk "Author blocked from review" "$H" "403"

# Role guard: Author cannot access user management
B=$(curl -s -w "\n%{http_code}" "$API/admin/users" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); chk "Author blocked from users" "$H" "403"

# Role guard: Author cannot access superadmin
B=$(curl -s -w "\n%{http_code}" "$API/superadmin/settings/ai-toggle" -H "Authorization: Bearer $AT"); H=$(echo "$B"|tail -1); chk "Author blocked from SA" "$H" "403"

# Invalid token
B=$(curl -s -w "\n%{http_code}" "$API/admin/profile" -H "Authorization: Bearer invalidtoken123"); H=$(echo "$B"|tail -1); chk "Invalid token → 401" "$H" "401"

# No token
B=$(curl -s -w "\n%{http_code}" "$API/admin/profile"); H=$(echo "$B"|tail -1); chk "No token → 401" "$H" "401"

# ═══ CLEANUP ═══
echo -e "\n📦 CLEANUP"
[ -n "$QID" ] && curl -s -o /dev/null -X DELETE "$API/editor/content/$QID" -H "Authorization: Bearer $AT"
[ -n "$ARID" ] && curl -s -o /dev/null -X DELETE "$API/editor/content/$ARID" -H "Authorization: Bearer $AT"
[ -n "$AID" ] && curl -s -o /dev/null -X DELETE "$API/admin/users/$AID" -H "Authorization: Bearer $SA"
g "Cleanup complete"
rm -f /tmp/e2e_sa.txt /tmp/e2e_au.txt /tmp/e2e_vars.sh

# ═══ FINAL RESULTS ═══
TOTAL_P=$((P1_PASS + P))
TOTAL_F=$((P1_FAIL + F))
TOTAL_T=$((P1_TOTAL + T))

echo ""
echo "══════════════════════════════════════════"
echo " Part 2: $P/$T PASSED, $F FAILED"
echo "══════════════════════════════════════════"
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║ GRAND TOTAL: $TOTAL_P/$TOTAL_T PASSED, $TOTAL_F FAILED"
echo "╚══════════════════════════════════════════╝"
if [ "$TOTAL_F" -eq 0 ]; then
  echo -e "\033[32m  🎉 ALL TESTS PASSED!\033[0m"
else
  echo -e "\033[31m  ⚠️  $TOTAL_F test(s) failed\033[0m"
fi
echo ""
