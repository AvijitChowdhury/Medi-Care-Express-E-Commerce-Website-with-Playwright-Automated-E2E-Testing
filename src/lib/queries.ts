import { supabase } from "@/integrations/supabase/client";

export async function fetchHome() {
  const [annRes, catRes, featRes, allRes, bannerRes, revRes] = await Promise.all([
    supabase.from("announcements").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("*").eq("is_featured", true).eq("is_active", true).limit(8),
    supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(12),
    supabase.from("banners").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("reviews").select("*, products(name_bn, slug)").eq("approved", true).order("created_at", { ascending: false }).limit(6),
  ]);
  return {
    announcements: annRes.data ?? [],
    categories: catRes.data ?? [],
    featured: featRes.data ?? [],
    all: allRes.data ?? [],
    banners: bannerRes.data ?? [],
    reviews: revRes.data ?? [],
  };
}

export async function fetchProducts(opts: { categorySlug?: string; search?: string } = {}) {
  let q = supabase.from("products").select("*, categories(name_bn, slug)").eq("is_active", true);
  if (opts.search) q = q.ilike("name_bn", `%${opts.search}%`);
  const { data } = await q.order("created_at", { ascending: false });
  let rows = data ?? [];
  if (opts.categorySlug) {
    rows = rows.filter((r: any) => r.categories?.slug === opts.categorySlug);
  }
  return rows;
}

export async function fetchProductBySlug(slug: string) {
  const { data: p } = await supabase.from("products").select("*, categories(name_bn, slug)").eq("slug", slug).maybeSingle();
  if (!p) return null;
  const { data: reviews } = await supabase.from("reviews").select("*").eq("product_id", p.id).eq("approved", true);
  return { product: p, reviews: reviews ?? [] };
}

export async function fetchCategories() {
  const { data } = await supabase.from("categories").select("*").order("sort_order");
  return data ?? [];
}

export async function fetchAnnouncements() {
  const { data } = await supabase.from("announcements").select("*").eq("is_active", true).order("sort_order");
  return data ?? [];
}
