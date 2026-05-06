import { MetadataRoute } from 'next';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adably.id';

// Helper: flatten nested tree to flat array
function flattenTree(nodes: any[]): any[] {
  const result: any[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children?.length) result.push(...flattenTree(node.children));
  }
  return result;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ─── Static pages ──────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,                           lastModified: new Date(), changeFrequency: 'daily',   priority: 1.0 },
    { url: `${SITE_URL}/qna`,                  lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/artikel`,              lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/kisah`,                lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${SITE_URL}/pembelajaran`,         lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 },
    { url: `${SITE_URL}/tentang-kami`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/search`,               lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${SITE_URL}/kebijakan-privasi`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/ketentuan-layanan`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/penghapusan-data`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ];

  let dynamicContentPages: MetadataRoute.Sitemap = [];
  let pembelajaranNodePages: MetadataRoute.Sitemap = [];

  // ─── Dynamic content pages (QNA, ARTIKEL, KISAH) ──────────────────────────
  // NOTE: PEMBELAJARAN konten individual → /artikel/[slug] (rendered oleh artikel page)
  // Halaman /pembelajaran/[slug] = halaman NODE (daftar konten per kategori kurikulum)
  try {
    const res = await fetch(`${API_BASE}/content/list?limit=500`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const json = await res.json();
      const items: any[] = json.data || [];
      dynamicContentPages = items
        .filter((item: any) => item.slug && item.type)
        .map((item: any) => {
          let url = `${SITE_URL}/artikel/${item.slug}`;
          if (item.type === 'QNA') {
            url = `${SITE_URL}/qna/${item.slug}`;
          } else if (item.type === 'KISAH') {
            const nodeSlug = item.node?.slug || 'kisah';
            url = `${SITE_URL}/kisah/${nodeSlug}/${item.slug}`;
          }
          // PEMBELAJARAN & ARTICLE → /artikel/[slug] (keduanya render di halaman yang sama)
          return {
            url,
            lastModified: item.publishedAt ? new Date(item.publishedAt) : new Date(),
            changeFrequency: 'weekly' as const,
            priority: item.type === 'KISAH' ? 0.8 : item.type === 'QNA' ? 0.85 : 0.7,
          };
        });
    }
  } catch {
    // Silently fail — static pages still served
  }

  // ─── Pembelajaran node-based pages (/pembelajaran/[nodeSlug]) ──────────────
  // Ini adalah halaman DAFTAR konten per kategori kurikulum (bukan konten individual)
  try {
    const res = await fetch(`${API_BASE}/content/tree`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const tree = await res.json();
      const nodes = flattenTree(Array.isArray(tree) ? tree : []);
      pembelajaranNodePages = nodes
        .filter((n: any) => n.slug && n.isActive !== false)
        .map((n: any) => ({
          url: `${SITE_URL}/pembelajaran/${n.slug}`,
          lastModified: new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.75,
        }));
    }
  } catch {
    // Silently fail
  }

  return [...staticPages, ...dynamicContentPages, ...pembelajaranNodePages];
}
