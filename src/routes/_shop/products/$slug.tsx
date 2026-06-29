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
              <button aria-label="পরিমাণ কমান" onClick={() => setQty(Math.max(1, qty - 1))} className="h-11 w-11 inline-flex items-center justify-center hover:bg-muted">
                <Minus className="h-4 w-4" />
              </button>
              <div className="h-11 w-12 inline-flex items-center justify-center text-sm font-medium">{toBnDigits(qty)}</div>
              <button aria-label="পরিমাণ বাড়ান" onClick={() => setQty(qty + 1)} className="h-11 w-11 inline-flex items-center justify-center hover:bg-muted">
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
      <ReviewsSection productId={p.id} initialReviews={reviews} />
    </div>
  );
}

type ReviewRow = { id: string; author_name: string; rating: number; title?: string | null; body_bn: string | null };

function ReviewsSection({ productId, initialReviews }: { productId: string; initialReviews: ReviewRow[] }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"read" | "write">("read");
  const [user, setUser] = useState<any>(null);
  const [canReview, setCanReview] = useState(false);
  const [existing, setExisting] = useState<ReviewRow | null>(null);
  const [form, setForm] = useState({ rating: 5, title: "", body_bn: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setUser(u.user);
      const { data: ords } = await supabase
        .from("orders")
        .select("id, order_items!inner(product_id)")
        .eq("user_id", u.user.id)
        .eq("order_items.product_id", productId)
        .in("status", ["confirmed", "processing", "shipped", "delivered"])
        .limit(1);
      setCanReview((ords ?? []).length > 0);
      const { data: own } = await supabase
        .from("reviews")
        .select("id, author_name, rating, title, body_bn")
        .eq("user_id", u.user.id)
        .eq("product_id", productId)
        .maybeSingle();
      if (own) {
        setExisting(own as any);
        setForm({ rating: own.rating, title: own.title ?? "", body_bn: own.body_bn ?? "" });
      }
    })();
  }, [productId]);

  const avg = initialReviews.length ? initialReviews.reduce((a, r) => a + r.rating, 0) / initialReviews.length : 0;

  const submit = async () => {
    if (!user) { toast.error("রিভিউ দিতে লগইন করুন"); return; }
    if (!canReview) { toast.error("শুধু কেনা পণ্যে রিভিউ দেওয়া যাবে"); return; }
    if (!form.body_bn.trim()) { toast.error("আপনার মতামত লিখুন"); return; }
    setSaving(true);
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    const payload = {
      product_id: productId,
      user_id: user.id,
      author_name: prof?.full_name || user.email || "Customer",
      rating: form.rating,
      title: form.title.trim() || null,
      body_bn: form.body_bn.trim(),
      approved: false,
    };
    const q = existing
      ? supabase.from("reviews").update(payload).eq("id", existing.id)
      : supabase.from("reviews").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("রিভিউ জমা হয়েছে। অ্যাডমিন অনুমোদনের পর প্রকাশ পাবে।");
    qc.invalidateQueries({ queryKey: ["product"] });
  };

  return (
    <section className="mt-16">
      <div className="flex items-center gap-6 border-b border-border">
        <button onClick={() => setTab("read")} className={`pb-3 text-sm font-medium border-b-2 ${tab === "read" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          রিভিউ ({toBnDigits(initialReviews.length)})
        </button>
        <button onClick={() => setTab("write")} className={`pb-3 text-sm font-medium border-b-2 ${tab === "write" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
          রিভিউ লিখুন
        </button>
        {initialReviews.length > 0 && (
          <div className="ml-auto pb-3 flex items-center gap-2 text-sm">
            <div className="flex gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(avg) ? "fill-current" : "opacity-30"}`} />)}
            </div>
            <span className="font-medium">{avg.toFixed(1)}</span>
          </div>
        )}
      </div>

      {tab === "read" ? (
        initialReviews.length === 0 ? (
          <div className="mt-8 text-center text-sm text-muted-foreground py-12">এখনো কোনো রিভিউ নেই। প্রথম রিভিউটি আপনিই দিন।</div>
        ) : (
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {initialReviews.map((r) => (
              <div key={r.id} className="border border-border rounded-2xl p-5">
                <div className="flex gap-0.5 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "opacity-30"}`} />)}
                </div>
                {r.title && <div className="mt-2 text-sm font-semibold">{r.title}</div>}
                <p className="mt-2 text-sm">{r.body_bn}</p>
                <div className="mt-3 text-xs text-muted-foreground">— {r.author_name}</div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="mt-6 max-w-xl">
          {!user ? (
            <div className="text-sm border border-border rounded-xl p-6 bg-secondary/30">
              রিভিউ দিতে অনুগ্রহ করে <Link to="/login" className="text-primary underline">লগইন</Link> করুন।
            </div>
          ) : !canReview ? (
            <div className="text-sm border border-border rounded-xl p-6 bg-secondary/30">
              এই পণ্যটি কেনার পর রিভিউ দিতে পারবেন।
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">রেটিং</label>
                <div className="flex gap-1">
                  {[1,2,3,4,5].map((n) => (
                    <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })}>
                      <Star className={`h-7 w-7 ${n <= form.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">শিরোনাম (ঐচ্ছিক)</label>
                <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={120} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1.5">আপনার মতামত *</label>
                <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]" value={form.body_bn} onChange={(e) => setForm({ ...form, body_bn: e.target.value })} maxLength={1000} />
              </div>
              <button onClick={submit} disabled={saving} className="h-11 px-6 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
                {saving ? "জমা হচ্ছে..." : existing ? "আপডেট করুন" : "জমা দিন"}
              </button>
              {existing && <p className="text-xs text-muted-foreground">আপনার আগের রিভিউ সম্পাদনা হচ্ছে।</p>}
            </div>
          )}
        </div>
      )}
    </section>
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
