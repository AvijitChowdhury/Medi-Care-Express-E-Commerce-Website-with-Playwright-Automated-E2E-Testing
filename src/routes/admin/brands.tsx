import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/admin/brands")({
  head: () => ({ meta: [{ title: "ব্র্যান্ড ব্যবস্থাপনা — অ্যাডমিন" }] }),
  component: BrandsPage,
});

type Brand = { id: string; name_bn: string; slug: string; logo_url: string | null };
const inp = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^a-z0-9\-\u0980-\u09FF]/g, "").replace(/-+/g, "-") || `brand-${Date.now()}`;

function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("brands").select("*").order("name_bn");
    const { data: prods } = await supabase.from("products").select("brand_id");
    const c: Record<string, number> = {};
    (prods ?? []).forEach((p: any) => { if (p.brand_id) c[p.brand_id] = (c[p.brand_id] ?? 0) + 1; });
    setBrands((data ?? []) as Brand[]);
    setCounts(c);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing({ id: "", name_bn: "", slug: "", logo_url: "" }); setOpen(true); };
  const openEdit = (b: Brand) => { setEditing({ ...b, logo_url: b.logo_url ?? "" }); setOpen(true); };

  const save = async () => {
    if (!editing) return;
    const name = editing.name_bn.trim();
    if (!name) { toast.error("ব্র্যান্ডের নাম দিন"); return; }
    const slug = (editing.slug || slugify(name)).trim();
    const payload = { name_bn: name, slug, logo_url: editing.logo_url?.trim() || null };
    const q = editing.id
      ? supabase.from("brands").update(payload).eq("id", editing.id)
      : supabase.from("brands").insert(payload);
    const { error } = await q;
    if (error) { toast.error(error.message); return; }
    toast.success(editing.id ? "ব্র্যান্ড আপডেট হয়েছে" : "ব্র্যান্ড যোগ হয়েছে");
    setOpen(false); setEditing(null); load();
  };

  const remove = async (b: Brand) => {
    if (counts[b.id]) { toast.error(`এই ব্র্যান্ডে ${counts[b.id]}টি পণ্য আছে। আগে পণ্য থেকে সরান।`); return; }
    if (!confirm(`"${b.name_bn}" মুছে ফেলবেন?`)) return;
    const { error } = await supabase.from("brands").delete().eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success("মুছে ফেলা হয়েছে"); load();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">ব্র্যান্ড ব্যবস্থাপনা</h1>
          <p className="text-sm text-muted-foreground mt-1">ব্র্যান্ড তৈরি, সম্পাদনা এবং মুছে ফেলুন। পণ্যের সাথে সংযুক্ত করতে পণ্য পেজ ব্যবহার করুন।</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm">
          <Plus className="h-4 w-4" /> নতুন ব্র্যান্ড
        </button>
      </div>

      <div className="rounded-lg border border-border bg-background overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : brands.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">এখনো কোনো ব্র্যান্ড নেই। উপরে "নতুন ব্র্যান্ড" থেকে যোগ করুন।</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">লোগো</th>
                <th className="text-left px-4 py-3">নাম</th>
                <th className="text-left px-4 py-3">স্লাগ</th>
                <th className="text-left px-4 py-3">পণ্য</th>
                <th className="text-right px-4 py-3">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.name_bn} className="h-10 w-10 rounded object-cover border border-border" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">{b.name_bn.slice(0, 2)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{b.name_bn}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{b.slug}</td>
                  <td className="px-4 py-3">{counts[b.id] ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button onClick={() => openEdit(b)} className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border text-xs hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" /> সম্পাদনা
                      </button>
                      <button onClick={() => remove(b)} className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-destructive/30 text-destructive text-xs hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" /> মুছুন
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-background rounded-lg w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing.id ? "ব্র্যান্ড সম্পাদনা" : "নতুন ব্র্যান্ড"}</h2>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">নাম *</label>
                <input className={inp} value={editing.name_bn}
                  onChange={(e) => setEditing({ ...editing, name_bn: e.target.value, slug: editing.slug || slugify(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">স্লাগ</label>
                <input className={inp} value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto-generated" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">লোগো URL</label>
                <input className={inp} value={editing.logo_url ?? ""} onChange={(e) => setEditing({ ...editing, logo_url: e.target.value })} placeholder="https://..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="h-10 px-4 rounded-md border border-border text-sm">বাতিল</button>
              <button onClick={save} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm">সংরক্ষণ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
