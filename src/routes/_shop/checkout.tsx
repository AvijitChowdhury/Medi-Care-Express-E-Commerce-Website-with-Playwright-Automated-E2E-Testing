import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart-store";
import { taka, toBnDigits } from "@/lib/format";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { trackEvent } from "@/lib/fb-pixel";
import { checkFraudCached } from "@/lib/fraud-client";

export const Route = createFileRoute("/_shop/checkout")({
  head: () => ({ meta: [{ title: "চেকআউট — মেডিকেয়ার" }] }),
  component: Checkout,
});

type PaymentMethod = "cod" | "partial_online";
const DHAKA_SHIPPING = 70;
const OUTSIDE_SHIPPING = 130;

function getCheckoutSession() {
  if (typeof window === "undefined") return { id: "", token: "" };
  let id = localStorage.getItem("medi-checkout-session");
  let token = localStorage.getItem("medi-checkout-token");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("medi-checkout-session", id);
  }
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem("medi-checkout-token", token);
  }
  return { id, token };
}

function Checkout() {
  const navigate = useNavigate();
  const { items, setQty, remove, subtotal, clear } = useCart();
  const [loading, setLoading] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const sessionIdRef = useRef<string>("");
  const tokenRef = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [form, setForm] = useState({
    name: "", phone: "", email: "", address: "", city: "", area: "dhaka",
    payment: "cod" as PaymentMethod,
    notes: "",
  });
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);


  useEffect(() => {
    const s = getCheckoutSession();
    sessionIdRef.current = s.id;
    tokenRef.current = s.token;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setIsAuthed(true);
        setForm((f) => ({ ...f, email: data.user!.email ?? "" }));
      }
    });
  }, []);

  useEffect(() => {
    if (!sessionIdRef.current) return;
    const hasAny = form.name || form.phone || form.email || form.address || form.city;
    if (!hasAny || items.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await supabase.rpc("upsert_incomplete_order", {
        p_session_id: sessionIdRef.current,
        p_access_token: tokenRef.current,
        p_customer_name: form.name || "",
        p_customer_phone: form.phone || "",
        p_customer_email: form.email || "",
        p_shipping_address: form.address || "",
        p_shipping_city: form.city || "",
        p_shipping_area: form.area || "",
        p_payment_method: form.payment,
        p_notes: form.notes || "",
        p_cart: items as any,
        p_subtotal: subtotal(),
      } as any);
    }, 800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [form, items, subtotal]);


  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">কার্ট খালি</h1>
        <Link to="/products" className="mt-6 inline-flex h-11 px-6 items-center rounded-md bg-primary text-primary-foreground text-sm">পণ্য দেখুন</Link>
      </div>
    );
  }

  const sub = subtotal();
  const shipping = form.area === "dhaka" ? DHAKA_SHIPPING : OUTSIDE_SHIPPING;
  const discount = coupon?.discount ?? 0;
  const total = Math.max(0, sub - discount) + shipping;
  const advance = form.payment === "partial_online" ? shipping : 0;
  const due = total - advance;

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponBusy(true);
    const { data, error } = await supabase.rpc("apply_coupon", { p_code: code, p_subtotal: sub } as any);
    setCouponBusy(false);
    if (error) { toast.error(error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) { toast.error("কুপন প্রয়োগ করা যায়নি"); return; }
    setCoupon({ code: row.code, discount: Number(row.discount) });
    toast.success(`কুপন প্রয়োগ হয়েছে: ${taka(Number(row.discount))} ছাড়`);
  };
  const removeCoupon = () => { setCoupon(null); setCouponInput(""); };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address || !form.city) {
      toast.error("সব তথ্য পূরণ করুন");
      return;
    }
    // Optional fraud check (admin-controlled via site_settings.fraud_auto_check_checkout)
    try {
      const { data: sRows } = await supabase.rpc("get_checkout_fraud_flags");
      const s = Array.isArray(sRows) ? sRows[0] : sRows;
      if (s?.fraud_check_enabled && s?.fraud_auto_check_checkout) {
        const fr: any = await checkFraudCached(form.phone);
        if (fr?.ok && fr.risk_level === "high") {
          const ok = confirm(`⚠️ এই নম্বরে পূর্বের কুরিয়ার ইতিহাসে ঝুঁকি পাওয়া গেছে (সফলতা ${fr.success_ratio}%).\nতবুও অর্ডার চালিয়ে যাবেন?`);
          if (!ok) return;
        }
      }
    } catch {}
    setLoading(true);
    trackEvent("InitiateCheckout", {
      content_ids: items.map((i) => i.productId),
      contents: items.map((i) => ({ id: i.productId, quantity: i.qty, item_price: i.price })),
      num_items: items.reduce((a, b) => a + b.qty, 0),
      value: total,
      currency: "BDT",
    });
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: order, error } = await supabase.from("orders").insert({
        user_id: userData.user?.id ?? null,
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: form.email || null,
        shipping_address: form.address,
        shipping_city: form.city,
        shipping_area: form.area,
        subtotal: sub,
        delivery_fee: shipping,
        discount_amount: discount,
        coupon_code: coupon?.code ?? null,
        total,
        payment_method: form.payment,
        payment_status: form.payment === "partial_online" ? "partial" : "unpaid",
        paid_amount: 0,
        due_amount: due,
        status: "pending",
        is_complete: true,
        notes: form.notes || null,
      } as any).select().single();

      if (error) throw error;

      if (coupon?.code) {
        await supabase.rpc("increment_coupon_usage", { p_code: coupon.code } as any);
      }


      const { error: itemErr } = await supabase.from("order_items").insert(
        items.map((it) => ({
          order_id: order.id,
          product_id: it.productId,
          name_bn: it.name_bn,
          unit_price: it.price,
          qty: it.qty,
          image_url: it.image,
        }))
      );
      if (itemErr) throw itemErr;

      if (sessionIdRef.current && tokenRef.current) {
        await supabase.rpc("mark_incomplete_order_recovered", {
          p_session_id: sessionIdRef.current,
          p_access_token: tokenRef.current,
          p_order_id: order.id,
        });
        localStorage.removeItem("medi-checkout-session");
        localStorage.removeItem("medi-checkout-token");
      }

      // Save guest order token so the order page can read it back via RLS
      if (!userData.user && (order as any).access_token) {
        try { localStorage.setItem(`medi-order-token-${order.id}`, (order as any).access_token); } catch {}
      }


      if (form.payment === "partial_online") {
        toast.info("পেমেন্ট পেজে নিয়ে যাওয়া হচ্ছে...");
        const res = await fetch("/api/payment/uddoktapay/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_id: order.id }),
        });
        const json = await res.json();
        if (!res.ok || !json.payment_url) {
          throw new Error(json.error || "পেমেন্ট গেটওয়ে সংযোগ ব্যর্থ");
        }
        clear();
        // Gateway sends X-Frame-Options: SAMEORIGIN — cannot load in any iframe (Lovable preview, etc.).
        // Try top-window navigation; if blocked by cross-origin sandbox, open in a new tab.
        const url = json.payment_url as string;
        let navigated = false;
        try {
          if (window.top && window.top !== window.self) {
            (window.top as Window).location.href = url;
            navigated = true;
          } else {
            window.location.href = url;
            navigated = true;
          }
        } catch {
          navigated = false;
        }
        if (!navigated) {
          const win = window.open(url, "_blank", "noopener,noreferrer");
          if (!win) {
            toast.info("পেমেন্ট পেজ খুলতে নিচের বাটনে ক্লিক করুন");
            // Render a fallback link the user can click (popup blocker safe)
            const a = document.createElement("a");
            a.href = url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = "পেমেন্ট সম্পন্ন করুন";
            a.className = "fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-full bg-emerald-600 text-white shadow-lg";
            document.body.appendChild(a);
          }
        }
        return;
      }

      clear();
      toast.success("অর্ডার সফলভাবে দেওয়া হয়েছে");
      navigate({ to: "/order/$id", params: { id: order.id } });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "অর্ডার দিতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">চেকআউট</h1>

      {!isAuthed && (
        <div className="mt-4 bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm flex flex-wrap items-center justify-between gap-3">
          <span>আপনি গেস্ট হিসেবে অর্ডার দিচ্ছেন। অর্ডার ট্র্যাক ও ইতিহাস সংরক্ষণের জন্য চাইলে লগইন করতে পারেন।</span>
          <Link to="/login" className="inline-flex h-9 px-4 items-center rounded-md bg-primary text-primary-foreground text-xs font-medium">লগইন করুন</Link>
        </div>
      )}

      <form onSubmit={placeOrder} className="mt-8 grid lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-6">
          <Card title="ডেলিভারি তথ্য">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="পুরো নাম *"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} /></Field>
              <Field label="মোবাইল নম্বর *"><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={input} placeholder="01XXXXXXXXX" /></Field>
              <Field label="ইমেইল"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={input} /></Field>
              <Field label="শহর/জেলা *"><input required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={input} /></Field>
              <Field label="সম্পূর্ণ ঠিকানা *" full><textarea required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={input + " min-h-[88px]"} /></Field>
              <Field label="অর্ডার এলাকা *" full>
                <div className="grid grid-cols-2 gap-3">
                  {[{ v: "dhaka", l: "ঢাকার ভিতরে", c: DHAKA_SHIPPING }, { v: "outside", l: "ঢাকার বাইরে", c: OUTSIDE_SHIPPING }].map((o) => (
                    <label key={o.v} className={`border rounded-md p-3 cursor-pointer text-sm ${form.area === o.v ? "border-primary bg-primary/5" : "border-border"}`}>
                      <input type="radio" name="area" className="hidden" checked={form.area === o.v} onChange={() => setForm({ ...form, area: o.v })} />
                      <div className="font-medium">{o.l}</div>
                      <div className="text-xs text-muted-foreground mt-1">শিপিং {taka(o.c)}</div>
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="নোট (ঐচ্ছিক)" full><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={input} /></Field>
            </div>
          </Card>

          <Card title="পেমেন্ট মাধ্যম">
            <div className="space-y-3">
              {[
                { v: "cod" as const, l: "ক্যাশ অন ডেলিভারি", d: "পণ্য হাতে পেয়ে পরিশোধ করুন" },
                { v: "partial_online" as const, l: "অনলাইনে আংশিক পেমেন্ট", d: `শুধু ডেলিভারি চার্জ ${taka(shipping)} এখন অনলাইনে দিন • পণ্যের ${taka(sub)} ডেলিভারিতে নগদে` },
              ].map((o) => (
                <label key={o.v} className={`flex gap-3 items-start border rounded-md p-4 cursor-pointer ${form.payment === o.v ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input type="radio" name="pay" className="mt-1" checked={form.payment === o.v} onChange={() => setForm({ ...form, payment: o.v as any })} />
                  <div>
                    <div className="font-medium text-sm">{o.l}</div>
                    <div className="text-xs text-muted-foreground mt-1">{o.d}</div>
                  </div>
                </label>
              ))}
            </div>
          </Card>
        </div>

        <aside className="bg-card border border-border rounded-xl p-6 h-fit lg:sticky lg:top-24">
          <h2 className="font-semibold">অর্ডার সারাংশ</h2>
          <div className="mt-4 space-y-3 max-h-72 overflow-y-auto">
            {items.map((it) => (
              <div key={it.productId} className="flex gap-3 text-sm">
                <img src={it.image} alt="" className="h-14 w-14 rounded object-cover bg-secondary" />
                <div className="flex-1 min-w-0">
                  <div className="line-clamp-2 text-xs">{it.name_bn}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex items-center border border-border rounded">
                      <button type="button" onClick={() => setQty(it.productId, it.qty - 1)} className="h-6 w-6 inline-flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                      <div className="h-6 w-7 inline-flex items-center justify-center text-xs">{toBnDigits(it.qty)}</div>
                      <button type="button" onClick={() => setQty(it.productId, it.qty + 1)} className="h-6 w-6 inline-flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                    </div>
                    <button type="button" onClick={() => remove(it.productId)} className="text-destructive"><Trash2 className="h-3 w-3" /></button>
                  </div>
                </div>
                <div className="text-xs font-medium">{taka(it.price * it.qty)}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            {coupon ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2 text-sm">
                <span className="text-emerald-700">কুপন <strong className="font-mono">{coupon.code}</strong> প্রয়োগ হয়েছে</span>
                <button type="button" onClick={removeCoupon} className="text-xs text-destructive">সরান</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="কুপন কোড" className="flex-1 h-10 px-3 rounded-md border border-input bg-background text-sm font-mono" />
                <button type="button" onClick={applyCoupon} disabled={couponBusy || !couponInput.trim()} className="h-10 px-4 rounded-md border border-primary text-primary text-sm disabled:opacity-50">
                  {couponBusy ? "..." : "প্রয়োগ"}
                </button>
              </div>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
            <Row k="সাবটোটাল" v={taka(sub)} />
            {discount > 0 && <Row k="ছাড়" v={`- ${taka(discount)}`} accent />}
            <Row k="শিপিং" v={taka(shipping)} />
            {form.payment === "partial_online" && <Row k="অগ্রিম পেমেন্ট" v={taka(advance)} accent />}
          </div>

          <div className="mt-3 pt-3 border-t border-border flex justify-between font-semibold">
            <span>মোট</span><span className="text-primary">{taka(total)}</span>
          </div>
          <button disabled={loading} className="mt-6 w-full h-12 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
            {loading ? "প্রসেস হচ্ছে..." : "অর্ডার নিশ্চিত করুন"}
          </button>
        </aside>
      </form>
    </div>
  );
}

const input = "w-full h-10 px-3 rounded-md border border-input bg-background outline-none focus-visible:ring-1 focus-visible:ring-ring text-sm";

function Field({ label, children, full }: any) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-medium block mb-1.5">{label}</span>
      {children}
    </label>
  );
}
function Card({ title, children }: any) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h2 className="font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className={accent ? "text-primary font-medium" : ""}>{v}</span></div>;
}
