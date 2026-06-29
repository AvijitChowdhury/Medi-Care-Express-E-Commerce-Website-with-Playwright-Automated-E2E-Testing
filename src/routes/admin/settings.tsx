import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Shield } from "lucide-react";
import { testBdCourierConnection } from "@/lib/fraud.functions";

export const Route = createFileRoute("/admin/settings")({
  component: Settings,
});

async function fetchAll() {
  const [s, a, b] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("announcements").select("*").order("sort_order"),
    supabase.from("banners").select("*").order("sort_order"),
  ]);
  return { settings: s.data, announcements: a.data ?? [], banners: b.data ?? [] };
}

function Settings() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "settings"], queryFn: fetchAll });
  const [settings, setSettings] = useState<any>(null);
  useEffect(() => { if (data?.settings) setSettings(data.settings); }, [data]);

  const testConn = useServerFn(testBdCourierConnection);
  const [testing, setTesting] = useState(false);

  const saveSettings = async () => {
    const { error } = await supabase.from("site_settings").update({
      delivery_fee_inside: Number(settings.delivery_fee_inside),
      delivery_fee_outside: Number(settings.delivery_fee_outside),
      advance_percent: Number(settings.advance_percent),
      contact_phone: settings.contact_phone, contact_email: settings.contact_email,
      fraud_check_enabled: !!settings.fraud_check_enabled,
      fraud_auto_check_checkout: !!settings.fraud_auto_check_checkout,
      fraud_auto_check_admin_create: !!settings.fraud_auto_check_admin_create,
    } as any).eq("id", 1);
    if (error) { toast.error(error.message); return; }
    toast.success("সেটিংস আপডেট হয়েছে");
  };

  const runTest = async () => {
    setTesting(true);
    try {
      const r: any = await testConn({});
      if (r?.ok) toast.success("BD Courier সংযোগ সফল ✓");
      else toast.error(r?.error || `সংযোগ ব্যর্থ (${r?.status ?? ""})`);
    } finally { setTesting(false); }
  };

  const addAnn = async () => {
    const text = prompt("ঘোষণার টেক্সট");
    if (!text) return;
    await supabase.from("announcements").insert({ text_bn: text });
    qc.invalidateQueries({ queryKey: ["admin", "settings"] });
  };
  const delAnn = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "settings"] });
  };
  const toggleAnn = async (id: string, v: boolean) => {
    await supabase.from("announcements").update({ is_active: !v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "settings"] });
  };
  const toggleBanner = async (id: string, v: boolean) => {
    await supabase.from("banners").update({ is_active: !v }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["admin", "settings"] });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl">
      <h1 className="text-2xl font-semibold tracking-tight">সেটিংস</h1>

      {settings && (
        <Card title="ডেলিভারি ও পেমেন্ট">
          <div className="grid md:grid-cols-2 gap-4">
            <F label="ঢাকার ভিতরে চার্জ"><input type="number" className={inp} value={settings.delivery_fee_inside} onChange={(e) => setSettings({ ...settings, delivery_fee_inside: e.target.value })} /></F>
            <F label="ঢাকার বাইরে চার্জ"><input type="number" className={inp} value={settings.delivery_fee_outside} onChange={(e) => setSettings({ ...settings, delivery_fee_outside: e.target.value })} /></F>
            <F label="অগ্রিম %"><input type="number" className={inp} value={settings.advance_percent} onChange={(e) => setSettings({ ...settings, advance_percent: e.target.value })} /></F>
            <F label="যোগাযোগ ফোন"><input className={inp} value={settings.contact_phone ?? ""} onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })} /></F>
            <F label="যোগাযোগ ইমেইল" full><input className={inp} value={settings.contact_email ?? ""} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })} /></F>
          </div>
          <button onClick={saveSettings} className="mt-4 h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium">সংরক্ষণ</button>
        </Card>
      )}

      {settings && (
        <Card title={<span className="inline-flex items-center gap-2"><Shield className="h-4 w-4 text-amber-600" /> ফ্রড চেক (BD Courier)</span>}
          action={<button onClick={runTest} disabled={testing} className="text-xs px-3 h-8 rounded-md border border-border disabled:opacity-50">{testing ? "টেস্টিং..." : "কানেকশন টেস্ট"}</button>}>
          <div className="space-y-3 text-sm">
            <div className="text-xs text-muted-foreground">API key পরিবর্তন করতে চাইলে ব্যাকএন্ড সিক্রেট হিসেবে <code className="px-1 py-0.5 rounded bg-muted">BDCOURIER_API_KEY</code> আপডেট করুন।</div>
            <label className="flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer">
              <input type="checkbox" checked={!!settings.fraud_check_enabled} onChange={(e) => setSettings({ ...settings, fraud_check_enabled: e.target.checked })} />
              <div><div className="font-medium">ফ্রড চেক সক্রিয়</div><div className="text-xs text-muted-foreground">এডমিন প্যানেল ও চেকআউটে ফ্রড স্ক্যান চালু/বন্ধ</div></div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer">
              <input type="checkbox" checked={!!settings.fraud_auto_check_admin_create} onChange={(e) => setSettings({ ...settings, fraud_auto_check_admin_create: e.target.checked })} />
              <div><div className="font-medium">এডমিন ম্যানুয়াল অর্ডারে অটো-চেক</div><div className="text-xs text-muted-foreground">নতুন ম্যানুয়াল অর্ডার তৈরির সময় ফোন স্ক্যান</div></div>
            </label>
            <label className="flex items-center gap-3 p-3 border border-border rounded-md cursor-pointer">
              <input type="checkbox" checked={!!settings.fraud_auto_check_checkout} onChange={(e) => setSettings({ ...settings, fraud_auto_check_checkout: e.target.checked })} />
              <div><div className="font-medium">চেকআউটে অটো-চেক</div><div className="text-xs text-muted-foreground">গ্রাহকের ফোন নম্বর প্লেস অর্ডারের আগে স্ক্যান (সেশন প্রতি একবার)</div></div>
            </label>
          </div>
          <button onClick={saveSettings} className="mt-4 h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium">সংরক্ষণ</button>
        </Card>
      )}



      <Card title="ঘোষণা (টপ বার)" action={<button onClick={addAnn} className="text-xs text-primary inline-flex items-center gap-1"><Plus className="h-3 w-3" /> যোগ করুন</button>}>
        <div className="space-y-2">
          {data?.announcements.map((a) => (
            <div key={a.id} className="flex items-center gap-3 p-3 border border-border rounded-md">
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={a.is_active} onChange={() => toggleAnn(a.id, a.is_active)} /></label>
              <div className="flex-1 text-sm">{a.text_bn}</div>
              <button onClick={() => delAnn(a.id)} className="p-1.5 text-destructive hover:bg-muted rounded"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
      </Card>

      <Card title="ব্যানার">
        <div className="grid md:grid-cols-2 gap-3">
          {data?.banners.map((b) => (
            <div key={b.id} className="border border-border rounded-md p-3">
              <div className="text-xs text-muted-foreground mb-1">{b.position}</div>
              <div className="text-sm font-medium">{b.title_bn || "—"}</div>
              <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={b.is_active} onChange={() => toggleBanner(b.id, b.is_active)} /> অ্যাক্টিভ</label>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

const inp = "w-full h-10 px-3 rounded-md border border-input bg-background text-sm";
function F({ label, children, full }: any) {
  return <label className={`block ${full ? "md:col-span-2" : ""}`}><span className="text-xs font-medium block mb-1.5">{label}</span>{children}</label>;
}
function Card({ title, children, action }: any) {
  return (
    <div className="bg-background border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">{title}</h2>{action}</div>
      {children}
    </div>
  );
}
