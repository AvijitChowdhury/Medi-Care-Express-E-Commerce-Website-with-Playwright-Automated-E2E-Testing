import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";
import { useMemo } from "react";
import { TrendingUp, Target, DollarSign, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/admin/recovery")({
  component: RecoveryPage,
});

async function fetchAll() {
  const [io, ord] = await Promise.all([
    supabase.from("incomplete_orders").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("id, total, created_at, notes").order("created_at", { ascending: false }).limit(500),
  ]);
  return { incomplete: io.data ?? [], orders: ord.data ?? [] };
}

function RecoveryPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "recovery-analytics"], queryFn: fetchAll });

  const stats = useMemo(() => {
    const inc = data?.incomplete ?? [];
    const total = inc.length;
    const recovered = inc.filter((r) => r.recovered);
    const recoveredCount = recovered.length;
    const recoveredValue = recovered.reduce((s, r) => s + Number(r.subtotal ?? 0), 0);
    const lostValue = inc.filter((r) => !r.recovered).reduce((s, r) => s + Number(r.subtotal ?? 0), 0);
    const conversionRate = total ? (recoveredCount / total) * 100 : 0;

    // Trend by day (last 14)
    const days: { day: string; started: number; recovered: number; value: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      const dayRows = inc.filter((r) => r.created_at?.slice(0, 10) === key);
      days.push({
        day: key,
        started: dayRows.length,
        recovered: dayRows.filter((r) => r.recovered).length,
        value: dayRows.filter((r) => r.recovered).reduce((s, r) => s + Number(r.subtotal ?? 0), 0),
      });
    }

    // Top recovered
    const top = [...recovered].sort((a, b) => Number(b.subtotal ?? 0) - Number(a.subtotal ?? 0)).slice(0, 8);

    // Funnel
    const filledContact = inc.filter((r) => r.customer_phone || r.customer_email).length;
    const filledAddress = inc.filter((r) => r.shipping_address && r.shipping_city).length;

    return { total, recoveredCount, recoveredValue, lostValue, conversionRate, days, top, filledContact, filledAddress };
  }, [data]);

  if (isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">লোড হচ্ছে...</div>;

  const maxStarted = Math.max(1, ...stats.days.map((d) => d.started));

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">রিকভারি অ্যানালিটিক্স</h1>
        <p className="text-xs text-muted-foreground mt-1">অসম্পূর্ণ অর্ডার থেকে কনভার্সন ও আয়ের পরিসংখ্যান</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={ShoppingCart} label="মোট অসম্পূর্ণ" value={toBnDigits(stats.total)} />
        <Stat icon={Target} label="রিকভার হয়েছে" value={toBnDigits(stats.recoveredCount)} accent="emerald" />
        <Stat icon={DollarSign} label="রিকভার্ড মূল্য" value={taka(stats.recoveredValue)} accent="primary" />
        <Stat icon={TrendingUp} label="কনভার্সন রেট" value={`${toBnDigits(stats.conversionRate.toFixed(1))}%`} />
      </div>

      <div className="bg-background border border-border rounded-xl p-6">
        <h2 className="font-semibold">কনভার্সন ট্রেন্ড (১৪ দিন)</h2>
        <div className="mt-6 flex items-end gap-1.5 h-48">
          {stats.days.map((d) => {
            const startedH = (d.started / maxStarted) * 100;
            const recoveredH = (d.recovered / maxStarted) * 100;
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5" title={`${d.day}: ${d.started} শুরু, ${d.recovered} রিকভার্ড`}>
                <div className="w-full flex-1 flex flex-col justify-end relative">
                  <div className="w-full bg-muted rounded-t" style={{ height: `${startedH}%` }} />
                  <div className="w-full bg-primary rounded-t absolute bottom-0" style={{ height: `${recoveredH}%` }} />
                </div>
                <span className="text-[9px] text-muted-foreground">{d.day.slice(5)}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 bg-muted rounded-sm" /> শুরু</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 bg-primary rounded-sm" /> রিকভার্ড</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-background border border-border rounded-xl p-6">
          <h2 className="font-semibold">কনভার্সন ফানেল</h2>
          <div className="mt-4 space-y-3">
            <FunnelRow label="চেকআউট শুরু" count={stats.total} max={stats.total} />
            <FunnelRow label="যোগাযোগ পূরণ" count={stats.filledContact} max={stats.total} />
            <FunnelRow label="ঠিকানা পূরণ" count={stats.filledAddress} max={stats.total} />
            <FunnelRow label="অর্ডার সম্পন্ন" count={stats.recoveredCount} max={stats.total} accent />
          </div>
        </div>

        <div className="bg-background border border-border rounded-xl p-6">
          <h2 className="font-semibold">শীর্ষ রিকভার্ড অর্ডার</h2>
          <div className="mt-4 space-y-2 text-sm">
            {stats.top.length === 0 ? (
              <div className="text-xs text-muted-foreground">এখনো কোনো রিকভার্ড অর্ডার নেই</div>
            ) : stats.top.map((r) => (
              <div key={r.id} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <div className="font-medium">{r.customer_name || "অজানা"}</div>
                  <div className="text-[11px] text-muted-foreground">{r.customer_phone || "—"}</div>
                </div>
                <div className="font-semibold text-primary">{taka(Number(r.subtotal ?? 0))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent }: any) {
  const color = accent === "emerald" ? "text-emerald-600 bg-emerald-500/10" : accent === "primary" ? "text-primary bg-primary/10" : "text-foreground bg-muted";
  return (
    <div className="bg-background border border-border rounded-xl p-5">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-md ${color}`}><Icon className="h-4 w-4" /></div>
      <div className="mt-3 text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold mt-0.5">{value}</div>
    </div>
  );
}

function FunnelRow({ label, count, max, accent }: { label: string; count: number; max: number; accent?: boolean }) {
  const pct = max ? (count / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">{toBnDigits(count)} ({toBnDigits(pct.toFixed(0))}%)</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${accent ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
