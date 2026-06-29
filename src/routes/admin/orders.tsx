import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 20;
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Trash2, RotateCcw, Plus, X, Search } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: Orders,
});

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: "গৃহীত", confirmed: "নিশ্চিত", processing: "প্রসেসিং", shipped: "শিপড", delivered: "ডেলিভারড", cancelled: "বাতিল",
};

async function fetchOrders(filter: string, complete: string, view: string, page: number) {
  let q = supabase.from("orders").select("*, order_items(*)", { count: "exact" }).order("created_at", { ascending: false });
  if (view === "trash") q = q.not("deleted_at", "is", null);
  else q = q.is("deleted_at", null);
  if (filter !== "all") q = q.eq("status", filter as any);
  if (complete === "complete") q = q.eq("is_complete", true);
  if (complete === "incomplete") q = q.eq("is_complete", false);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, count } = await q.range(from, to);
  return { rows: data ?? [], total: count ?? 0 };
}

// Fetch ALL ids matching the current filter (for cross-page select-all)
async function fetchAllIds(filter: string, complete: string, view: string): Promise<string[]> {
  let q = supabase.from("orders").select("id");
  if (view === "trash") q = q.not("deleted_at", "is", null);
  else q = q.is("deleted_at", null);
  if (filter !== "all") q = q.eq("status", filter as any);
  if (complete === "complete") q = q.eq("is_complete", true);
  if (complete === "incomplete") q = q.eq("is_complete", false);
  const { data } = await q;
  return (data ?? []).map((r: any) => r.id);
}

function Orders() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [complete, setComplete] = useState("all");
  const [view, setView] = useState<"active" | "trash">("active");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showManual, setShowManual] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", status, complete, view, page],
    queryFn: () => fetchOrders(status, complete, view, page),
  });
  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // page-level select-all state (selected is persistent across pages)
  const pageAllSelected = useMemo(() => rows.length > 0 && rows.every((o: any) => selected.has(o.id)), [rows, selected]);
  const toggle = (id: string) => { const s = new Set(selected); s.has(id) ? s.delete(id) : s.add(id); setSelected(s); };
  const togglePage = () => {
    const s = new Set(selected);
    if (pageAllSelected) rows.forEach((o: any) => s.delete(o.id));
    else rows.forEach((o: any) => s.add(o.id));
    setSelected(s);
  };
  const selectAllMatching = async () => {
    const ids = await fetchAllIds(status, complete, view);
    setSelected(new Set(ids));
    toast.success(`${toBnDigits(ids.length)}টি অর্ডার নির্বাচিত`);
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("স্ট্যাটাস আপডেট হয়েছে");
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const bulkTrash = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${toBnDigits(selected.size)}টি অর্ডার ট্র্যাশে পাঠাবেন?`)) return;
    const { error } = await supabase.from("orders").update({ deleted_at: new Date().toISOString() }).in("id", Array.from(selected));
    if (error) { toast.error(error.message); return; }
    toast.success("ট্র্যাশে সরানো হয়েছে"); setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  const bulkRestore = async () => {
    if (selected.size === 0) return;
    const { error } = await supabase.from("orders").update({ deleted_at: null }).in("id", Array.from(selected));
    if (error) { toast.error(error.message); return; }
    toast.success("পুনরুদ্ধার হয়েছে"); setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`${toBnDigits(selected.size)}টি অর্ডার চিরতরে মুছবেন?`)) return;
    const { error } = await supabase.from("orders").delete().in("id", Array.from(selected));
    if (error) { toast.error(error.message); return; }
    toast.success("মুছে ফেলা হয়েছে"); setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  const bulkStatus = async (s: string) => {
    if (selected.size === 0) return;
    const { error } = await supabase.from("orders").update({ status: s as any }).in("id", Array.from(selected));
    if (error) { toast.error(error.message); return; }
    toast.success("স্ট্যাটাস আপডেট হয়েছে"); setSelected(new Set());
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">অর্ডার ম্যানেজমেন্ট</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowManual(true)} className="h-10 px-4 rounded-md bg-primary text-primary-foreground text-sm inline-flex items-center gap-2">
            <Plus className="h-4 w-4" /> ম্যানুয়াল অর্ডার
          </button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="inline-flex rounded-full border border-border overflow-hidden">
          <button onClick={() => { setView("active"); setSelected(new Set()); }} className={`h-9 px-4 text-xs ${view === "active" ? "bg-foreground text-background" : ""}`}>সক্রিয়</button>
          <button onClick={() => { setView("trash"); setSelected(new Set()); }} className={`h-9 px-4 text-xs inline-flex items-center gap-1 ${view === "trash" ? "bg-foreground text-background" : ""}`}><Trash2 className="h-3 w-3" /> ট্র্যাশ</button>
        </div>
        <div className="w-px h-6 bg-border mx-1" />
        {["all", "complete", "incomplete"].map((c) => (
          <button key={c} onClick={() => setComplete(c)} className={`h-9 px-4 rounded-full text-xs border ${complete === c ? "bg-foreground text-background border-foreground" : "border-border"}`}>
            {c === "all" ? "সব" : c === "complete" ? "সম্পন্ন" : "অসম্পূর্ণ"}
          </button>
        ))}
        <div className="w-px h-6 bg-border mx-1" />
        <button onClick={() => setStatus("all")} className={`h-9 px-4 rounded-full text-xs border ${status === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>সব স্ট্যাটাস</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`h-9 px-4 rounded-full text-xs border ${status === s ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="bg-foreground text-background rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap text-sm">
          <span className="font-medium">{toBnDigits(selected.size)}টি নির্বাচিত</span>
          <div className="w-px h-5 bg-background/30" />
          {view === "active" ? (
            <>
              <select onChange={(e) => { if (e.target.value) { bulkStatus(e.target.value); e.target.value = ""; } }} className="h-8 px-2 rounded bg-background text-foreground text-xs">
                <option value="">স্ট্যাটাস পরিবর্তন...</option>
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
              <button onClick={bulkTrash} className="h-8 px-3 rounded bg-background/10 hover:bg-background/20 text-xs inline-flex items-center gap-1.5"><Trash2 className="h-3 w-3" /> ট্র্যাশে পাঠান</button>
            </>
          ) : (
            <>
              <button onClick={bulkRestore} className="h-8 px-3 rounded bg-background/10 hover:bg-background/20 text-xs inline-flex items-center gap-1.5"><RotateCcw className="h-3 w-3" /> পুনরুদ্ধার</button>
              <button onClick={bulkDelete} className="h-8 px-3 rounded bg-destructive text-destructive-foreground text-xs inline-flex items-center gap-1.5"><Trash2 className="h-3 w-3" /> চিরতরে মুছুন</button>
            </>
          )}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs underline">বাতিল</button>
        </div>
      )}

      <div className="bg-background border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : data?.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">কোনো অর্ডার নেই</div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-3 text-xs">
              <input type="checkbox" checked={!!allSelected} onChange={toggleAll} className="h-4 w-4" />
              <span className="text-muted-foreground">সব নির্বাচন</span>
            </div>
            <div className="divide-y divide-border">
              {data?.map((o: any) => {
                const isOpen = expanded === o.id;
                const isSel = selected.has(o.id);
                return (
                  <div key={o.id} className={isSel ? "bg-primary/5" : ""}>
                    <div className="grid grid-cols-12 gap-3 p-4 items-center text-sm">
                      <div className="col-span-1 md:col-span-1 flex items-center">
                        <input type="checkbox" checked={isSel} onChange={() => toggle(o.id)} className="h-4 w-4" />
                      </div>
                      <div className="col-span-11 md:col-span-3">
                        <div className="font-mono text-xs flex items-center gap-1.5">
                          #{o.order_number || o.id.slice(0, 8).toUpperCase()}
                          {o.is_manual && <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 text-[9px]">ম্যানুয়াল</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{new Date(o.created_at).toLocaleString("bn-BD")}</div>
                      </div>
                      <div className="col-span-6 md:col-span-3">
                        <div className="font-medium">{o.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{o.customer_phone}</div>
                      </div>
                      <div className="col-span-6 md:col-span-1 text-primary font-semibold">{taka(o.total)}</div>
                      <div className="col-span-8 md:col-span-3">
                        <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)} className="h-9 w-full px-2 rounded-md border border-input bg-background text-xs">
                          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                        </select>
                      </div>
                      <div className="col-span-4 md:col-span-1 text-right">
                        <button onClick={() => setExpanded(isOpen ? null : o.id)} className="p-2 hover:bg-muted rounded">
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="bg-muted/30 p-4 grid md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="font-semibold mb-2">শিপিং</div>
                          <div>{o.shipping_address}, {o.shipping_city} ({o.shipping_area})</div>
                          {o.customer_email && <div className="mt-1 text-muted-foreground">{o.customer_email}</div>}
                          {o.notes && <div className="mt-2"><span className="font-medium">নোট:</span> {o.notes}</div>}
                        </div>
                        <div>
                          <div className="font-semibold mb-2">পেমেন্ট</div>
                          <div>মাধ্যম: <span className="font-medium">{o.payment_method === "cod" ? "ক্যাশ অন ডেলিভারি" : "অনলাইন (আংশিক)"}</span></div>
                          <div>স্ট্যাটাস: <span className={`font-medium ${o.payment_status === "paid" ? "text-emerald-600" : o.payment_status === "partial" ? "text-blue-600" : "text-amber-600"}`}>{o.payment_status}</span></div>
                          <div className="mt-1">পরিশোধিত: <span className="font-medium">{taka(o.paid_amount || 0)}</span></div>
                          <div>বাকি: <span className="font-medium">{taka(o.due_amount || 0)}</span></div>
                          {(o.uddoktapay_transaction_id || o.uddoktapay_invoice_id) && (
                            <div className="mt-2 pt-2 border-t border-border space-y-0.5">
                              {o.uddoktapay_payment_method && <div>গেটওয়ে: <span className="font-medium">{o.uddoktapay_payment_method}</span></div>}
                              {o.uddoktapay_transaction_id && <div>TxID: <span className="font-mono">{o.uddoktapay_transaction_id}</span></div>}
                              {o.uddoktapay_sender_number && <div>প্রেরক: <span className="font-mono">{o.uddoktapay_sender_number}</span></div>}
                              {o.uddoktapay_invoice_id && <div className="text-muted-foreground">Inv: <span className="font-mono">{o.uddoktapay_invoice_id}</span></div>}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold mb-2">পণ্য ({toBnDigits(o.order_items?.length ?? 0)})</div>
                          <div className="space-y-1.5">
                            {o.order_items?.map((it: any) => (
                              <div key={it.id} className="flex justify-between gap-2">
                                <span className="truncate">{it.name_bn} × {toBnDigits(it.qty)}</span>
                                <span className="shrink-0 font-medium">{taka(it.unit_price * it.qty)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showManual && <ManualOrderModal onClose={() => setShowManual(false)} onSaved={() => qc.invalidateQueries({ queryKey: ["admin"] })} />}
    </div>
  );
}

function ManualOrderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", customer_email: "",
    shipping_address: "", shipping_city: "", shipping_area: "", notes: "",
    delivery_fee: "0", payment_method: "cod" as "cod" | "partial_online",
    payment_status: "unpaid" as "unpaid" | "partial" | "paid",
    paid_amount: "0",
  });
  const [items, setItems] = useState<Array<{ product_id?: string; name_bn: string; unit_price: number; qty: number; image_url?: string }>>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0);
  const total = subtotal + (Number(form.delivery_fee) || 0);

  const doSearch = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setResults([]); return; }
    const { data } = await supabase.from("products").select("id, name_bn, price, images").ilike("name_bn", `%${q}%`).limit(8);
    setResults(data ?? []);
  };
  const addProduct = (p: any) => {
    setItems((arr) => [...arr, { product_id: p.id, name_bn: p.name_bn, unit_price: Number(p.price), qty: 1, image_url: p.images?.[0] }]);
    setSearch(""); setResults([]);
  };
  const addCustom = () => setItems((arr) => [...arr, { name_bn: "কাস্টম আইটেম", unit_price: 0, qty: 1 }]);

  const save = async () => {
    if (!form.customer_name || !form.customer_phone || !form.shipping_address || !form.shipping_city) {
      toast.error("গ্রাহকের নাম, ফোন, ঠিকানা ও শহর আবশ্যক"); return;
    }
    if (items.length === 0) { toast.error("অন্তত একটি পণ্য যোগ করুন"); return; }
    setSaving(true);
    const paid = Number(form.paid_amount) || 0;
    const { data: ord, error } = await supabase.from("orders").insert({
      ...form,
      delivery_fee: Number(form.delivery_fee) || 0,
      subtotal, total,
      paid_amount: paid, due_amount: Math.max(0, total - paid),
      is_manual: true, is_complete: true,
    }).select().single();
    if (error || !ord) { toast.error(error?.message || "ত্রুটি"); setSaving(false); return; }
    const itemRows = items.map((it) => ({ order_id: ord.id, product_id: it.product_id ?? null, name_bn: it.name_bn, unit_price: it.unit_price, qty: it.qty, image_url: it.image_url ?? null }));
    const { error: e2 } = await supabase.from("order_items").insert(itemRows);
    if (e2) { toast.error(e2.message); setSaving(false); return; }
    toast.success("অর্ডার তৈরি হয়েছে");
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-background w-full md:max-w-3xl md:rounded-xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
          <h2 className="font-semibold">ম্যানুয়াল অর্ডার তৈরি</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-5">
          <section>
            <h3 className="text-sm font-semibold mb-3">গ্রাহকের তথ্য</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <F label="নাম *"><input className={inp} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></F>
              <F label="ফোন *"><input className={inp} value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} /></F>
              <F label="ইমেইল"><input className={inp} value={form.customer_email} onChange={(e) => setForm({ ...form, customer_email: e.target.value })} /></F>
              <F label="শহর *"><input className={inp} value={form.shipping_city} onChange={(e) => setForm({ ...form, shipping_city: e.target.value })} /></F>
              <F label="এরিয়া"><input className={inp} value={form.shipping_area} onChange={(e) => setForm({ ...form, shipping_area: e.target.value })} /></F>
              <F label="ঠিকানা *" full><textarea className={inp + " min-h-[60px] py-2"} value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} /></F>
              <F label="নোট" full><textarea className={inp + " min-h-[50px] py-2"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></F>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">পণ্য</h3>
            <div className="relative">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input className={inp + " pl-9"} placeholder="পণ্য খুঁজুন..." value={search} onChange={(e) => doSearch(e.target.value)} />
                </div>
                <button onClick={addCustom} className="h-10 px-3 rounded-md border border-border text-xs whitespace-nowrap">কাস্টম যোগ</button>
              </div>
              {results.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-background border border-border rounded-md shadow-lg z-20 max-h-60 overflow-y-auto">
                  {results.map((p) => (
                    <button key={p.id} onClick={() => addProduct(p)} className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex justify-between items-center">
                      <span>{p.name_bn}</span>
                      <span className="text-xs text-primary">{taka(p.price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mt-3 space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <input className={inp + " col-span-5"} value={it.name_bn} onChange={(e) => setItems((a) => a.map((x, i) => i === idx ? { ...x, name_bn: e.target.value } : x))} />
                  <input type="number" className={inp + " col-span-3"} placeholder="দাম" value={it.unit_price} onChange={(e) => setItems((a) => a.map((x, i) => i === idx ? { ...x, unit_price: Number(e.target.value) } : x))} />
                  <input type="number" className={inp + " col-span-2"} placeholder="পরিমাণ" value={it.qty} onChange={(e) => setItems((a) => a.map((x, i) => i === idx ? { ...x, qty: Math.max(1, Number(e.target.value)) } : x))} />
                  <div className="col-span-1 text-right text-xs font-medium">{taka(it.unit_price * it.qty)}</div>
                  <button onClick={() => setItems((a) => a.filter((_, i) => i !== idx))} className="col-span-1 p-2 hover:bg-muted rounded text-destructive"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3">পেমেন্ট ও ডেলিভারি</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <F label="ডেলিভারি চার্জ"><input type="number" className={inp} value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: e.target.value })} /></F>
              <F label="পেমেন্ট মাধ্যম">
                <select className={inp} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value as any })}>
                  <option value="cod">ক্যাশ অন ডেলিভারি</option>
                  <option value="partial_online">অনলাইন (আংশিক)</option>
                </select>
              </F>
              <F label="পেমেন্ট স্ট্যাটাস">
                <select className={inp} value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value as any })}>
                  <option value="unpaid">অপরিশোধিত</option>
                  <option value="partial">আংশিক</option>
                  <option value="paid">পরিশোধিত</option>
                </select>
              </F>
              <F label="পরিশোধিত পরিমাণ"><input type="number" className={inp} value={form.paid_amount} onChange={(e) => setForm({ ...form, paid_amount: e.target.value })} /></F>
            </div>
            <div className="mt-4 bg-muted/40 rounded-lg p-3 text-sm flex justify-between">
              <span className="text-muted-foreground">সাবটোটাল</span><span>{taka(subtotal)}</span>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-sm flex justify-between border-t border-border">
              <span className="text-muted-foreground">ডেলিভারি</span><span>{taka(Number(form.delivery_fee) || 0)}</span>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 text-sm flex justify-between font-semibold mt-1">
              <span>মোট</span><span className="text-primary">{taka(total)}</span>
            </div>
          </section>
        </div>
        <div className="sticky bottom-0 bg-background border-t border-border p-4 flex gap-3 justify-end">
          <button onClick={onClose} className="h-10 px-4 rounded-md border border-border text-sm">বাতিল</button>
          <button disabled={saving} onClick={save} className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">{saving ? "সংরক্ষণ হচ্ছে..." : "অর্ডার তৈরি"}</button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full h-10 px-3 rounded-md border border-input bg-background text-sm";
function F({ label, children, full }: any) {
  return <label className={`block ${full ? "md:col-span-2" : ""}`}><span className="text-xs font-medium block mb-1.5">{label}</span>{children}</label>;
}
