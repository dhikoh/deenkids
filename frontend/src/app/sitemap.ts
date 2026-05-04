import { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://adably.id';

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/qna`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/artikel`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/kisah`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/pembelajaran`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${baseUrl}/tentang-kami`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/search`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/tersimpan`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.4 },
  ];

  // Dynamic content pages
  let dynamicPages: MetadataRoute.Sitemap = [];
  try {
    const res = await fetch(`${API_BASE}/content/list?limit=500`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const json = await res.json();
      const items: any[] = json.data || [];
      dynamicPages = items
        .filter((item: any) => item.slug && item.type)
        .map((item: any) => {
          let url = `${baseUrl}/artikel/${item.slug}`;
          if (item.type === 'QNA') url = `${baseUrl}/qna/${item.slug}`;
          else if (item.type === 'KISAH') {
            // Kisah URL needs nodeSlug — fetch via /content/:slug if needed,
            // but for sitemap we use a simplified path: /kisah/[nodeSlug]/[slug]
            // We can approximate by using node info if available
            const nodeSlug = item.node?.slug || 'kisah';
            url = `${baseUrl}/kisah/${nodeSlug}/${item.slug}`;
          } else if (item.type === 'PEMBELAJARAN') {
            url = `${baseUrl}/pembelajaran/${item.slug}`;
          }
          return {
            url,
            lastModified: item.publishedAt ? new Date(item.publishedAt) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: item.type === 'KISAH' ? 0.8 : 0.7,
          };
        });
    }
  } catch {
    // Silently fail — static pages still work
  }

  return [...staticPages, ...dynamicPages];
}
