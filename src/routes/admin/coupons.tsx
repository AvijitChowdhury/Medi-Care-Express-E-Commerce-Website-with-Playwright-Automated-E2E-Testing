import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, X, Ticket } from "lucide-react";
import { taka, toBnDigits } from "@/lib/format";

export const Route = createFileRoute("/admin/coupons")({
  head: () => ({ meta: [{ title: "কুপন ব্যবস্থাপনা — অ্যাডমিন" }] }),
  component: CouponsPage,
});

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_subtotal: number;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
};

const inp = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm";
const empty: Coupon = {
  id: "", code: "", description: "", discount_type: "percent", discount_value: 10,
  min_subtotal: 0, max_discount: null, usage_limit: null, usage_count: 0,
  starts_at: null, expires_at: null, active: true,
};

function CouponsPage() {
  const [list, setList] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Coupon | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing) return;
    const code = editing.code.trim().toUpperCase();
    if (!code) { toast.error("কুপন কোড দিন"); return; }
    if (!editing.discount_value || editing.discount_value <= 0) { toast.error("ছাড়ের পরিমাণ দিন"); return; }
    const payload = {
      code,
      description: editing.description?.trim() || null,
      discount_type: editing.discount_type,
      discount_value: editing.discount_value,
      min_subtotal: editing.min_subtotal ?? 0,
      max_discount: editing.max_discount || null,
      usage_limit: editing.usage_limit || null,
      starts_at: editing.starts_at || null,
      expires_at: editing.expires_at || null,
      active: editing.active,
    };
    const q = editing.id
      ? supabase.from("coupons").update(payload).eq("id", editing.id)
      : supabase.from("coupons").insert(payload);
    const { error } = await q;
    if (error) { toast.error(error.message); return; }
    toast.success(editing.id ? "আপডেট হয়েছে" : "কুপন তৈরি হয়েছে");
    setEditing(null); load();
  };

  const remove = async (c: Coupon) => {
    if (!confirm(`"${c.code}" মুছে ফেলবেন?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success("মুছে ফেলা হয়েছে"); load();
  };

  const toggleActive = async (c: Coupon) => {
    const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><Ticket className="h-6 w-6" /> কুপন ব্যবস্থাপনা</h1>
          <p className="text-sm text-muted-foreground mt-1">শতকরা বা ফিক্সড অ্যামাউন্ট ছাড়, ব্যবহার সীমা ও মেয়াদ সহ।</p>
        </div>
        <button onClick={() => setEditing({ ...empty })} className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm">
          <Plus className="h-4 w-4" /> নতুন কুপন
        </button>
      </div>

      <div className="rounded-lg border border-border bg-background overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">কোনো কুপন নেই। উপরে "নতুন কুপন" থেকে যোগ করুন।</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-3">কোড</th>
                <th className="text-left px-4 py-3">ছাড়</th>
                <th className="text-left px-4 py-3">ন্যূনতম</th>
                <th className="text-left px-4 py-3">ব্যবহার</th>
                <th className="text-left px-4 py-3">মেয়াদ</th>
                <th className="text-left px-4 py-3">অবস্থা</th>
                <th className="text-right px-4 py-3">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.discount_type === "percent"
                      ? `${toBnDigits(c.discount_value)}%`
                      : taka(c.discount_value)}
                    {c.max_discount ? <span className="text-xs text-muted-foreground"> (সর্বোচ্চ {taka(c.max_discount)})</span> : null}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.min_subtotal ? taka(c.min_subtotal) : "—"}</td>
                  <td className="px-4 py-3">{toBnDigits(c.usage_count)}{c.usage_limit ? ` / ${toBnDigits(c.usage_limit)}` : ""}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString("bn-BD") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(c)} className={`text-xs px-2 py-1 rounded-full ${c.active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                      {c.active ? "সক্রিয়" : "নিষ্ক্রিয়"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-2">
                      <button onClick={() => setEditing({ ...c })} className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-border text-xs hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5" /> সম্পাদনা
                      </button>
                      <button onClick={() => remove(c)} className="inline-flex items-center gap-1 h-8 px-3 rounded-md border border-destructive/30 text-destructive text-xs hover:bg-destructive/10">
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

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-background rounded-lg w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing.id ? "কুপন সম্পাদনা" : "নতুন কুপন"}</h2>
              <button onClick={() => setEditing(null)}><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">কোড *</label>
                <input className={inp + " font-mono uppercase"} value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="WELCOME10" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">বর্ণনা</label>
                <input className={inp} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">ছাড়ের ধরন *</label>
                  <select className={inp} value={editing.discount_type} onChange={(e) => setEditing({ ...editing, discount_type: e.target.value as any })}>
                    <option value="percent">শতকরা (%)</option>
                    <option value="fixed">ফিক্সড (৳)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ছাড়ের পরিমাণ *</label>
                  <input type="number" min="0" step="0.01" className={inp} value={editing.discount_value}
                    onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">ন্যূনতম সাবটোটাল (৳)</label>
                  <input type="number" min="0" className={inp} value={editing.min_subtotal}
                    onChange={(e) => setEditing({ ...editing, min_subtotal: Number(e.target.value) })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">সর্বোচ্চ ছাড় (৳)</label>
                  <input type="number" min="0" className={inp} value={editing.max_discount ?? ""}
                    onChange={(e) => setEditing({ ...editing, max_discount: e.target.value ? Number(e.target.value) : null })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">ব্যবহার সীমা (মোট)</label>
                <input type="number" min="1" className={inp} value={editing.usage_limit ?? ""}
                  onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value ? Number(e.target.value) : null })} placeholder="সীমাহীন" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">শুরুর তারিখ</label>
                  <input type="datetime-local" className={inp} value={editing.starts_at?.slice(0,16) ?? ""}
                    onChange={(e) => setEditing({ ...editing, starts_at: e.target.value || null })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">শেষের তারিখ</label>
                  <input type="datetime-local" className={inp} value={editing.expires_at?.slice(0,16) ?? ""}
                    onChange={(e) => setEditing({ ...editing, expires_at: e.target.value || null })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                সক্রিয়
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditing(null)} className="h-10 px-4 rounded-md border border-border text-sm">বাতিল</button>
              <button onClick={save} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm">সংরক্ষণ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
