import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://pharmacy-express-now.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

async function fetchPublicSlugs(): Promise<{ products: { slug: string; updated_at?: string }[]; categories: { slug: string }[] }> {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { products: [], categories: [] };
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    const [pRes, cRes] = await Promise.all([
      fetch(`${url}/rest/v1/products?select=slug,updated_at&is_active=eq.true`, { headers }),
      fetch(`${url}/rest/v1/categories?select=slug`, { headers }),
    ]);
    const products = pRes.ok ? await pRes.json() : [];
    const categories = cRes.ok ? await cRes.json() : [];
    return { products, categories };
  } catch {
    return { products: [], categories: [] };
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { products, categories } = await fetchPublicSlugs();

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/products", changefreq: "daily", priority: "0.9" },
          { path: "/about", changefreq: "monthly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.5" },
          { path: "/track", changefreq: "monthly", priority: "0.4" },
          { path: "/login", changefreq: "yearly", priority: "0.2" },
          { path: "/policy/refund", changefreq: "yearly", priority: "0.3" },
          ...products.map((p) => ({
            path: `/products/${p.slug}`,
            lastmod: p.updated_at?.slice(0, 10),
            changefreq: "weekly" as const,
            priority: "0.8",
          })),
          ...categories.map((c) => ({
            path: `/products?cat=${encodeURIComponent(c.slug)}`,
            changefreq: "weekly" as const,
            priority: "0.6",
          })),
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
