/**
 * JsonLd — Reusable JSON-LD Structured Data component for Next.js App Router.
 * Renders a <script type="application/ld+json"> tag for Google rich results.
 * Works in server components (no "use client" needed).
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://adably.id';
const SITE_NAME = 'Adably';
const SITE_LOGO = `${SITE_URL}/og-image.png`;

// ─── Component ────────────────────────────────────────────────────────────────

export function JsonLd({ schema }: { schema: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ─── Schema Builders ──────────────────────────────────────────────────────────

/** Article schema — untuk konten ARTIKEL dan PEMBELAJARAN */
export function buildArticleSchema(opts: {
  title: string;
  description: string;
  imageUrl?: string;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  authorName?: string;
  url: string;
  category?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description || opts.title,
    image: opts.imageUrl || SITE_LOGO,
    author: {
      '@type': 'Person',
      name: opts.authorName || SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: SITE_LOGO },
    },
    datePublished: opts.publishedAt ? new Date(opts.publishedAt).toISOString() : undefined,
    dateModified: opts.updatedAt ? new Date(opts.updatedAt).toISOString() : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': opts.url },
    url: opts.url,
    ...(opts.category ? { articleSection: opts.category } : {}),
  };
}

/** FAQPage schema — untuk konten QNA (memungkinkan rich snippet FAQ di Google) */
export function buildFaqPageSchema(opts: {
  question: string;
  answer: string;
  url: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: opts.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: opts.answer,
        },
      },
    ],
    url: opts.url,
  };
}

/** BreadcrumbList schema — navigasi breadcrumb di SERP */
export function buildBreadcrumbSchema(
  items: { name: string; url: string }[]
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

/** LearningResource schema — untuk halaman pembelajaran (Google Education) */
export function buildLearningResourceSchema(opts: {
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  publishedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  ageGroups?: string[];
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: opts.title,
    description: opts.description || opts.title,
    image: opts.imageUrl || SITE_LOGO,
    url: opts.url,
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    datePublished: opts.publishedAt ? new Date(opts.publishedAt).toISOString() : undefined,
    dateModified: opts.updatedAt ? new Date(opts.updatedAt).toISOString() : undefined,
    learningResourceType: 'lesson',
    ...(opts.ageGroups && opts.ageGroups.length > 0
      ? { typicalAgeRange: opts.ageGroups.join(', ') }
      : {}),
  };
}

/** Organization schema — untuk layout root (Google Knowledge Panel) */
export function buildOrganizationSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: SITE_LOGO },
    description: 'Platform edukasi parenting Islami. Konten disusun berdasarkan referensi Al-Quran, Hadits, dan literatur ulama.',
    sameAs: [],
  };
}

/** WebSite schema + SearchAction — untuk layout root */
export function buildWebSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}
