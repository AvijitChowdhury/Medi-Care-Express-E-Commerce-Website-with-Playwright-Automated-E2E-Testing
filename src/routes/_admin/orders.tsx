import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/_admin/orders")({
  component: Orders,
});

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: "গৃহীত", confirmed: "নিশ্চিত", processing: "প্রসেসিং", shipped: "শিপড", delivered: "ডেলিভারড", cancelled: "বাতিল",
};

async function fetchOrders(filter: string, complete: string) {
  let q = supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter as any);
  if (complete === "complete") q = q.eq("is_complete", true);
  if (complete === "incomplete") q = q.eq("is_complete", false);
  const { data } = await q;
  return data ?? [];
}

function Orders() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [complete, setComplete] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "orders", status, complete], queryFn: () => fetchOrders(status, complete) });

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("orders").update({ status: newStatus as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("স্ট্যাটাস আপডেট হয়েছে");
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">অর্ডার ম্যানেজমেন্ট</h1>

      <div className="flex gap-2 flex-wrap">
        {["all", "complete", "incomplete"].map((c) => (
          <button key={c} onClick={() => setComplete(c)} className={`h-9 px-4 rounded-full text-xs border ${complete === c ? "bg-foreground text-background border-foreground" : "border-border"}`}>
            {c === "all" ? "সব" : c === "complete" ? "সম্পন্ন" : "অসম্পূর্ণ"}
          </button>
        ))}
        <div className="w-px bg-border mx-1" />
        <button onClick={() => setStatus("all")} className={`h-9 px-4 rounded-full text-xs border ${status === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>সব স্ট্যাটাস</button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={`h-9 px-4 rounded-full text-xs border ${status === s ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="bg-background border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>
        ) : data?.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">কোনো অর্ডার নেই</div>
        ) : (
          <div className="divide-y divide-border">
            {data?.map((o: any) => {
              const isOpen = expanded === o.id;
              return (
                <div key={o.id}>
                  <div className="grid grid-cols-12 gap-3 p-4 items-center text-sm">
                    <div className="col-span-12 md:col-span-3">
                      <div className="font-mono text-xs">#{o.id.slice(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{new Date(o.created_at).toLocaleString("bn-BD")}</div>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <div className="font-medium">{o.customer_name}</div>
                      <div className="text-xs text-muted-foreground">{o.customer_phone}</div>
                    </div>
                    <div className="col-span-6 md:col-span-2 text-primary font-semibold">{taka(o.total)}</div>
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
                    <div className="bg-muted/30 p-4 grid md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="font-semibold mb-2">শিপিং</div>
                        <div>{o.shipping_address}, {o.shipping_city} ({o.shipping_area})</div>
                        <div className="mt-2 text-muted-foreground">পেমেন্ট: {o.payment_method} ({o.payment_status})</div>
                        {o.notes && <div className="mt-2"><span className="font-medium">নোট:</span> {o.notes}</div>}
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
        )}
      </div>
    </div>
  );
}
