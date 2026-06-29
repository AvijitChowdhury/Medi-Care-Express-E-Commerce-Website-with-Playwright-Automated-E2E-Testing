import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export const Route = createFileRoute("/api/payment/uddoktapay/create")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.UDDOKTAPAY_API_KEY;
          const baseUrl = process.env.UDDOKTAPAY_BASE_URL;
          if (!apiKey || !baseUrl) {
            return Response.json(
              { error: "Payment gateway not configured" },
              { status: 500, headers: CORS },
            );
          }

          const body = (await request.json()) as {
            order_id?: string;
          };
          if (!body.order_id) {
            return Response.json({ error: "order_id required" }, { status: 400, headers: CORS });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: order, error } = await supabaseAdmin
            .from("orders")
            .select("id, order_number, customer_name, customer_email, customer_phone, subtotal, delivery_fee, total, payment_method, due_amount")
            .eq("id", body.order_id)
            .maybeSingle();

          if (error || !order) {
            return Response.json({ error: "Order not found" }, { status: 404, headers: CORS });
          }

          // Advance = max(10% of subtotal, delivery_fee), per app logic
          const advance = Math.max(
            Math.round(Number(order.subtotal) * 0.1),
            Number(order.delivery_fee),
          );

          const origin = new URL(request.url).origin;
          const redirectUrl = `${origin}/api/public/uddoktapay/callback?order_id=${order.id}`;
          const cancelUrl = `${origin}/checkout?cancelled=1`;

          const payload = {
            full_name: order.customer_name,
            email: order.customer_email || `guest+${order.id}@medicare.local`,
            amount: String(advance),
            metadata: { order_id: order.id, order_number: order.order_number },
            redirect_url: redirectUrl,
            return_type: "GET",
            cancel_url: cancelUrl,
          };

          const res = await fetch(`${baseUrl.replace(/\/$/, "")}/checkout-v2`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "RT-UDDOKTAPAY-API-KEY": apiKey,
            },
            body: JSON.stringify(payload),
          });

          const text = await res.text();
          let json: any = null;
          try { json = JSON.parse(text); } catch {}
          if (!res.ok || !json?.payment_url) {
            console.error("UddoktaPay create failed", res.status, text);
            return Response.json(
              { error: json?.message || "Failed to create payment", details: json ?? text },
              { status: 502, headers: CORS },
            );
          }

          return Response.json(
            { payment_url: json.payment_url, advance },
            { headers: CORS },
          );
        } catch (e: any) {
          console.error(e);
          return Response.json({ error: e.message || "Server error" }, { status: 500, headers: CORS });
        }
      },
    },
  },
});
