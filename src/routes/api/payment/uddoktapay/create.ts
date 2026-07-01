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
              { error: "পেমেন্ট গেটওয়ে কনফিগার করা নেই" },
              { status: 500, headers: CORS },
            );
          }

          const body = (await request.json()) as { order_id?: string };
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

          // Partial online payment: charge delivery fee upfront, rest is COD
          const advance = Math.max(1, Math.round(Number(order.delivery_fee) || 0));

          const origin = new URL(request.url).origin;
          // NOTE: gateway appends ?invoice_id=... to redirect_url — keep the URL param-free
          // so the appended query string is well-formed. order_id is carried via metadata.
          const redirectUrl = `${origin}/api/public/uddoktapay/callback`;
          const cancelUrl = `${origin}/checkout?cancelled=1`;

          // Some gateways reject placeholder domains; fall back to a real-looking address.
          const emailOk = order.customer_email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(order.customer_email);
          const email = emailOk
            ? (order.customer_email as string)
            : `guest.${String(order.customer_phone || "").replace(/\D/g, "") || order.id.slice(0, 8)}@medicare-bd.com`;

          const payload = {
            full_name: order.customer_name || "Guest",
            email,
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
            const msg = json?.message || json?.error || `Gateway ${res.status}`;
            return Response.json(
              { error: msg, details: json ?? text },
              { status: 502, headers: CORS },
            );
          }

          // Stash the invoice_id on the order so we can verify later if the callback misses it.
          if (json.invoice_id) {
            await supabaseAdmin
              .from("orders")
              .update({ uddoktapay_invoice_id: json.invoice_id })
              .eq("id", order.id);
          }

          return Response.json(
            { payment_url: json.payment_url, invoice_id: json.invoice_id, advance },
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
