export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export async function fetchContentTree() {
  const res = await fetch(`${API_BASE_URL}/content/tree`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch curriculum tree');
  return res.json();
}

export async function fetchContentList(params: { sort?: string; limit?: number; age?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.sort) searchParams.append('sort', params.sort);
  if (params.limit) searchParams.append('limit', params.limit.toString());
  if (params.age && params.age !== 'Semua') searchParams.append('age', params.age);
  
  const res = await fetch(`${API_BASE_URL}/content/list?${searchParams.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch content list');
  return res.json();
}

export async function fetchContentBySlug(slug: string) {
  const res = await fetch(`${API_BASE_URL}/content/${slug}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch content details');
  return res.json();
}

export async function triggerSeed() {
  const res = await fetch(`${API_BASE_URL}/seed`, { method: 'GET' });
  return res.json();
}

export async function login(data: any) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Login failed');
  }
  return res.json();
}

export async function createContent(data: any, token: string) {
  const res = await fetch(`${API_BASE_URL}/editor/content`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to save draft');
  }
  return res.json();
}
