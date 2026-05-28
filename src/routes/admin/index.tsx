import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";
import { TrendingUp, ShoppingBag, Users, Package, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

async function fetchStats() {
  const [orders, products, customers, recent] = await Promise.all([
    supabase.from("orders").select("total, status, created_at, payment_status"),
    supabase.from("products").select("id, name_bn, stock, is_active"),
    supabase.from("profiles").select("id"),
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(8),
  ]);
  return {
    orders: orders.data ?? [],
    products: products.data ?? [],
    customers: customers.data ?? [],
    recent: recent.data ?? [],
  };
}

const statusLabels: Record<string, string> = {
  pending: "গৃহীত", confirmed: "নিশ্চিত", processing: "প্রসেসিং", shipped: "শিপড", delivered: "ডেলিভারড", cancelled: "বাতিল",
};

function Dashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "stats"], queryFn: fetchStats });

  if (isLoading || !data) return <div className="p-8 text-sm text-muted-foreground">লোড হচ্ছে...</div>;

  const revenue = data.orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + Number(o.total), 0);
  const pending = data.orders.filter((o) => o.status === "pending").length;
  const lowStock = data.products.filter((p) => p.stock <= 5 && p.is_active);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = data.orders.filter((o) => new Date(o.created_at) >= today).length;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">ড্যাশবোর্ড</h1>
        <p className="text-sm text-muted-foreground mt-1">সাইটের একটি সংক্ষিপ্ত পরিসংখ্যান</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat Icon={TrendingUp} label="মোট আয়" value={taka(revenue)} tint="bg-primary/10 text-primary" />
        <Stat Icon={ShoppingBag} label="মোট অর্ডার" value={toBnDigits(data.orders.length)} sub={`আজ: ${toBnDigits(todayOrders)}`} tint="bg-emerald-500/10 text-emerald-600" />
        <Stat Icon={Users} label="গ্রাহক" value={toBnDigits(data.customers.length)} tint="bg-blue-500/10 text-blue-600" />
        <Stat Icon={Package} label="পেন্ডিং অর্ডার" value={toBnDigits(pending)} tint="bg-amber-500/10 text-amber-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-background border border-border rounded-xl">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">সাম্প্রতিক অর্ডার</h2>
            <Link to="/admin/orders" className="text-xs text-primary hover:underline">সব দেখুন →</Link>
          </div>
          {data.recent.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">এখনো কোনো অর্ডার নেই</div>
          ) : (
            <div className="divide-y divide-border">
              {data.recent.map((o: any) => (
                <Link key={o.id} to="/admin/orders" className="flex items-center justify-between p-4 hover:bg-muted/40">
                  <div>
                    <div className="text-sm font-medium">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 font-mono">#{o.id.slice(0, 8).toUpperCase()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-primary">{taka(o.total)}</div>
                    <div className="text-[10px] mt-1 inline-block bg-primary/10 text-primary px-2 py-0.5 rounded-full">{statusLabels[o.status]}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-background border border-border rounded-xl">
          <div className="p-5 border-b border-border flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="font-semibold">কম স্টক</h2>
          </div>
          {lowStock.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">সব ঠিক আছে</div>
          ) : (
            <div className="divide-y divide-border">
              {lowStock.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4">
                  <div className="text-sm truncate pr-2">{p.name_bn}</div>
                  <div className="text-xs font-medium bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full shrink-0">{toBnDigits(p.stock)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ Icon, label, value, sub, tint }: any) {
  return (
    <div className="bg-background border border-border rounded-xl p-5">
      <div className={`h-9 w-9 rounded-lg ${tint} flex items-center justify-center`}><Icon className="h-4 w-4" /></div>
      <div className="mt-3 text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
