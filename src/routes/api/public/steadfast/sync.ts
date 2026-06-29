import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.STEADFAST_BASE_URL || "https://portal.packzy.com/api/v1";

const STATUS_MAP: Record<string, string> = {
  delivered: "delivered", partial_delivered: "delivered", cancelled: "cancelled",
};

async function handle() {
  const apiKey = process.env.STEADFAST_API_KEY;
  const secret = process.env.STEADFAST_SECRET_KEY;
  if (!apiKey || !secret) return new Response(JSON.stringify({ error: "missing creds" }), { status: 500 });
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: orders } = await sb.from("orders")
    .select("id, steadfast_consignment_id, steadfast_status")
    .not("steadfast_consignment_id", "is", null)
    .not("steadfast_status", "in", "(delivered,partial_delivered,cancelled)")
    .limit(200);

  let updated = 0;
  for (const o of orders ?? []) {
    try {
      const res = await fetch(`${BASE_URL}/status_by_cid/${o.steadfast_consignment_id}`, {
        headers: { "Api-Key": apiKey, "Secret-Key": secret, "Content-Type": "application/json" },
      });
      const j: any = await res.json().catch(() => ({}));
      const s = j?.delivery_status;
      if (s && s !== o.steadfast_status) {
        const patch: any = { steadfast_status: s, steadfast_synced_at: new Date().toISOString() };
        if (STATUS_MAP[s]) patch.status = STATUS_MAP[s];
        await sb.from("orders").update(patch).eq("id", o.id);
        updated++;
      }
    } catch { /* ignore */ }
  }
  return new Response(JSON.stringify({ ok: true, checked: orders?.length ?? 0, updated }), {
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/steadfast/sync")({
  server: { handlers: { GET: handle, POST: handle } },
});
