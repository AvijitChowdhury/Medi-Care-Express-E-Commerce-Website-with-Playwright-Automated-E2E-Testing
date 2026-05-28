import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";

export const Route = createFileRoute("/_admin/customers")({
  component: Customers,
});

async function fetchCustomers() {
  const [{ data: profiles }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("user_id, total, status"),
  ]);
  const agg = new Map<string, { count: number; spend: number }>();
  (orders ?? []).forEach((o) => {
    if (!o.user_id) return;
    const cur = agg.get(o.user_id) ?? { count: 0, spend: 0 };
    cur.count += 1;
    if (o.status !== "cancelled") cur.spend += Number(o.total);
    agg.set(o.user_id, cur);
  });
  return (profiles ?? []).map((p) => ({ ...p, ...(agg.get(p.id) ?? { count: 0, spend: 0 }) }));
}

function Customers() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "customers"], queryFn: fetchCustomers });

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">গ্রাহক</h1>
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        {isLoading ? <div className="p-10 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div> :
          data?.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">কোনো গ্রাহক নেই</div> :
          <div className="divide-y divide-border">
            {data?.map((c: any) => (
              <div key={c.id} className="grid grid-cols-12 gap-3 p-4 items-center text-sm">
                <div className="col-span-12 md:col-span-5">
                  <div className="font-medium">{c.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{c.phone || "ফোন নেই"} {c.city ? `• ${c.city}` : ""}</div>
                </div>
                <div className="col-span-6 md:col-span-3 text-xs text-muted-foreground">যোগদান: {new Date(c.created_at).toLocaleDateString("bn-BD")}</div>
                <div className="col-span-3 md:col-span-2 text-xs">অর্ডার: <span className="font-medium">{toBnDigits(c.count)}</span></div>
                <div className="col-span-3 md:col-span-2 text-sm font-semibold text-primary text-right">{taka(c.spend)}</div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}
