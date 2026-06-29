import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE_URL = process.env.STEADFAST_BASE_URL || "https://portal.packzy.com/api/v1";

function sfHeaders() {
  return {
    "Api-Key": process.env.STEADFAST_API_KEY!,
    "Secret-Key": process.env.STEADFAST_SECRET_KEY!,
    "Content-Type": "application/json",
  };
}

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error || !data) throw new Error("Forbidden");
}

function buildInvoice(o: any) {
  return (o.order_number || o.id.slice(0, 8)).toString().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 50) + "-" + Date.now().toString().slice(-5);
}

function payloadFor(o: any) {
  const phone = (o.customer_phone || "").replace(/\D/g, "").slice(-11);
  return {
    invoice: buildInvoice(o),
    recipient_name: (o.customer_name || "Customer").slice(0, 100),
    recipient_phone: phone,
    recipient_address: `${o.shipping_address ?? ""}, ${o.shipping_area ?? ""}, ${o.shipping_city ?? ""}`.slice(0, 250),
    cod_amount: o.payment_method === "cod" ? Number(o.total || 0) : Number(o.due_amount || 0),
    note: o.notes || undefined,
  };
}

export const sendOrderToSteadfast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { data: o, error } = await (context as any).supabase.from("orders").select("*").eq("id", data.order_id).maybeSingle();
    if (error || !o) throw new Error("Order not found");
    if (o.steadfast_consignment_id) return { ok: true, already: true, consignment_id: o.steadfast_consignment_id, tracking_code: o.steadfast_tracking_code };

    const body = payloadFor(o);
    const res = await fetch(`${BASE_URL}/create_order`, { method: "POST", headers: sfHeaders(), body: JSON.stringify(body) });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || json?.status !== 200) throw new Error(json?.message || `Steadfast error (${res.status})`);
    const c = json.consignment;
    await (context as any).supabase.from("orders").update({
      steadfast_consignment_id: c.consignment_id,
      steadfast_tracking_code: c.tracking_code,
      steadfast_status: c.status,
      steadfast_sent_at: new Date().toISOString(),
      steadfast_synced_at: new Date().toISOString(),
      status: o.status === "pending" || o.status === "confirmed" ? "shipped" : o.status,
    }).eq("id", o.id);
    return { ok: true, consignment_id: c.consignment_id, tracking_code: c.tracking_code, status: c.status };
  });

export const sendOrdersBulkToSteadfast = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { order_ids: string[] }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    if (!data.order_ids?.length) return { ok: true, sent: 0, failed: 0, results: [] };
    const { data: orders } = await (context as any).supabase
      .from("orders").select("*").in("id", data.order_ids).is("steadfast_consignment_id", null);

    if (!orders?.length) return { ok: true, sent: 0, failed: 0, skipped: data.order_ids.length, results: [] };

    const idByInvoice = new Map<string, string>();
    const payload = orders.map((o: any) => { const p = payloadFor(o); idByInvoice.set(p.invoice, o.id); return p; });

    const res = await fetch(`${BASE_URL}/create_order/bulk-order`, {
      method: "POST", headers: sfHeaders(),
      body: JSON.stringify({ data: JSON.stringify(payload) }),
    });
    const json: any = await res.json().catch(() => ({}));
    const results: any[] = Array.isArray(json) ? json : (json?.data || []);
    let sent = 0, failed = 0;
    for (const r of results) {
      const orderId = idByInvoice.get(r.invoice);
      if (!orderId) continue;
      if (r.status === "success" && r.consignment_id) {
        sent++;
        await (context as any).supabase.from("orders").update({
          steadfast_consignment_id: r.consignment_id,
          steadfast_tracking_code: r.tracking_code,
          steadfast_status: "in_review",
          steadfast_sent_at: new Date().toISOString(),
          steadfast_synced_at: new Date().toISOString(),
          status: "shipped",
        }).eq("id", orderId);
      } else { failed++; }
    }
    return { ok: true, sent, failed, total: orders.length };
  });

const STATUS_MAP: Record<string, string> = {
  delivered: "delivered", partial_delivered: "delivered",
  cancelled: "cancelled",
};

export const syncSteadfastStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const { data: orders } = await (context as any).supabase
      .from("orders").select("id, steadfast_consignment_id, steadfast_status, status")
      .not("steadfast_consignment_id", "is", null)
      .not("steadfast_status", "in", "(delivered,partial_delivered,cancelled)")
      .limit(100);
    if (!orders?.length) return { ok: true, checked: 0, updated: 0 };

    let updated = 0;
    for (const o of orders) {
      try {
        const res = await fetch(`${BASE_URL}/status_by_cid/${o.steadfast_consignment_id}`, { headers: sfHeaders() });
        const j: any = await res.json().catch(() => ({}));
        const s = j?.delivery_status;
        if (s && s !== o.steadfast_status) {
          const patch: any = { steadfast_status: s, steadfast_synced_at: new Date().toISOString() };
          if (STATUS_MAP[s]) patch.status = STATUS_MAP[s];
          await (context as any).supabase.from("orders").update(patch).eq("id", o.id);
          updated++;
        }
      } catch { /* ignore individual failures */ }
    }
    return { ok: true, checked: orders.length, updated };
  });
