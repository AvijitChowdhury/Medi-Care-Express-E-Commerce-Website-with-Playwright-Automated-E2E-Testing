import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_shop/account/reviews")({
  head: () => ({ meta: [{ title: "আমার রিভিউ — মেডিকেয়ার" }] }),
  component: MyReviewsPage,
});

type Item = {
  product_id: string;
  name_bn: string;
  image_url: string | null;
  order_id: string;
  order_date: string;
  existing?: { id: string; rating: number; title: string | null; body_bn: string | null; approved: boolean };
};

function MyReviewsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({ rating: 5, title: "", body_bn: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { navigate({ to: "/login" }); return; }
    const { data: orders } = await supabase
      .from("orders")
      .select("id, created_at, status, order_items(product_id, name_bn, image_url)")
      .eq("user_id", u.user.id)
      .in("status", ["confirmed", "processing", "shipped", "delivered"])
      .order("created_at", { ascending: false });

    const seen = new Set<string>();
    const flat: Item[] = [];
    (orders ?? []).forEach((o: any) => {
      (o.order_items ?? []).forEach((it: any) => {
        if (!it.product_id || seen.has(it.product_id)) return;
        seen.add(it.product_id);
        flat.push({
          product_id: it.product_id,
          name_bn: it.name_bn,
          image_url: it.image_url,
          order_id: o.id,
          order_date: o.created_at,
        });
      });
    });

    const ids = flat.map((f) => f.product_id);
    if (ids.length) {
      const { data: rev } = await supabase.from("reviews").select("*").eq("user_id", u.user.id).in("product_id", ids);
      (rev ?? []).forEach((r: any) => {
        const m = flat.find((f) => f.product_id === r.product_id);
        if (m) m.existing = { id: r.id, rating: r.rating, title: r.title, body_bn: r.body_bn, approved: r.approved };
      });
    }
    setItems(flat);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const open = (it: Item) => {
    setEditing(it);
    setForm({ rating: it.existing?.rating ?? 5, title: it.existing?.title ?? "", body_bn: it.existing?.body_bn ?? "" });
  };

  const submit = async () => {
    if (!editing) return;
    if (!form.body_bn.trim()) { toast.error("আপনার মতামত লিখুন"); return; }
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", u.user!.id).maybeSingle();
    const payload = {
      product_id: editing.product_id,
      user_id: u.user!.id,
      order_id: editing.order_id,
      author_name: prof?.full_name || u.user!.email || "Customer",
      rating: form.rating,
      title: form.title.trim() || null,
      body_bn: form.body_bn.trim(),
      approved: false,
    };
    const q = editing.existing
      ? supabase.from("reviews").update(payload).eq("id", editing.existing.id)
      : supabase.from("reviews").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("রিভিউ জমা হয়েছে। অ্যাডমিন অনুমোদনের পর প্রকাশ পাবে।");
    setEditing(null); load();
  };

  if (loading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">লোড হচ্ছে...</div>;

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">আমার রিভিউ</h1>
          <p className="mt-1 text-sm text-muted-foreground">আপনার কেনা পণ্যগুলোতে রিভিউ দিন।</p>
        </div>
        <Link to="/account" className="text-sm text-primary hover:underline">← অ্যাকাউন্টে ফিরুন</Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 bg-card border border-border rounded-2xl p-10 text-center text-sm text-muted-foreground">
          রিভিউ দেওয়ার মতো কোনো পণ্য নেই। আগে কেনাকাটা করুন। <Link to="/products" className="text-primary hover:underline">পণ্য দেখুন</Link>
        </div>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.product_id} className="bg-card border border-border rounded-xl p-4 flex flex-col">
              <div className="flex gap-3">
                {it.image_url && <img src={it.image_url} alt="" className="h-16 w-16 rounded object-cover bg-secondary shrink-0" />}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium line-clamp-2">{it.name_bn}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(it.order_date).toLocaleDateString("bn-BD")}</div>
                </div>
              </div>
              {it.existing ? (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < it.existing!.rating ? "fill-current" : "opacity-30"}`} />)}
                    {it.existing.approved ? <Check className="h-3.5 w-3.5 text-emerald-600 ml-1" /> : <span className="text-[10px] text-muted-foreground ml-1">অনুমোদনের অপেক্ষায়</span>}
                  </div>
                  <button onClick={() => open(it)} className="text-xs px-3 h-8 rounded-md border border-border hover:bg-muted">সম্পাদনা</button>
                </div>
              ) : (
                <button onClick={() => open(it)} className="mt-3 h-9 rounded-md bg-primary text-primary-foreground text-xs font-medium">
                  রিভিউ লিখুন
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background rounded-lg w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">{editing.name_bn}</h2>
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
              <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[100px]" value={form.body_bn} onChange={(e) => setForm({ ...form, body_bn: e.target.value })} maxLength={1000} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="h-10 px-4 rounded-md border border-border text-sm">বাতিল</button>
              <button onClick={submit} disabled={saving} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm disabled:opacity-60">
                {saving ? "জমা হচ্ছে..." : "জমা দিন"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
