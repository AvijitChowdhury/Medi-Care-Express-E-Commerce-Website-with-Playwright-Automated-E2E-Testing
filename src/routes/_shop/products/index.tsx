import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchCategories } from "@/lib/queries";
import { ProductCard } from "@/components/site/ProductCard";
import { z } from "zod";
import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/fb-pixel";

const search = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
});

export const Route = createFileRoute("/_shop/products/")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "সব পণ্য — মেডিকেয়ার" },
      { name: "description", content: "ভিটামিন, সাপ্লিমেন্ট, স্কিন কেয়ার ও হেয়ার কেয়ার সহ সব পণ্য একসাথে।" },
    ],
  }),
  component: Products,
});

function Products() {
  const { q, cat } = Route.useSearch();
  const { data: cats } = useQuery({ queryKey: ["cats"], queryFn: fetchCategories });
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", q, cat],
    queryFn: () => fetchProducts({ search: q, categorySlug: cat }),
  });

  const lastKey = useRef<string>("");
  useEffect(() => {
    if (isLoading || !products) return;
    const key = `${cat || "all"}|${q || ""}`;
    if (lastKey.current === key) return;
    lastKey.current = key;
    const catName = cat ? cats?.find((c) => c.slug === cat)?.name_bn : undefined;
    trackEvent("ViewContent", {
      content_type: "product_group",
      content_category: catName || (q ? "search" : "all_products"),
      content_name: catName || (q ? `Search: ${q}` : "All Products"),
      search_string: q || undefined,
      content_ids: products.slice(0, 20).map((p: any) => p.id),
      num_items: products.length,
      currency: "BDT",
    });
  }, [products, isLoading, q, cat, cats]);


  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
        {q ? `"${q}" এর জন্য ফলাফল` : cat ? cats?.find((c) => c.slug === cat)?.name_bn ?? "পণ্যসমূহ" : "সব পণ্য"}
      </h1>

      {/* Category filter pills */}
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <Link to="/products" className={`shrink-0 h-9 px-4 rounded-full text-sm border ${!cat ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>
          সব
        </Link>
        {cats?.map((c) => (
          <Link
            key={c.id}
            to="/products"
            search={{ cat: c.slug } as any}
            className={`shrink-0 h-9 px-4 rounded-full text-sm border inline-flex items-center ${cat === c.slug ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}
          >
            {c.name_bn}
          </Link>
        ))}
      </div>

      {isLoading && <div className="mt-12 text-center text-muted-foreground text-sm">লোড হচ্ছে...</div>}

      {!isLoading && products && products.length === 0 && (
        <div className="mt-16 text-center text-muted-foreground">কোনো পণ্য পাওয়া যায়নি।</div>
      )}

      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
        {products?.map((p: any) => <ProductCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}
