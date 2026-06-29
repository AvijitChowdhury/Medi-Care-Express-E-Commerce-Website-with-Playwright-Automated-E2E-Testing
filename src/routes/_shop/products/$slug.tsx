import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchProductBySlug } from "@/lib/queries";
import { img } from "@/lib/images";
import { taka, toBnDigits } from "@/lib/format";
import { useEffect, useRef, useState } from "react";
import { Minus, Plus, ShoppingBag, ShieldCheck, Truck, RotateCcw, Star } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackEvent } from "@/lib/fb-pixel";

export const Route = createFileRoute("/_shop/products/$slug")({
  component: ProductDetail,
});


function ProductDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => fetchProductBySlug(slug),
  });

  const firedRef = useRef<string | null>(null);
  useEffect(() => {
    const p = data?.product;
    if (!p || firedRef.current === p.id) return;
    firedRef.current = p.id;
    trackEvent("ViewContent", {
      content_ids: [p.id],
      content_name: p.name_bn,
      content_type: "product",
      content_category: (p as any).categories?.name_bn,
      value: Number(p.price),
      currency: "BDT",
    });
  }, [data]);

  if (isLoading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!data) return <div className="container mx-auto px-4 py-20 text-center">পণ্য পাওয়া যায়নি।</div>;

  const { product: p, reviews } = data;
  const image = img(p.images?.[0]);
  const discount = p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
    ? Math.round(((Number(p.compare_at_price) - Number(p.price)) / Number(p.compare_at_price)) * 100)
    : 0;

  const handleAdd = (buyNow = false) => {
    add({ productId: p.id, slug: p.slug, name_bn: p.name_bn, price: Number(p.price), image }, qty);
    if (buyNow) navigate({ to: "/checkout" });
    else toast.success("কার্টে যোগ হয়েছে");
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <nav className="text-xs text-muted-foreground mb-6">
        <Link to="/" className="hover:text-primary">হোম</Link> / <Link to="/products" className="hover:text-primary">পণ্য</Link> / <span>{p.name_bn}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        <div className="bg-secondary rounded-2xl overflow-hidden">
          <img src={image} alt={p.name_bn} className="w-full aspect-square object-cover" />
        </div>

        <div>
          {(p as any).categories?.name_bn && (
            <div className="text-xs uppercase tracking-wider text-primary">{(p as any).categories.name_bn}</div>
          )}
          <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">{p.name_bn}</h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-primary">{taka(p.price)}</span>
            {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
              <>
                <span className="text-base text-muted-foreground line-through">{taka(p.compare_at_price)}</span>
                <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full font-medium">
                  -{toBnDigits(discount)}% ছাড়
                </span>
              </>
            )}
          </div>

          <div className="mt-2 text-xs">
            {p.stock > 0 ? (
              <span className="text-primary">✓ স্টকে আছে ({toBnDigits(p.stock)} টি)</span>
            ) : (
              <span className="text-destructive">স্টক শেষ</span>
            )}
          </div>

          <p className="mt-6 text-sm leading-relaxed text-foreground/80">{p.description_bn}</p>

          <div className="mt-8 flex items-center gap-4">
            <div className="flex items-center border border-border rounded-md">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-11 w-11 inline-flex items-center justify-center hover:bg-muted">
                <Minus className="h-4 w-4" />
              </button>
              <div className="h-11 w-12 inline-flex items-center justify-center text-sm font-medium">{toBnDigits(qty)}</div>
              <button onClick={() => setQty(qty + 1)} className="h-11 w-11 inline-flex items-center justify-center hover:bg-muted">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => handleAdd(false)} disabled={p.stock === 0} className="h-12 rounded-md border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50">
              <ShoppingBag className="h-4 w-4" /> কার্টে যোগ
            </button>
            <button onClick={() => handleAdd(true)} disabled={p.stock === 0} className="h-12 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium disabled:opacity-50">
              এখনই কিনুন
            </button>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 text-xs">
            <Feature Icon={Truck} t="দ্রুত ডেলিভারি" />
            <Feature Icon={ShieldCheck} t="অরিজিনাল গ্যারান্টি" />
            <Feature Icon={RotateCcw} t="৭ দিন রিটার্ন" />
          </div>
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="mt-16">
          <h2 className="text-xl font-semibold tracking-tight">কাস্টমার রিভিউ</h2>
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {reviews.map((r) => (
              <div key={r.id} className="border border-border rounded-2xl p-5">
                <div className="flex gap-0.5 text-gold">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "opacity-30"}`} />)}
                </div>
                <p className="mt-3 text-sm">{r.body_bn}</p>
                <div className="mt-3 text-xs text-muted-foreground">— {r.author_name}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Feature({ Icon, t }: { Icon: any; t: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1 p-3 bg-secondary/50 rounded-lg">
      <Icon className="h-4 w-4 text-primary" />
      <span>{t}</span>
    </div>
  );
}
