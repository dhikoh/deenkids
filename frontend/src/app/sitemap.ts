import { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://adably.id';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/qna`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/artikel`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/kurikulum`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/tentang-kami`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/tersimpan`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
  ];

  // Dynamic content pages
  let dynamicPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/content/list?limit=200`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      const items = json.data || [];
      dynamicPages = items.map((item: any) => ({
        url: `${baseUrl}/${item.type === 'QNA' ? 'qna' : 'artikel'}/${item.slug}`,
        lastModified: item.publishedAt ? new Date(item.publishedAt) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Silently fail — static pages still work
  }

  return [...staticPages, ...dynamicPages];
}
