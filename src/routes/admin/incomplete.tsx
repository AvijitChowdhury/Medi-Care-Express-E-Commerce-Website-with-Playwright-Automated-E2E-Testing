import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Download, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/incomplete")({
  component: IncompletePage,
});

async function fetchIncomplete() {
  const { data, error } = await supabase
    .from("incomplete_orders")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

type Row = Awaited<ReturnType<typeof fetchIncomplete>>[number];

function IncompletePage() {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({ queryKey: ["admin", "incomplete"], queryFn: fetchIncomplete });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"pending" | "recovered" | "all">("pending");
  const [confirm, setConfirm] = useState<null | { type: "convert" | "delete" | "bulk-convert" | "bulk-delete"; ids: string[] }>(null);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("admin-incomplete")
      .on("postgres_changes", { event: "*", schema: "public", table: "incomplete_orders" }, () => {
        qc.invalidateQueries({ queryKey: ["admin", "incomplete"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const rows = useMemo(() => {
    const arr = data ?? [];
    if (filter === "pending") return arr.filter((r) => !r.recovered);
    if (filter === "recovered") return arr.filter((r) => r.recovered);
    return arr;
  }, [data, filter]);

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const convertOne = async (row: Row) => {
    const cart = (row.cart as any[]) ?? [];
    if (cart.length === 0) { toast.error("কার্ট খালি — কনভার্ট করা যাবে না"); return; }
    const subtotal = Number(row.subtotal ?? 0);
    const delivery = row.shipping_area === "dhaka" ? 70 : 130;
    const total = subtotal + delivery;

    const { data: order, error } = await supabase.from("orders").insert({
      user_id: row.user_id ?? null,
      customer_name: row.customer_name ?? "অজানা",
      customer_phone: row.customer_phone ?? "—",
      customer_email: row.customer_email ?? null,
      shipping_address: row.shipping_address ?? "—",
      shipping_city: row.shipping_city ?? "—",
      shipping_area: row.shipping_area ?? "dhaka",
      subtotal,
      delivery_fee: delivery,
      total,
      payment_method: (row.payment_method as any) ?? "cod",
      payment_status: "unpaid",
      paid_amount: 0,
      due_amount: total,
      status: "pending",
      is_complete: true,
      notes: (row.notes ? row.notes + " | " : "") + "অসম্পূর্ণ থেকে রিকভার করা হয়েছে",
    }).select().single();
    if (error || !order) { toast.error(error?.message ?? "কনভার্ট ব্যর্থ"); return false; }

    const { error: itemErr } = await supabase.from("order_items").insert(
      cart.map((it: any) => ({
        order_id: order.id,
        product_id: it.productId,
        name_bn: it.name_bn,
        unit_price: it.price,
        qty: it.qty,
        image_url: it.image,
      }))
    );
    if (itemErr) { toast.error(itemErr.message); return false; }

    await supabase.from("incomplete_orders")
      .update({ recovered: true, recovered_order_id: order.id, recovered_at: new Date().toISOString() })
      .eq("id", row.id);
    return true;
  };

  const runConfirm = async () => {
    if (!confirm) return;
    const targets = (data ?? []).filter((r) => confirm.ids.includes(r.id));
    if (confirm.type === "delete" || confirm.type === "bulk-delete") {
      const { error } = await supabase.from("incomplete_orders").delete().in("id", confirm.ids);
      if (error) toast.error(error.message);
      else toast.success(`${toBnDigits(confirm.ids.length)} টি মুছে ফেলা হয়েছে`);
    } else {
      let ok = 0;
      for (const r of targets) { if (await convertOne(r)) ok++; }
      toast.success(`${toBnDigits(ok)} টি অর্ডারে রূপান্তরিত হয়েছে`);
    }
    setSelected(new Set());
    setConfirm(null);
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const exportCsv = () => {
    const header = ["ID","Name","Phone","Email","City","Area","Address","Subtotal","Items","Payment","Recovered","Updated"];
    const csv = [header.join(",")].concat(
      rows.map((r) => [
        r.id, r.customer_name ?? "", r.customer_phone ?? "", r.customer_email ?? "",
        r.shipping_city ?? "", r.shipping_area ?? "", (r.shipping_address ?? "").replace(/\n/g, " "),
        r.subtotal ?? 0, ((r.cart as any[]) ?? []).length, r.payment_method ?? "",
        r.recovered ? "yes" : "no", r.updated_at,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    ).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `incomplete-orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">অসম্পূর্ণ অর্ডার</h1>
          <p className="text-xs text-muted-foreground mt-1">যেসব গ্রাহক চেকআউট শুরু করে শেষ করেনি</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border border-border text-xs"><RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ</button>
          <button onClick={exportCsv} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-md border border-border text-xs"><Download className="h-3.5 w-3.5" /> CSV ডাউনলোড</button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { v: "pending", l: "পেন্ডিং" },
          { v: "recovered", l: "রিকভার্ড" },
          { v: "all", l: "সব" },
        ].map((o) => (
          <button key={o.v} onClick={() => { setFilter(o.v as any); setSelected(new Set()); }}
            className={`h-9 px-4 rounded-full text-xs border ${filter === o.v ? "bg-foreground text-background border-foreground" : "border-border"}`}>
            {o.l}
          </button>
        ))}
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-md bg-primary/5 border border-primary/20 text-sm">
          <span className="font-medium">{toBnDigits(selected.size)} টি নির্বাচিত</span>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setConfirm({ type: "bulk-convert", ids: Array.from(selected) })}
              className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> অর্ডারে কনভার্ট</button>
            <button onClick={() => setConfirm({ type: "bulk-delete", ids: Array.from(selected) })}
              className="h-8 px-3 rounded-md bg-destructive text-destructive-foreground text-xs inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> মুছুন</button>
          </div>
        </div>
      )}

      <div className="bg-background border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-muted-foreground/60" />
            কোনো অসম্পূর্ণ অর্ডার নেই
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="p-3 w-10"><input type="checkbox" checked={selected.size === rows.length && rows.length > 0} onChange={(e) => toggleAll(e.target.checked)} /></th>
                  <th className="p-3 text-left">গ্রাহক</th>
                  <th className="p-3 text-left">যোগাযোগ</th>
                  <th className="p-3 text-left">এলাকা</th>
                  <th className="p-3 text-right">আইটেম</th>
                  <th className="p-3 text-right">সাবটোটাল</th>
                  <th className="p-3 text-left">সর্বশেষ</th>
                  <th className="p-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const cart = (r.cart as any[]) ?? [];
                  return (
                    <tr key={r.id} className={selected.has(r.id) ? "bg-primary/5" : ""}>
                      <td className="p-3"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} /></td>
                      <td className="p-3">
                        <div className="font-medium">{r.customer_name || <span className="text-muted-foreground italic">—</span>}</div>
                        {r.recovered && <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600">রিকভার্ড</span>}
                      </td>
                      <td className="p-3 text-xs">
                        <div>{r.customer_phone || "—"}</div>
                        <div className="text-muted-foreground">{r.customer_email || ""}</div>
                      </td>
                      <td className="p-3 text-xs">{r.shipping_city || "—"} <span className="text-muted-foreground">({r.shipping_area || "—"})</span></td>
                      <td className="p-3 text-right">{toBnDigits(cart.length)}</td>
                      <td className="p-3 text-right font-semibold text-primary">{taka(Number(r.subtotal ?? 0))}</td>
                      <td className="p-3 text-xs text-muted-foreground">{new Date(r.updated_at).toLocaleString("bn-BD")}</td>
                      <td className="p-3 text-right">
                        <div className="inline-flex gap-1">
                          {!r.recovered && (
                            <button onClick={() => setConfirm({ type: "convert", ids: [r.id] })}
                              className="h-8 px-2.5 rounded bg-primary text-primary-foreground text-xs">কনভার্ট</button>
                          )}
                          <button onClick={() => setConfirm({ type: "delete", ids: [r.id] })}
                            className="h-8 w-8 inline-flex items-center justify-center rounded border border-border text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type.includes("delete") ? "মুছে ফেলবেন?" : "অর্ডারে রূপান্তর করবেন?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.ids.length === 1 ? "এই অসম্পূর্ণ অর্ডারে" : `${toBnDigits(confirm?.ids.length ?? 0)} টি অসম্পূর্ণ অর্ডারে`} এই অ্যাকশনটি প্রয়োগ হবে। {confirm?.type.includes("delete") ? "মুছে ফেললে ফিরিয়ে আনা যাবে না।" : "এটি একটি নতুন অর্ডার তৈরি করবে।"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল</AlertDialogCancel>
            <AlertDialogAction onClick={runConfirm}>নিশ্চিত করুন</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
