export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// ── Helper ──
async function apiFetch(url: string, options: RequestInit = {}) {
  const res = await fetch(url, { cache: 'no-store', ...options });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

function authHeaders(token: string): HeadersInit {
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

export async function fetchContentList(params: { sort?: string; limit?: number; age?: string; type?: string; page?: number } = {}) {
  const searchParams = new URLSearchParams();
  if (params.sort) searchParams.append('sort', params.sort);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.age && params.age !== 'Semua') searchParams.append('age', params.age);
  if (params.type) searchParams.append('type', params.type);
  if (params.page) searchParams.append('page', params.page.toString());
  return apiFetch(`${API_BASE_URL}/content/list?${searchParams.toString()}`);
}

export async function fetchContentBySlug(slug: string) {
  return apiFetch(`${API_BASE_URL}/content/${slug}`);
}

export async function fetchContentTags() {
  return apiFetch(`${API_BASE_URL}/content/tags`);
}

export async function fetchDonationSettings() {
  return apiFetch(`${API_BASE_URL}/content/donation`);
}

export async function fetchDonationTestimonials() {
  return apiFetch(`${API_BASE_URL}/content/donation/testimonials`);
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
  return apiFetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
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

export async function fetchMyContents(token: string, status?: string, page?: number) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (page) params.append('page', page.toString());
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

export async function fetchEditorNodes(token: string) {
  return apiFetch(`${API_BASE_URL}/editor/nodes`, {
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

export async function fetchReviewQueue(token: string, page = 1) {
  return apiFetch(`${API_BASE_URL}/admin/review?page=${page}`, {
    headers: authHeaders(token),
  });
}

export async function processReview(id: string, action: 'approve' | 'reject' | 'revision', notes: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/review/${id}/${action}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ notes }),
  });
}

export async function fetchStructure(token: string) {
  return apiFetch(`${API_BASE_URL}/admin/structure`, {
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

export async function assignContentToNode(contentId: string, nodeId: string, token: string) {
  return apiFetch(`${API_BASE_URL}/admin/content/${contentId}/assign-node`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ nodeId }),
  });
}

export async function fetchAllContents(token: string, status?: string, page?: number) {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  if (page) params.append('page', page.toString());
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
export async function fetchFeedbackList(token: string, page = 1) {
  return apiFetch(`${API_BASE_URL}/admin/feedback?page=${page}`, {
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
export async function fetchNotifications(token: string, page = 1) {
  return apiFetch(`${API_BASE_URL}/admin/notifications?page=${page}`, {
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
  return apiFetch(`${API_BASE_URL}/superadmin/settings/ai-toggle`, {
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
  return apiFetch(`${API_BASE_URL}/superadmin/users`, {
    headers: authHeaders(token),
  });
}

export async function updateUserRole(userId: string, role: string, token: string) {
  return apiFetch(`${API_BASE_URL}/superadmin/users/${userId}/role`, {
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
