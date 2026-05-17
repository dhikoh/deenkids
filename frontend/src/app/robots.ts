import { MetadataRoute } from 'next';

/**
 * robots.txt — SEO + AI Crawler Configuration
 *
 * Mengizinkan semua crawler (termasuk AI) mengakses konten publik.
 * AI crawlers (GPTBot, PerplexityBot, dll) secara eksplisit di-allow
 * agar konten Adably bisa dikutip oleh AI search engines.
 */
export default function robots(): MetadataRoute.Robots {
  const publicDisallow = ['/admin/', '/login', '/api/'];

  return {
    rules: [
      // ─── AI Crawlers (eksplisit allow untuk GEO) ─────────────
      { userAgent: 'GPTBot', allow: '/', disallow: publicDisallow },
      { userAgent: 'ChatGPT-User', allow: '/', disallow: publicDisallow },
      { userAgent: 'PerplexityBot', allow: '/', disallow: publicDisallow },
      { userAgent: 'Claude-Web', allow: '/', disallow: publicDisallow },
      { userAgent: 'Bytespider', allow: '/', disallow: publicDisallow },
      { userAgent: 'Applebot-Extended', allow: '/', disallow: publicDisallow },
      { userAgent: 'cohere-ai', allow: '/', disallow: publicDisallow },

      // ─── General crawlers ────────────────────────────────────
      { userAgent: '*', allow: '/', disallow: publicDisallow },
    ],
    sitemap: 'https://adably.id/sitemap.xml',
  };
}
