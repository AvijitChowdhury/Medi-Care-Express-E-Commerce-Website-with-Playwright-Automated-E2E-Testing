import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";
import { z } from "zod";

export const Route = createFileRoute("/_shop/track")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({ meta: [{ title: "অর্ডার ট্র্যাক — মেডিকেয়ার" }] }),
  component: Track,
});

const labels: Record<string, string> = {
  pending: "অর্ডার গ্রহণ করা হয়েছে",
  confirmed: "নিশ্চিত করা হয়েছে",
  processing: "প্রসেসিং চলছে",
  shipped: "ডেলিভারিতে পাঠানো হয়েছে",
  delivered: "ডেলিভারি সম্পন্ন",
  cancelled: "বাতিল",
};

function Track() {
  const { id } = Route.useSearch();
  const [code, setCode] = useState(id ?? "");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const search = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(""); setResult(null); setLoading(true);
    const clean = code.trim().toLowerCase();
    if (!clean) { setLoading(false); return; }
    const { data } = await supabase.from("orders").select("*").ilike("id", `${clean}%`).limit(1).maybeSingle();
    if (!data) setError("এই নম্বরে কোনো অর্ডার পাওয়া যায়নি");
    else setResult(data);
    setLoading(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">অর্ডার ট্র্যাক করুন</h1>
      <p className="mt-2 text-sm text-muted-foreground">অর্ডার নম্বরটি দিন (যেমন: A1B2C3D4)</p>

      <form onSubmit={search} className="mt-6 flex gap-2">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="অর্ডার নম্বর" className="flex-1 h-11 px-3 rounded-md border border-input bg-background text-sm" />
        <button disabled={loading} className="h-11 px-5 rounded-md bg-primary text-primary-foreground text-sm">খুঁজুন</button>
      </form>

      {error && <div className="mt-6 text-sm text-destructive">{error}</div>}

      {result && (
        <div className="mt-8 bg-card border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">অর্ডার নম্বর</div>
              <div className="font-mono font-semibold">#{result.id.slice(0, 8).toUpperCase()}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">মোট</div>
              <div className="font-semibold text-primary">{taka(result.total)}</div>
            </div>
          </div>
          <div className="mt-6">
            <div className="text-xs text-muted-foreground mb-2">বর্তমান অবস্থা</div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              {labels[result.status] ?? result.status}
            </div>
          </div>
          <div className="mt-6 text-sm space-y-1">
            <div><span className="text-muted-foreground">নাম:</span> {result.customer_name}</div>
            <div><span className="text-muted-foreground">মোবাইল:</span> {result.customer_phone}</div>
            <div><span className="text-muted-foreground">ঠিকানা:</span> {result.shipping_address}, {result.shipping_city}</div>
          </div>
        </div>
      )}
    </div>
  );
}
