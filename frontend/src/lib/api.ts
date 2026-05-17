export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt token refresh by sending _rt (JS-accessible refresh token) via POST body.
 * On success, updates both _at and _rt cookies for subsequent requests.
 */
export async function tryRefreshToken(): Promise<string | false> {
  // Deduplicate concurrent refresh calls
  if (isRefreshing && refreshPromise) return refreshPromise as any;
  isRefreshing = true;

  const doRefresh = async (): Promise<string | false> => {
    try {
      // Dynamic import to avoid SSR issues
      const Cookies = (await import('js-cookie')).default;
      const rt = Cookies.get('_rt');
      if (!rt) return false;

      const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.accessToken) {
        // Update _at cookie (2 hours)
        Cookies.set('_at', data.accessToken, {
          expires: 1/12,
          path: '/',
          secure: window.location.protocol === 'https:',
          sameSite: 'lax',
        });
        // Update _rt cookie (7 days)
        if (data.refreshToken) {
          Cookies.set('_rt', data.refreshToken, {
            expires: 7,
            path: '/',
            secure: window.location.protocol === 'https:',
            sameSite: 'lax',
          });
        }
        return data.accessToken;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  };

  refreshPromise = doRefresh() as any;
  return refreshPromise as any;
}

async function redirectToLogin() {
  if (typeof window !== 'undefined') {
    try {
      const Cookies = (await import('js-cookie')).default;
      const token = Cookies.get('_at');
      const rt = Cookies.get('_rt');
      // Invalidate refresh token in backend DB before clearing cookies
      if (token && rt) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ refreshToken: rt }),
        }).catch(() => {}); // Best-effort — don't block logout on network failure
      }
      Cookies.remove('_at', { path: '/' });
      Cookies.remove('_rt', { path: '/' });
    } catch {
      // Fallback: clear cookies even if import fails
    }
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

// ── Helper ──
export async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, { cache: 'no-store', ...options });
  if (!res.ok) {
    // On 401 (expired token), try silent refresh once before giving up
    if (res.status === 401 && typeof window !== 'undefined') {
      const newToken = await tryRefreshToken();
      if (newToken) {
        // Rebuild headers with the fresh token
        const newHeaders = new Headers(options.headers || {});
        newHeaders.set('Authorization', `Bearer ${newToken}`);
        const retryRes = await fetch(url, { cache: 'no-store', ...options, headers: newHeaders });
        if (retryRes.ok) return retryRes.json();
        // Retry also failed — redirect to login
        if (retryRes.status === 401) {
          redirectToLogin();
          throw new Error('Sesi habis, silakan login kembali');
        }
        const retryError = await retryRes.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(retryError.message || `HTTP ${retryRes.status}`);
      }
      // Refresh failed — redirect to login
      redirectToLogin();
      throw new Error('Sesi habis, silakan login kembali');
    }
    // Rate limit — friendly message
    if (res.status === 429) {
      throw new Error('Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.');
    }
    const error = await res.json().catch(() => ({ message: 'Request failed' }));

    // Auto-report API errors (4xx & 5xx, except 401/429 which are handled above)
    if (res.status >= 400 && typeof window !== 'undefined') {
      const userId = (() => { try { const u = localStorage.getItem('user'); return u ? JSON.parse(u)?.id : undefined; } catch { return undefined; } })();
      submitErrorReport({
        message: `API ${res.status}: ${error.message || 'Error'}`,
        stack: `URL: ${url}\nMethod: ${options.method || 'GET'}\nStatus: ${res.status}`,
        source: window.location.href,
        userAgent: navigator.userAgent,
        userId,
        category: 'API_ERROR',
        httpStatus: res.status,
      });
    }

    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export function authHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

// ═══════════════════════════════════════
// PUBLIC ENDPOINTS
// ═══════════════════════════════════════

export async function fetchContentTree(age?: string) {
  const params = age ? `?age=${age}` : '';
  return apiFetch(`${API_BASE_URL}/content/tree${params}`);
}

export async function fetchKisahTree() {
  return apiFetch(`${API_BASE_URL}/content/kisah-tree`);
}

export async function fetchKisahByNode(nodeSlug: string, page = 1, limit = 12, search?: string) {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set('search', search);
  return apiFetch(`${API_BASE_URL}/content/kisah/${nodeSlug}?${params.toString()}`);
}

export async function fetchContentList(params: { sort?: string; limit?: number; age?: string; type?: string; page?: number; pov?: string; nodeSlug?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.sort) searchParams.append('sort', params.sort);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.age && params.age !== 'Semua') searchParams.append('age', params.age);
  if (params.type) searchParams.append('type', params.type);
  if (params.page) searchParams.append('page', params.page.toString());
  if (params.pov) searchParams.append('pov', params.pov);
  if (params.nodeSlug) searchParams.append('nodeSlug', params.nodeSlug);
  return apiFetch(`${API_BASE_URL}/content/list?${searchParams.toString()}`);
}

export async function fetchContentBySlug(slug: string) {
  return apiFetch(`${API_BASE_URL}/content/${slug}`);
}

export async function fetchEngagementStatus(contentId: string, userHash: string) {
  return apiFetch(`${API_BASE_URL}/engagement/status?contentId=${contentId}&userHash=${encodeURIComponent(userHash)}`);
}

export async function fetchContentTags() {
  return apiFetch(`${API_BASE_URL}/content/tags`);
}

export async function fetchDonationSettings() {
  return apiFetch(`${API_BASE_URL}/content/donation`);
}



export async function submitPublicDonation(formData: FormData) {
  const res = await fetch(`${API_BASE_URL}/content/donation/submit`, {
    method: 'POST',
    body: formData, // multipart form — no Content-Type header
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Gagal mengirim donasi' }));
    throw new Error(error.message);
  }
  return res.json();
}

export async function submitPublicFeedback(data: { name: string; email?: string; type: string; message: string }) {
  return apiFetch(`${API_BASE_URL}/content/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function fetchAnnouncement() {
  return apiFetch(`${API_BASE_URL}/content/announcement`);
}

// ── Auth ──
export async function login(data: any) {
  // IMPORTANT: Use raw fetch(), NOT apiFetch(), because apiFetch intercepts
  // 401 responses as "session expired" and redirects to /login.
  // Login's 401 means "wrong credentials" — must show error toast instead.
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.');
    }
    const error = await res.json().catch(() => ({ message: 'Gagal masuk' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function changePassword(data: { currentPassword: string; newPassword: string }, token: string) {
  return apiFetch(`${API_BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

// ── Engagement ──
export async function toggleLike(contentId: string, userHash: string) {
  return apiFetch(`${API_BASE_URL}/engagement/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentId, userHash }),
  });
}

export async function toggleBookmark(contentId: string, userHash: string) {
  return apiFetch(`${API_BASE_URL}/engagement/bookmark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentId, userHash }),
  });
}

export async function submitRating(contentId: string, userHash: string, rating: number) {
  return apiFetch(`${API_BASE_URL}/engagement/rating`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentId, userHash, rating }),
  });
}

export async function recordView(contentId: string, userHash: string) {
  return apiFetch(`${API_BASE_URL}/engagement/view`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentId, userHash }),
  });
}

// ═══════════════════════════════════════
// EDITOR (Authenticated) ENDPOINTS
// ═══════════════════════════════════════

export async function createContent(data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/editor/content`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function fetchMyContents(token: string, status?: string, page?: number, search?: string, age?: string) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (page) params.append('page', page.toString());
  if (search) params.append('search', search);
  if (age) params.append('age', age);
  return apiFetch(`${API_BASE_URL}/editor/my-contents?${params.toString()}`, {
    headers: authHeaders(token),
  });
}

export async function fetchContentForEdit(token: string, id: string) {
  return apiFetch(`${API_BASE_URL}/editor/content/${id}`, {
    headers: authHeaders(token),
  });
}

export async function updateContent(id: string, data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/editor/content/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteContent(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/editor/content/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function submitContentForReview(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/editor/content/${id}/submit`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function fetchEditorNodes(token: string, group?: string) {
  const params = group ? `?group=${group}` : '';
  return apiFetch(`${API_BASE_URL}/editor/nodes${params}`, {
    headers: authHeaders(token),
  });
}

export async function fetchEditorTags(token: string) {
  return apiFetch(`${API_BASE_URL}/editor/tags`, {
    headers: authHeaders(token),
  });
}

// ═══════════════════════════════════════
// ADMIN ENDPOINTS
// ═══════════════════════════════════════

export async function fetchDashboardStats(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/dashboard/stats`, {
    headers: authHeaders(token),
  });
}

export async function fetchScheduledPosts(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/dashboard/scheduled-posts`, {
    headers: authHeaders(token),
  });
}

export async function fetchSocialStats(token: string) {
  return apiFetch(`${API_BASE_URL}/social/stats`, {
    headers: authHeaders(token),
  });
}

export async function fetchReviewQueue(token: string, page = 1) {
  return apiFetch(`${API_BASE_URL}/admin/review?page=${page}`, {
    headers: authHeaders(token),
  });
}

export async function processReview(id: string, action: 'approve' | 'reject' | 'revision', notes: string, token: string, pointAdjustment?: number, adjustmentReason?: string) {
  return apiFetch(`${API_BASE_URL}/admin/review/${id}/${action}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ notes, pointAdjustment, adjustmentReason }),
  });
}

export async function unpublishContent(id: string, notes: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/review/${id}/unpublish`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ notes }),
  });
}

export async function fetchStructure(token: string, group?: string) {
  const params = group ? `?group=${group}` : '';
  return apiFetch(`${API_BASE_URL}/admin/structure${params}`, {
    headers: authHeaders(token),
  });
}

export async function createStructureNode(data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/structure`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function updateStructureNode(id: string, data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/structure/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function deleteStructureNode(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/structure/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function fetchNodeContents(nodeId: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/structure/${nodeId}/contents`, {
    headers: authHeaders(token),
  });
}

export async function bulkMoveNodeContents(nodeId: string, targetNodeId: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/structure/${nodeId}/move-contents`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ targetNodeId }),
  });
}

export async function assignContentToNode(contentId: string, nodeId: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/content/${contentId}/assign-node`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ nodeId }),
  });
}

export async function fetchAllContents(token: string, status?: string, page?: number, search?: string, age?: string) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (page) params.append('page', page.toString());
  if (search) params.append('search', search);
  if (age) params.append('age', age);
  return apiFetch(`${API_BASE_URL}/admin/contents?${params.toString()}`, {
    headers: authHeaders(token),
  });
}

// ── Admin Donation Inbox ──
export async function fetchDonationSubmissions(token: string, page = 1) {
  return apiFetch(`${API_BASE_URL}/admin/donation/submissions?page=${page}`, {
    headers: authHeaders(token),
  });
}

export async function verifyDonation(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/donation/submissions/${id}/verify`, {
    method: 'PUT',
    headers: authHeaders(token),
  });
}

export async function fetchDonationReport(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/donation/report`, {
    headers: authHeaders(token),
  });
}

// ── Admin Feedback Inbox ──
export async function fetchFeedbackList(token: string, page = 1, search?: string) {
  const params = new URLSearchParams({ page: page.toString() });
  if (search) params.append('search', search);
  return apiFetch(`${API_BASE_URL}/admin/feedback?${params}`, {
    headers: authHeaders(token),
  });
}

export async function markFeedbackRead(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/feedback/${id}/read`, {
    method: 'PUT',
    headers: authHeaders(token),
  });
}

// ── Notifications ──
export async function fetchNotifications(token: string, page = 1, search?: string, filter?: string) {
  const params = new URLSearchParams({ page: page.toString() });
  if (search) params.append('search', search);
  if (filter) params.append('filter', filter);
  return apiFetch(`${API_BASE_URL}/admin/notifications?${params}`, {
    headers: authHeaders(token),
  });
}

export async function fetchUnreadCount(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/notifications/unread-count`, {
    headers: authHeaders(token),
  });
}

export async function markNotificationRead(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/notifications/${id}/read`, {
    method: 'PUT',
    headers: authHeaders(token),
  });
}

export async function markAllNotificationsRead(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/notifications/read-all`, {
    method: 'PUT',
    headers: authHeaders(token),
  });
}

// ═══════════════════════════════════════
// SUPERADMIN ENDPOINTS
// ═══════════════════════════════════════

export async function fetchAiToggle(token: string) {
  return apiFetch(`${API_BASE_URL}/content/ai-status`, {
    headers: authHeaders(token),
  });
}

export async function updateAiToggle(enabled: boolean, token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/settings/ai-toggle`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ enabled }),
  });
}

export async function fetchUsersList(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/users`, {
    headers: authHeaders(token),
  });
}

export async function updateUserRole(userId: string, role: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/users/${userId}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ role }),
  });
}

export async function fetchDonationAdmin(token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/settings/donation`, {
    headers: authHeaders(token),
  });
}

export async function updateDonationAdmin(data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/settings/donation`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function fetchAnnouncementAdmin(token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/settings/announcement`, {
    headers: authHeaders(token),
  });
}

export async function updateAnnouncementAdmin(data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/settings/announcement`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

// ═══════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════

export async function searchContent(q: string, type?: string, age?: string, page?: number, pov?: string) {
  const params = new URLSearchParams({ q });
  if (type) params.set('type', type);
  if (age) params.set('age', age);
  if (page) params.set('page', String(page));
  if (pov) params.set('pov', pov);
  return apiFetch(`${API_BASE_URL}/content/search?${params}`);
}

// ═══════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════

export async function createUser(data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/users`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(data) });
}

export async function updateUser(id: string, data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/users/${id}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) });
}

export async function deleteUser(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/users/${id}`, { method: 'DELETE', headers: authHeaders(token) });
}

export async function resetUserPassword(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/users/${id}/reset-password`, { method: 'PUT', headers: authHeaders(token) });
}

// ═══════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════

export async function fetchProfile(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/profile`, { headers: authHeaders(token) });
}

export async function updateProfile(data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/profile`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) });
}

export async function updateBankInfo(data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/profile/bank`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) });
}

// ═══════════════════════════════════════
// REWARDS
// ═══════════════════════════════════════

export async function fetchPointBalance(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/points/balance`, { headers: authHeaders(token) });
}

export async function fetchPointLedger(token: string, page = 1) {
  return apiFetch(`${API_BASE_URL}/admin/points/ledger?page=${page}`, { headers: authHeaders(token) });
}

export async function requestWithdrawal(pointsAmount: number, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/points/withdraw`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ pointsAmount }) });
}

export async function fetchLeaderboard(token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/points/leaderboard`, { headers: authHeaders(token) });
}

export async function fetchMyWithdrawals(token: string, page = 1) {
  return apiFetch(`${API_BASE_URL}/admin/points/withdrawals?page=${page}`, { headers: authHeaders(token) });
}

export async function fetchWithdrawals(token: string, page = 1) {
  return apiFetch(`${API_BASE_URL}/superadmin/withdrawals?page=${page}`, { headers: authHeaders(token) });
}

export async function processWithdrawal(id: string, action: string, token: string, notes?: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/withdrawals/${id}/process`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ action, notes }) });
}

export async function fetchRewardSettings(token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/reward-settings`, { headers: authHeaders(token) });
}

export async function updateRewardSettings(data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/reward-settings`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) });
}

// ═══════════════════════════════════════
// EXPORT / IMPORT / BACKUP
// ═══════════════════════════════════════

export async function triggerBackup(token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/backup/trigger`, { method: 'POST', headers: authHeaders(token) });
}

export async function fetchBackupList(token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/backup/list`, { headers: authHeaders(token) });
}

export async function fetchAuditLogs(token: string, page = 1, action?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (action) params.set('action', action);
  return apiFetch(`${API_BASE_URL}/superadmin/audit-log?${params}`, { headers: authHeaders(token) });
}

// ═══════════════════════════════════════
// NOTIFICATION - DELETE
// ═══════════════════════════════════════

export async function deleteNotification(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/notifications/${id}`, { method: 'DELETE', headers: authHeaders(token) });
}

export async function deleteAllReadNotifications(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/notifications/read/all`, { method: 'DELETE', headers: authHeaders(token) });
}

// ═══════════════════════════════════════
// SPONSOR BANNERS
// ═══════════════════════════════════════

export async function fetchBanners(token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/banners`, { headers: authHeaders(token) });
}

export async function toggleBanner(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/banners/${id}/toggle`, { method: 'PUT', headers: authHeaders(token) });
}

export async function updateBanner(id: string, data: any, token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/banners/${id}`, { method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data) });
}

export async function deleteBanner(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/banners/${id}`, { method: 'DELETE', headers: authHeaders(token) });
}

// ═══════════════════════════════════════
// ERROR REPORTING
// ═══════════════════════════════════════

export async function submitErrorReport(data: { message: string; stack?: string; source?: string; userAgent?: string; userId?: string; category?: string; httpStatus?: number }) {
  try {
    await fetch(`${API_BASE_URL}/error-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    // Silently fail — never let error reporting cause more errors
  }
}

export async function fetchErrorReports(token: string, page = 1, resolved?: string, search?: string, category?: string, sortBy?: string) {
  const params = new URLSearchParams({ page: String(page) });
  if (resolved !== undefined) params.set('resolved', resolved);
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (sortBy) params.set('sortBy', sortBy);
  return apiFetch(`${API_BASE_URL}/admin/error-reports?${params}`, { headers: authHeaders(token) });
}

export async function fetchErrorStats(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/error-reports/stats`, { headers: authHeaders(token) });
}

export async function resolveError(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/error-reports/${id}/resolve`, { method: 'PUT', headers: authHeaders(token) });
}

export async function reopenError(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/error-reports/${id}/reopen`, { method: 'PUT', headers: authHeaders(token) });
}

export async function resolveAllErrors(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/error-reports/resolve-all`, { method: 'PUT', headers: authHeaders(token) });
}

export async function deleteError(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/error-reports/${id}`, { method: 'DELETE', headers: authHeaders(token) });
}

export async function deleteResolvedErrors(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/error-reports/bulk/resolved`, { method: 'DELETE', headers: authHeaders(token) });
}

// ── Trash / Recycle Bin ──
export async function fetchTrash(token: string, page = 1, search?: string) {
  const params = new URLSearchParams({ page: page.toString() });
  if (search) params.append('search', search);
  return apiFetch(`${API_BASE_URL}/editor/trash?${params}`, {
    headers: authHeaders(token),
  });
}

export async function restoreFromTrash(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/editor/trash/${id}/restore`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

export async function permanentlyDeleteContent(id: string, token: string) {
  return apiFetch(`${API_BASE_URL}/editor/trash/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function emptyTrash(token: string) {
  return apiFetch(`${API_BASE_URL}/editor/trash/empty`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

// ── Login History ──
export async function fetchLoginHistory(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/profile/login-history`, {
    headers: authHeaders(token),
  });
}

// ── Page Content (CMS) ──
export async function fetchPageContent(slug: string) {
  return apiFetch(`${API_BASE_URL}/pages/${slug}`);
}

export async function fetchPageContentAdmin(slug: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/pages/${slug}`, {
    headers: authHeaders(token),
  });
}

export async function updatePageContent(slug: string, data: { title?: string; content?: any }, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/pages/${slug}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

// ── Batch Content (Bookmarks) ──
export async function fetchContentBatch(ids: string[]) {
  return apiFetch(`${API_BASE_URL}/content/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  });
}

// ── Social Media ──

export async function getSocialAuthUrl(token: string) {
  return apiFetch(`${API_BASE_URL}/social/auth-url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function connectSocialAccount(code: string, token: string) {
  return apiFetch(`${API_BASE_URL}/social/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
}

// ── YouTube OAuth ──
export async function getYouTubeAuthUrl(token: string) {
  return apiFetch(`${API_BASE_URL}/social/youtube/auth-url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function connectYouTubeAccount(code: string, token: string) {
  return apiFetch(`${API_BASE_URL}/social/youtube/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
}

// ── TikTok OAuth ──
export async function getTikTokAuthUrl(token: string) {
  return apiFetch(`${API_BASE_URL}/social/tiktok/auth-url`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function connectTikTokAccount(code: string, token: string) {
  return apiFetch(`${API_BASE_URL}/social/tiktok/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code }),
  });
}

export async function fetchSocialAccounts(token: string) {
  return apiFetch(`${API_BASE_URL}/social/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function disconnectSocialAccount(accountId: string, token: string) {
  return apiFetch(`${API_BASE_URL}/social/accounts/${accountId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateSocialDefaults(accountId: string, data: { defaultHashtags?: string; captionTemplate?: string }, token: string) {
  return apiFetch(`${API_BASE_URL}/social/accounts/${accountId}/defaults`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function getSocialCaptionPreview(contentId: string, token: string) {
  return apiFetch(`${API_BASE_URL}/social/caption-preview?contentId=${contentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function publishToSocial(data: { contentId: string; platforms: string[]; caption: string; mode: string; scheduledAt?: string }, token: string) {
  return apiFetch(`${API_BASE_URL}/social/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function fetchSocialLogs(params: { page?: number; contentId?: string }, token: string) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.contentId) searchParams.set('contentId', params.contentId);
  return apiFetch(`${API_BASE_URL}/social/logs?${searchParams.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function retrySocialPublish(logId: string, token: string) {
  return apiFetch(`${API_BASE_URL}/social/retry/${logId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function cancelSocialScheduled(logId: string, token: string) {
  return apiFetch(`${API_BASE_URL}/social/scheduled/${logId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchSocialCronSettings(token: string) {
  return apiFetch(`${API_BASE_URL}/social/cron-settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateSocialCronSettings(data: {
  publishEnabled?: boolean;
  publishInterval?: number;
  validateEnabled?: boolean;
  validateInterval?: number;
}, token: string) {
  return apiFetch(`${API_BASE_URL}/social/cron-settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

// ─────────────────────────────────────────────
// API Settings (SuperAdmin Only)
// ─────────────────────────────────────────────

export async function fetchApiSettings(token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/settings/api`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function updateApiSettings(
  settings: { key: string; value: string; group: string }[],
  token: string,
) {
  return apiFetch(`${API_BASE_URL}/superadmin/settings/api`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ settings }),
  });
}

// ─────────────────────────────────────────────
// TTS Audio Generate (SuperAdmin Only)
// Returns Blob (MP3) — caller triggers download
// ─────────────────────────────────────────────

export async function generateTtsAudio(
  blocks: { type: string; text: string }[],
  filename: string,
  token: string,
): Promise<Blob> {
  const res = await fetch(`${API_BASE_URL}/superadmin/tts/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ blocks, filename }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'TTS gagal' }));
    throw new Error(err.message || `TTS error ${res.status}`);
  }
  return res.blob();
}

// ─────────────────────────────────────────────
// Audio Upload (All Roles — AUTHOR, ADMIN, SUPERADMIN)
// Upload MP3 file → returns { url, filename, size }
// ─────────────────────────────────────────────

export async function uploadAudioFile(
  file: File,
  token: string,
): Promise<{ url: string; filename: string; size: number; message: string }> {
  const formData = new FormData();
  formData.append('audio', file);
  const res = await fetch(`${API_BASE_URL}/editor/audio/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Upload gagal' }));
    throw new Error(err.message || `Upload error ${res.status}`);
  }
  return res.json();
}

// ─────────────────────────────────────────────
// Video Upload (ADMIN, SUPERADMIN Only)
// Upload MP4/WebM file → returns { url, filename, size }
// ─────────────────────────────────────────────

export async function uploadVideoFile(
  file: File,
  token: string,
): Promise<{ url: string; filename: string; size: number; message: string }> {
  const formData = new FormData();
  formData.append('video', file);
  const res = await fetch(`${API_BASE_URL}/editor/video/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Upload gagal' }));
    throw new Error(err.message || `Upload error ${res.status}`);
  }
  return res.json();
}

// ── Homepage Visibility Config ──

export async function fetchHomepageConfig(): Promise<{ pembelajaran: boolean; qna: boolean; kisah: boolean; article: boolean }> {
  return apiFetch(`${API_BASE_URL}/content/homepage-config`);
}

export async function fetchHomepageConfigAdmin(token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/settings/homepage`, {
    headers: authHeaders(token),
  });
}

export async function updateHomepageConfig(config: { pembelajaran?: boolean; qna?: boolean; kisah?: boolean; article?: boolean }, token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/settings/homepage`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(config),
  });
}

// ─────────────────────────────────────────────
// n8n API Key Management (SuperAdmin Only)
// ─────────────────────────────────────────────

export async function fetchN8nApiKey(token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/settings/n8n-key`, {
    headers: authHeaders(token),
  });
}

export async function rotateN8nApiKey(token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/settings/n8n-key/rotate`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

// ─── Podcast ────────────────────────────────────────────────────

export async function fetchPodcastSettings(token: string) {
  return apiFetch(`${API_BASE_URL}/podcast/settings`, {
    headers: authHeaders(token),
  });
}

export async function updatePodcastSettings(token: string, data: Record<string, unknown>) {
  return apiFetch(`${API_BASE_URL}/podcast/settings`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

// ─── Storyboard Tools API ──────────────────────────────────────────

/**
 * Upload storyboard assets with real-time progress tracking.
 * Uses XMLHttpRequest instead of fetch() to enable upload progress events.
 * Reads fresh token from cookie to avoid stale-token 401 during long uploads.
 */
export async function uploadStoryboardAssets(
  _token: string,
  files: File[],
  sessionId?: string,
  onProgress?: (percent: number) => void,
): Promise<any> {
  const formData = new FormData();
  if (sessionId) formData.append('sessionId', sessionId);
  for (const file of files) {
    formData.append('files', file);
  }

  // Read FRESH token from cookie (not the stale param which may have expired)
  const Cookies = (await import('js-cookie')).default;
  let freshToken = Cookies.get('_at') || _token;

  return new Promise(async (resolve, reject) => {
    const doUpload = (token: string) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/storyboard/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch { resolve({}); }
        } else if (xhr.status === 401) {
          // Token expired mid-upload — try silent refresh then retry ONCE
          tryRefreshToken().then((newToken) => {
            if (newToken) {
              doUpload(newToken); // retry with refreshed token
            } else {
              reject(new Error('Sesi habis, silakan login kembali'));
            }
          });
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.message || `Upload gagal (${xhr.status})`));
          } catch {
            reject(new Error(`Upload gagal (${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Upload gagal — periksa koneksi internet'));
      xhr.ontimeout = () => reject(new Error('Upload timeout — file terlalu besar atau koneksi lambat'));
      xhr.timeout = 300000; // 5 min timeout for large files
      xhr.send(formData);
    };

    doUpload(freshToken);
  });
}

export async function renderStoryboard(token: string, data: {
  sessionId: string;
  slides: Array<{ imageId: string; duration: number; transition: string; transitionDuration?: number; subtitle?: string; mediaType?: 'image' | 'video' }>;
  audioId?: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  fps: number;
  subtitleConfig?: {
    enabled: boolean;
    font: string;
    fontSize: 'small' | 'medium' | 'large';
    color: string;
    position: 'top' | 'center' | 'bottom';
    bgStyle: 'semi-transparent' | 'none' | 'blur';
  };
}) {
  return apiFetch(`${API_BASE_URL}/storyboard/render`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
}

export async function getStoryboardStatus(token: string, sessionId: string) {
  return apiFetch(`${API_BASE_URL}/storyboard/status/${sessionId}`, {
    headers: authHeaders(token),
  });
}

export async function downloadStoryboardVideo(_token: string, sessionId: string): Promise<Blob> {
  const Cookies = (await import('js-cookie')).default;
  let token = Cookies.get('_at') || _token;

  let res = await fetch(`${API_BASE_URL}/storyboard/download/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  // Auto-retry on 401 with refreshed token
  if (res.status === 401) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      res = await fetch(`${API_BASE_URL}/storyboard/download/${sessionId}`, {
        headers: { Authorization: `Bearer ${newToken}` },
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Download gagal (${res.status})`);
  }
  return res.blob();
}

export async function uploadStoryboardToStorage(token: string, sessionId: string, slug?: string) {
  return apiFetch(`${API_BASE_URL}/storyboard/upload-to-storage/${sessionId}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ slug }),
  });
}

export async function linkStoryboardToContent(token: string, contentId: string, videoUrl?: string, mp4Url?: string) {
  return apiFetch(`${API_BASE_URL}/storyboard/link`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ contentId, videoUrl, mp4Url }),
  });
}

export async function unlinkStoryboardFromContent(token: string, contentId: string) {
  return apiFetch(`${API_BASE_URL}/storyboard/unlink`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ contentId }),
  });
}

export async function getStoryboardContentList(token: string) {
  return apiFetch(`${API_BASE_URL}/storyboard/content-list`, {
    headers: authHeaders(token),
  });
}

export async function deleteStoryboardAsset(token: string, sessionId: string, fileId: string) {
  return apiFetch(`${API_BASE_URL}/storyboard/delete-asset`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ sessionId, fileId }),
  });
}
