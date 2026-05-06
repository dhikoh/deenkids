/**
 * Pembelajaran Detail — Server Component Wrapper
 *
 * Handles:
 * 1. generateMetadata() — dynamic SEO per node (SSR, tidak butuh client)
 * 2. JSON-LD BreadcrumbList + LearningResource schema injection
 * 3. Renders PembelajaranDetailClient (client component) with slug prop
 *
 * Pattern: Server wrapper + Client component memungkinkan SSR metadata
 * tanpa harus mengorbankan interaktivitas (filter, sort, pagination).
 */

import type { Metadata } from "next";
import PembelajaranDetailClient from "./PembelajaranDetailClient";
import { JsonLd, buildBreadcrumbSchema, buildLearningResourceSchema } from "@/components/seo/JsonLd";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://adably.id";

// Helper: flatten nested tree → flat array
function flattenTree(nodes: any[]): any[] {
  const result: any[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children?.length) result.push(...flattenTree(node.children));
  }
  return result;
}

// Helper: fetch & find node by slug (shared between metadata + page)
async function fetchNodeBySlug(slug: string): Promise<any | null> {
  try {
    const res = await fetch(`${API_BASE}/content/tree`, {
      next: { revalidate: 3600 }, // revalidate setiap 1 jam
    });
    if (!res.ok) return null;
    const tree = await res.json();
    const nodes = flattenTree(Array.isArray(tree) ? tree : []);
    return nodes.find((n: any) => n.slug === slug) ?? null;
  } catch {
    return null;
  }
}

// ─── SEO Metadata ─────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const node = await fetchNodeBySlug(slug);

  if (!node) {
    return {
      title: "Pembelajaran Islam Anak | Adably",
      description: "Materi pembelajaran Islam untuk anak berbasis Al-Quran dan Hadits.",
    };
  }

  const canonical = `${SITE_URL}/pembelajaran/${slug}`;
  const description =
    node.description ||
    `Materi pembelajaran ${node.title} untuk anak muslim. Disusun berdasarkan Al-Quran, Hadits, dan literatur ulama.`;

  return {
    title: `${node.title} — Pembelajaran Islam Anak`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${node.title} | Adably`,
      description,
      type: "website",
      url: canonical,
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: `${node.title} — Pembelajaran Islam Anak`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${node.title} | Adably`,
      description,
    },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PembelajaranDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const node = await fetchNodeBySlug(slug);

  const nodeTitle = node?.title ?? "Pembelajaran";
  const description =
    node?.description ??
    `Materi pembelajaran ${nodeTitle} untuk anak muslim.`;
  const pageUrl = `${SITE_URL}/pembelajaran/${slug}`;

  const breadcrumbSchema = buildBreadcrumbSchema([
    { name: "Beranda", url: SITE_URL },
    { name: "Pembelajaran", url: `${SITE_URL}/pembelajaran` },
    { name: nodeTitle, url: pageUrl },
  ]);

  const learningResourceSchema = buildLearningResourceSchema({
    title: `${nodeTitle} — Pembelajaran Islam Anak`,
    description,
    url: pageUrl,
  });

  return (
    <>
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={learningResourceSchema} />
      <PembelajaranDetailClient slug={slug} />
    </>
  );
}
