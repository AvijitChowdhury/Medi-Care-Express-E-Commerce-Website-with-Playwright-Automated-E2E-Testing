import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function normalizePhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("88") && digits.length === 13) return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 11) return digits;
  if (digits.length === 10) return "0" + digits;
  return digits;
}

function classify(totalOrders: number, cancelled: number, ratio: number): string {
  if (totalOrders === 0) return "new";
  if (ratio >= 80) return "low";
  if (ratio >= 50) return "medium";
  return "high";
}

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const CACHE_TTL_HOURS = 24;

export const checkPhoneFraud = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string; force?: boolean }) => data)
  .handler(async ({ data }) => {
    const phone = normalizePhone(data.phone);
    if (!phone || phone.length < 10) {
      return { ok: false, error: "অবৈধ ফোন নম্বর" } as const;
    }
    const sb = admin();

    if (!data.force) {
      const { data: cached } = await sb.from("fraud_checks").select("*").eq("phone", phone).maybeSingle();
      if (cached) {
        const age = (Date.now() - new Date(cached.checked_at).getTime()) / 3_600_000;
        if (age < CACHE_TTL_HOURS) {
          return { ok: true, cached: true, ...cached } as any;
        }
      }
    }

    const apiKey = process.env.BDCOURIER_API_KEY;
    const base = process.env.BDCOURIER_BASE_URL || "https://api.bdcourier.com";
    if (!apiKey) return { ok: false, error: "BD Courier API key সেট নেই" } as const;

    let raw: any;
    try {
      const res = await fetch(`${base}/courier-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ phone }),
      });
      const text = await res.text();
      try { raw = JSON.parse(text); } catch { raw = { raw: text }; }
      if (!res.ok) {
        return { ok: false, error: raw?.message || `BD Courier ত্রুটি (${res.status})`, raw } as const;
      }
    } catch (e: any) {
      return { ok: false, error: e?.message || "নেটওয়ার্ক ত্রুটি" } as const;
    }

    // Aggregate counts across all couriers in the response
    const couriers = raw?.courierData || raw?.data?.courierData || raw?.couriers || raw?.data || {};
    let total = 0, success = 0, cancelled = 0;
    const acc = (obj: any) => {
      if (!obj || typeof obj !== "object") return;
      const t = Number(obj.total_parcel ?? obj.total ?? 0);
      const s = Number(obj.success_parcel ?? obj.delivered ?? obj.success ?? 0);
      const c = Number(obj.cancelled_parcel ?? obj.cancel ?? obj.cancelled ?? 0);
      total += isFinite(t) ? t : 0;
      success += isFinite(s) ? s : 0;
      cancelled += isFinite(c) ? c : 0;
    };
    if (raw?.summary) acc(raw.summary);
    else if (Array.isArray(couriers)) couriers.forEach(acc);
    else Object.values(couriers).forEach(acc);

    const ratio = total > 0 ? Math.round((success / total) * 1000) / 10 : 0;
    const level = classify(total, cancelled, ratio);

    await sb.from("fraud_checks").upsert({
      phone,
      total_orders: total,
      total_delivered: success,
      total_cancelled: cancelled,
      success_ratio: ratio,
      risk_level: level,
      raw,
      checked_at: new Date().toISOString(),
    });

    return {
      ok: true,
      cached: false,
      phone,
      total_orders: total,
      total_delivered: success,
      total_cancelled: cancelled,
      success_ratio: ratio,
      risk_level: level,
      raw,
    } as any;
  });

export const attachFraudToOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data }) => {
    const sb = admin();
    const { data: order } = await sb.from("orders").select("id, customer_phone").eq("id", data.order_id).maybeSingle();
    if (!order?.customer_phone) return { ok: false, error: "অর্ডার পাওয়া যায়নি" } as const;
    const result: any = await (checkPhoneFraud as any)({ data: { phone: order.customer_phone } });
    if (!result?.ok) return result;
    await sb.from("orders").update({
      fraud_risk_level: result.risk_level,
      fraud_total_orders: result.total_orders,
      fraud_total_cancelled: result.total_cancelled,
      fraud_success_ratio: result.success_ratio,
      fraud_checked_at: new Date().toISOString(),
    }).eq("id", data.order_id);
    return result;
  });

export const testBdCourierConnection = createServerFn({ method: "POST" }).handler(async () => {
  const apiKey = process.env.BDCOURIER_API_KEY;
  if (!apiKey) return { ok: false, error: "API key সেট নেই" } as const;
  try {
    const res = await fetch(`${process.env.BDCOURIER_BASE_URL || "https://api.bdcourier.com"}/courier-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ phone: "01700000000" }),
    });
    return { ok: res.ok, status: res.status } as const;
  } catch (e: any) {
    return { ok: false, error: e?.message } as const;
  }
});
