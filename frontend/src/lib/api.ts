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
