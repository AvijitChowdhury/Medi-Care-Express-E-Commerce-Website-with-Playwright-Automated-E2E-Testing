import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, X, Search } from "lucide-react";
import { img } from "@/lib/images";

export const Route = createFileRoute("/admin/products")({
  component: Products,
});

type Variant = { id?: string; name_bn: string; attributes: Record<string, string>; sku: string; price: string; stock: string; image: string };
type Form = {
  id?: string;
  name_bn: string; slug: string;
  short_description_bn: string; description_bn: string;
  price: string; compare_at_price: string; stock: string;
  category_id: string; brand_id: string;
  image: string; gallery: string;
  tags: string;
  product_type: "simple" | "variable";
  shipping_cost: string;
  related_product_ids: string[];
  is_active: boolean; is_featured: boolean;
  variants: Variant[];
};

const empty: Form = {
  name_bn: "", slug: "", short_description_bn: "", description_bn: "",
  price: "", compare_at_price: "", stock: "10",
  category_id: "", brand_id: "",
  image: "", gallery: "", tags: "",
  product_type: "simple", shipping_cost: "",
  related_product_ids: [],
  is_active: true, is_featured: false,
  variants: [],
};

async function fetchAll() {
  const [p, c, b] = await Promise.all([
    supabase.from("products").select("*, categories(name_bn), brands(name_bn)").order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("brands").select("*").order("name_bn"),
  ]);
  return { products: p.data ?? [], categories: c.data ?? [], brands: b.data ?? [] };
}

function Products() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "products"], queryFn: fetchAll });
  const [editing, setEditing] = useState<Form | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };

  const startEdit = async (p: any) => {
    const { data: vs } = await supabase.from("product_variants").select("*").eq("product_id", p.id).order("sort_order");
    setEditing({
      id: p.id, name_bn: p.name_bn, slug: p.slug,
      short_description_bn: p.short_description_bn ?? "", description_bn: p.description_bn ?? "",
      price: String(p.price), compare_at_price: p.compare_at_price ? String(p.compare_at_price) : "",
      stock: String(p.stock), category_id: p.category_id ?? "", brand_id: p.brand_id ?? "",
      image: p.images?.[0] ?? "", gallery: (p.gallery ?? []).join(", "),
      tags: (p.tags ?? []).join(", "),
      product_type: p.product_type === "variable" ? "variable" : "simple",
      shipping_cost: p.shipping_cost != null ? String(p.shipping_cost) : "",
      related_product_ids: p.related_product_ids ?? [],
      is_active: p.is_active, is_featured: p.is_featured,
      variants: (vs ?? []).map((v: any) => ({
        id: v.id, name_bn: v.name_bn,
        attributes: v.attributes ?? {},
        sku: v.sku ?? "", price: String(v.price), stock: String(v.stock), image: v.image ?? "",
      })),
    });
  };

  const save = async () => {
    if (!editing) return;
    const payload = {
      name_bn: editing.name_bn,
      slug: editing.slug || editing.name_bn.trim().toLowerCase().replace(/\s+/g, "-"),
      short_description_bn: editing.short_description_bn || null,
      description_bn: editing.description_bn || null,
      price: Number(editing.price) || 0,
      compare_at_price: editing.compare_at_price ? Number(editing.compare_at_price) : null,
      stock: Number(editing.stock) || 0,
      category_id: editing.category_id || null,
      brand_id: editing.brand_id || null,
      images: editing.image ? [editing.image] : [],
      gallery: editing.gallery.split(",").map((s) => s.trim()).filter(Boolean),
      tags: editing.tags.split(",").map((s) => s.trim()).filter(Boolean),
      product_type: editing.product_type,
      shipping_cost: editing.shipping_cost ? Number(editing.shipping_cost) : null,
      related_product_ids: editing.related_product_ids,
      is_active: editing.is_active, is_featured: editing.is_featured,
    };
    const res = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id).select().single()
      : await supabase.from("products").insert(payload).select().single();
    if (res.error || !res.data) { toast.error(res.error?.message || "ত্রুটি"); return; }
    const productId = res.data.id;

    // sync variants
    if (editing.product_type === "variable") {
      await supabase.from("product_variants").delete().eq("product_id", productId);
      if (editing.variants.length > 0) {
        const rows = editing.variants.map((v, i) => ({
          product_id: productId, name_bn: v.name_bn || "Variant " + (i + 1),
          attributes: v.attributes ?? {}, sku: v.sku || null,
          price: Number(v.price) || 0, stock: Number(v.stock) || 0,
          image: v.image || null, sort_order: i,
        }));
        const { error: ve } = await supabase.from("product_variants").insert(rows);
        if (ve) { toast.error("ভেরিয়েন্ট সেভ ত্রুটি: " + ve.message); return; }
      }
    } else {
      await supabase.from("product_variants").delete().eq("product_id", productId);
    }

    toast.success("সংরক্ষণ হয়েছে");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  };

  const del = async (id: string) => {
    if (!confirm("পণ্য মুছবেন?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("মুছে ফেলা হয়েছে");
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  };
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${toBnDigits(selected.size)}টি পণ্য মুছবেন?`)) return;
    const { error } = await supabase.from("products").delete().in("id", Array.from(selected));
    if (error) { toast.error(error.message); return; }
    toast.success("মুছে ফেলা হয়েছে"); setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  };
  const toggleFeatured = async (id: string, v: boolean) => {
    await supabase.from("products").update({ is_featured: !v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">পণ্য ম্যানেজমেন্ট</h1>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <button onClick={bulkDelete} className="h-10 px-4 rounded-md bg-destructive text-destructive-foreground text-sm inline-flex items-center gap-2">
              <Trash2 className="h-4 w-4" /> {toBnDigits(selected.size)}টি মুছুন
            </button>
          )}
          <button onClick={() => setEditing(empty)} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> নতুন পণ্য
          </button>
        </div>
      </div>

      <div className="bg-background border border-border rounded-xl overflow-hidden">
        {isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div> : (
          <div className="divide-y divide-border">
            {data?.products.map((p: any) => (
              <div key={p.id} className={`flex items-center gap-3 p-3 md:p-4 ${selected.has(p.id) ? "bg-primary/5" : ""}`}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 shrink-0" />
                <img src={img(p.images?.[0])} alt="" className="h-14 w-14 rounded-md object-cover bg-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate flex items-center gap-2">
                    {p.name_bn}
                    {p.product_type === "variable" && <span className="text-[9px] uppercase tracking-wider bg-blue-500/10 text-blue-600 px-1.5 rounded">Variable</span>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {p.categories?.name_bn ?? "—"}
                    {p.brands?.name_bn && <> • {p.brands.name_bn}</>}
                    {" • স্টক "}{toBnDigits(p.stock)}
                  </div>
                </div>
                <div className="text-sm font-semibold text-primary shrink-0">{taka(p.price)}</div>
                <button onClick={() => toggleFeatured(p.id, p.is_featured)} className={`p-2 rounded ${p.is_featured ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}>
                  <Star className={`h-4 w-4 ${p.is_featured ? "fill-current" : ""}`} />
                </button>
                <button onClick={() => startEdit(p)} className="p-2 hover:bg-muted rounded"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(p.id)} className="p-2 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ProductModal
          form={editing} setForm={setEditing as any}
          categories={data?.categories ?? []} brands={data?.brands ?? []}
          allProducts={data?.products ?? []}
          onClose={() => setEditing(null)} onSave={save}
          onBrandCreated={() => qc.invalidateQueries({ queryKey: ["admin", "products"] })}
        />
      )}
    </div>
  );
}

function ProductModal({ form, setForm, categories, brands, allProducts, onClose, onSave, onBrandCreated }: any) {
  const [tab, setTab] = useState<"general" | "media" | "data" | "variants" | "related">("general");
  const [newBrand, setNewBrand] = useState("");
  const [relSearch, setRelSearch] = useState("");

  const addBrand = async () => {
    if (!newBrand.trim()) return;
    const slug = newBrand.trim().toLowerCase().replace(/\s+/g, "-");
    const { data, error } = await supabase.from("brands").insert({ name_bn: newBrand.trim(), slug }).select().single();
    if (error || !data) { toast.error(error?.message || "ত্রুটি"); return; }
    setForm({ ...form, brand_id: data.id });
    setNewBrand("");
    onBrandCreated();
  };

  const addVariant = () => setForm({ ...form, variants: [...form.variants, { name_bn: "", attributes: {}, sku: "", price: form.price || "0", stock: "0", image: "" }] });
  const updateVariant = (i: number, patch: Partial<Variant>) =>
    setForm({ ...form, variants: form.variants.map((v: Variant, idx: number) => idx === i ? { ...v, ...patch } : v) });
  const removeVariant = (i: number) => setForm({ ...form, variants: form.variants.filter((_: any, idx: number) => idx !== i) });

  const relatedCandidates = allProducts
    .filter((p: any) => p.id !== form.id && !form.related_product_ids.includes(p.id))
    .filter((p: any) => !relSearch || p.name_bn.toLowerCase().includes(relSearch.toLowerCase()))
    .slice(0, 8);
  const relatedSelected = allProducts.filter((p: any) => form.related_product_ids.includes(p.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-background w-full md:max-w-3xl md:rounded-xl max-h-[95vh] flex flex-col">
        <div className="border-b border-border p-4 flex items-center justify-between">
          <h2 className="font-semibold">{form.id ? "পণ্য সম্পাদনা" : "নতুন পণ্য"}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b border-border px-2 flex gap-1 overflow-x-auto">
          {[
            ["general", "সাধারণ"], ["media", "মিডিয়া"], ["data", "ডেটা"],
            ["variants", "ভেরিয়েন্ট"], ["related", "সম্পর্কিত"],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as any)} className={`px-4 h-10 text-sm whitespace-nowrap border-b-2 ${tab === k ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground"}`}>{l}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "general" && (
            <div className="grid md:grid-cols-2 gap-4">
              <F label="পণ্যের নাম *" full><input className={inp} value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} /></F>
              <F label="স্লাগ" full><input className={inp} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="auto" /></F>
              <F label="সংক্ষিপ্ত বিবরণ" full>
                <textarea className={inp + " min-h-[70px] py-2"} value={form.short_description_bn} onChange={(e) => setForm({ ...form, short_description_bn: e.target.value })} placeholder="ছোট সারাংশ যা প্রোডাক্ট কার্ডে দেখা যাবে" />
              </F>
              <F label="পূর্ণ বিবরণ" full>
                <textarea className={inp + " min-h-[140px] py-2"} value={form.description_bn} onChange={(e) => setForm({ ...form, description_bn: e.target.value })} placeholder="বিস্তারিত বিবরণ" />
              </F>
              <F label="ক্যাটাগরি">
                <select className={inp} value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">—</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
                </select>
              </F>
              <F label="ব্র্যান্ড">
                <div className="flex gap-2">
                  <select className={inp} value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}>
                    <option value="">—</option>
                    {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name_bn}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 mt-2">
                  <input className={inp} placeholder="নতুন ব্র্যান্ড নাম" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} />
                  <button type="button" onClick={addBrand} className="h-10 px-3 rounded-md border border-border text-xs whitespace-nowrap">যোগ করুন</button>
                </div>
              </F>
              <F label="ট্যাগ (কমা দিয়ে আলাদা)" full>
                <input className={inp} value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="ভিটামিন, স্বাস্থ্য, সাপ্লিমেন্ট" />
              </F>
              <div className="md:col-span-2 flex gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> অ্যাক্টিভ</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} /> ফিচারড</label>
              </div>
            </div>
          )}

          {tab === "media" && (
            <div className="space-y-4">
              <F label="প্রধান ছবি (URL বা কী)" full>
                <input className={inp} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="image-key বা https://..." />
                {form.image && <img src={img(form.image)} alt="" className="mt-2 h-32 w-32 rounded-md object-cover bg-secondary border border-border" />}
              </F>
              <F label="গ্যালারি ছবি (কমা দিয়ে আলাদা)" full>
                <textarea className={inp + " min-h-[80px] py-2"} value={form.gallery} onChange={(e) => setForm({ ...form, gallery: e.target.value })} placeholder="image-key1, image-key2, image-key3" />
                <div className="mt-2 flex gap-2 flex-wrap">
                  {form.gallery.split(",").map((s: string) => s.trim()).filter(Boolean).map((k: string, i: number) => (
                    <img key={i} src={img(k)} alt="" className="h-20 w-20 rounded-md object-cover bg-secondary border border-border" />
                  ))}
                </div>
              </F>
            </div>
          )}

          {tab === "data" && (
            <div className="grid md:grid-cols-2 gap-4">
              <F label="পণ্যের ধরন" full>
                <div className="flex gap-3">
                  {(["simple", "variable"] as const).map((t) => (
                    <label key={t} className={`flex-1 h-12 px-4 rounded-md border cursor-pointer flex items-center gap-2 text-sm ${form.product_type === t ? "border-primary bg-primary/5 text-primary" : "border-border"}`}>
                      <input type="radio" checked={form.product_type === t} onChange={() => setForm({ ...form, product_type: t })} className="sr-only" />
                      {t === "simple" ? "সিম্পল পণ্য" : "ভেরিয়েবল পণ্য"}
                    </label>
                  ))}
                </div>
              </F>
              <F label="দাম *"><input type="number" className={inp} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></F>
              <F label="তুলনামূলক দাম"><input type="number" className={inp} value={form.compare_at_price} onChange={(e) => setForm({ ...form, compare_at_price: e.target.value })} /></F>
              <F label="স্টক"><input type="number" className={inp} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></F>
              <F label="কাস্টম শিপিং চার্জ (ফাঁকা = ডিফল্ট)"><input type="number" className={inp} value={form.shipping_cost} onChange={(e) => setForm({ ...form, shipping_cost: e.target.value })} placeholder="ঐচ্ছিক" /></F>
            </div>
          )}

          {tab === "variants" && (
            <div className="space-y-3">
              {form.product_type !== "variable" && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-md">
                  ভেরিয়েন্ট ব্যবহার করতে "ডেটা" ট্যাবে গিয়ে পণ্যের ধরন "ভেরিয়েবল" নির্বাচন করুন।
                </div>
              )}
              {form.variants.map((v: Variant, i: number) => (
                <div key={i} className="border border-border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold">ভেরিয়েন্ট #{toBnDigits(i + 1)}</span>
                    <button onClick={() => removeVariant(i)} className="text-destructive p-1"><X className="h-4 w-4" /></button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-2">
                    <input className={inp} placeholder="ভেরিয়েন্ট নাম (যেমন: ছোট/লাল)" value={v.name_bn} onChange={(e) => updateVariant(i, { name_bn: e.target.value })} />
                    <input className={inp} placeholder="SKU" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} />
                    <input type="number" className={inp} placeholder="দাম" value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} />
                    <input type="number" className={inp} placeholder="স্টক" value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} />
                    <input className={inp + " md:col-span-2"} placeholder="ছবি (URL/কী)" value={v.image} onChange={(e) => updateVariant(i, { image: e.target.value })} />
                    <input className={inp + " md:col-span-2"} placeholder='অ্যাট্রিবিউট JSON, যেমন: {"size":"L","color":"Red"}' value={JSON.stringify(v.attributes)} onChange={(e) => { try { updateVariant(i, { attributes: JSON.parse(e.target.value || "{}") }); } catch {} }} />
                  </div>
                </div>
              ))}
              <button onClick={addVariant} disabled={form.product_type !== "variable"} className="w-full h-11 rounded-md border-2 border-dashed border-border text-sm hover:bg-muted disabled:opacity-50 inline-flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> ভেরিয়েন্ট যোগ করুন
              </button>
            </div>
          )}

          {tab === "related" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input className={inp + " pl-9"} placeholder="পণ্য খুঁজুন..." value={relSearch} onChange={(e) => setRelSearch(e.target.value)} />
              </div>
              {relSearch && (
                <div className="border border-border rounded-md divide-y divide-border">
                  {relatedCandidates.map((p: any) => (
                    <button key={p.id} onClick={() => setForm({ ...form, related_product_ids: [...form.related_product_ids, p.id] })} className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex justify-between items-center">
                      <span>{p.name_bn}</span><Plus className="h-4 w-4" />
                    </button>
                  ))}
                  {relatedCandidates.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">কোনো ফলাফল নেই</div>}
                </div>
              )}
              <div>
                <div className="text-xs font-semibold mb-2">নির্বাচিত সম্পর্কিত পণ্য ({toBnDigits(relatedSelected.length)})</div>
                <div className="space-y-1.5">
                  {relatedSelected.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-2 bg-muted/40 rounded-md text-sm">
                      <span>{p.name_bn}</span>
                      <button onClick={() => setForm({ ...form, related_product_ids: form.related_product_ids.filter((x: string) => x !== p.id) })} className="text-destructive p-1"><X className="h-4 w-4" /></button>
                    </div>
                  ))}
                  {relatedSelected.length === 0 && <div className="text-xs text-muted-foreground">কিছু নির্বাচন করা হয়নি</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4 flex gap-3 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-border text-sm">বাতিল</button>
          <button onClick={onSave} className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium">সংরক্ষণ</button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full h-10 px-3 rounded-md border border-input bg-background text-sm";
function F({ label, children, full }: any) {
  return <label className={`block ${full ? "md:col-span-2" : ""}`}><span className="text-xs font-medium block mb-1.5">{label}</span>{children}</label>;
}
