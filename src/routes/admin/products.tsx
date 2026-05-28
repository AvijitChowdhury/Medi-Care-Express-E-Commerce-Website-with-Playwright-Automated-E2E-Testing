import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, X } from "lucide-react";
import { img } from "@/lib/images";

export const Route = createFileRoute("/admin/products")({
  component: Products,
});

async function fetchAll() {
  const [p, c] = await Promise.all([
    supabase.from("products").select("*, categories(name_bn)").order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("sort_order"),
  ]);
  return { products: p.data ?? [], categories: c.data ?? [] };
}

type Form = {
  id?: string;
  name_bn: string; slug: string; description_bn: string;
  price: string; compare_at_price: string; stock: string;
  category_id: string; images: string; is_active: boolean; is_featured: boolean;
};

const empty: Form = { name_bn: "", slug: "", description_bn: "", price: "", compare_at_price: "", stock: "10", category_id: "", images: "", is_active: true, is_featured: false };

function Products() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "products"], queryFn: fetchAll });
  const [editing, setEditing] = useState<Form | null>(null);

  const save = async () => {
    if (!editing) return;
    const payload = {
      name_bn: editing.name_bn,
      slug: editing.slug || editing.name_bn.trim().toLowerCase().replace(/\s+/g, "-"),
      description_bn: editing.description_bn || null,
      price: Number(editing.price) || 0,
      compare_at_price: editing.compare_at_price ? Number(editing.compare_at_price) : null,
      stock: Number(editing.stock) || 0,
      category_id: editing.category_id || null,
      images: editing.images.split(",").map((s) => s.trim()).filter(Boolean),
      is_active: editing.is_active, is_featured: editing.is_featured,
    };
    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) { toast.error(error.message); return; }
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

  const toggleFeatured = async (id: string, v: boolean) => {
    await supabase.from("products").update({ is_featured: !v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "products"] });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">পণ্য ম্যানেজমেন্ট</h1>
        <button onClick={() => setEditing(empty)} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm inline-flex items-center gap-2">
          <Plus className="h-4 w-4" /> নতুন পণ্য
        </button>
      </div>

      <div className="bg-background border border-border rounded-xl overflow-hidden">
        {isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div> : (
          <div className="divide-y divide-border">
            {data?.products.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 p-3 md:p-4">
                <img src={img(p.images?.[0])} alt="" className="h-14 w-14 rounded-md object-cover bg-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{p.name_bn}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.categories?.name_bn ?? "—"} • স্টক {toBnDigits(p.stock)}</div>
                </div>
                <div className="text-sm font-semibold text-primary shrink-0">{taka(p.price)}</div>
                <button onClick={() => toggleFeatured(p.id, p.is_featured)} className={`p-2 rounded ${p.is_featured ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}>
                  <Star className={`h-4 w-4 ${p.is_featured ? "fill-current" : ""}`} />
                </button>
                <button onClick={() => setEditing({
                  id: p.id, name_bn: p.name_bn, slug: p.slug, description_bn: p.description_bn ?? "",
                  price: String(p.price), compare_at_price: p.compare_at_price ? String(p.compare_at_price) : "",
                  stock: String(p.stock), category_id: p.category_id ?? "", images: (p.images ?? []).join(", "),
                  is_active: p.is_active, is_featured: p.is_featured,
                })} className="p-2 hover:bg-muted rounded"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(p.id)} className="p-2 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-background rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
              <h2 className="font-semibold">{editing.id ? "পণ্য সম্পাদনা" : "নতুন পণ্য"}</h2>
              <button onClick={() => setEditing(null)} className="p-2 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 grid md:grid-cols-2 gap-4">
              <F label="নাম *" full><input className={inp} value={editing.name_bn} onChange={(e) => setEditing({ ...editing, name_bn: e.target.value })} /></F>
              <F label="স্লাগ"><input className={inp} value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto" /></F>
              <F label="ক্যাটাগরি">
                <select className={inp} value={editing.category_id} onChange={(e) => setEditing({ ...editing, category_id: e.target.value })}>
                  <option value="">—</option>
                  {data?.categories.map((c: any) => <option key={c.id} value={c.id}>{c.name_bn}</option>)}
                </select>
              </F>
              <F label="দাম *"><input type="number" className={inp} value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} /></F>
              <F label="তুলনামূলক দাম"><input type="number" className={inp} value={editing.compare_at_price} onChange={(e) => setEditing({ ...editing, compare_at_price: e.target.value })} /></F>
              <F label="স্টক"><input type="number" className={inp} value={editing.stock} onChange={(e) => setEditing({ ...editing, stock: e.target.value })} /></F>
              <F label="ছবির URL (কমা দিয়ে আলাদা)" full><input className={inp} value={editing.images} onChange={(e) => setEditing({ ...editing, images: e.target.value })} placeholder="image-key1, image-key2" /></F>
              <F label="বিবরণ" full><textarea className={inp + " min-h-[100px]"} value={editing.description_bn} onChange={(e) => setEditing({ ...editing, description_bn: e.target.value })} /></F>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> অ্যাক্টিভ</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.is_featured} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> ফিচারড</label>
            </div>
            <div className="sticky bottom-0 bg-background border-t border-border p-4 flex gap-3 justify-end">
              <button onClick={() => setEditing(null)} className="h-10 px-4 rounded-md border border-border text-sm">বাতিল</button>
              <button onClick={save} className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium">সংরক্ষণ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inp = "w-full h-10 px-3 rounded-md border border-input bg-background text-sm";
function F({ label, children, full }: any) {
  return <label className={`block ${full ? "md:col-span-2" : ""}`}><span className="text-xs font-medium block mb-1.5">{label}</span>{children}</label>;
}
