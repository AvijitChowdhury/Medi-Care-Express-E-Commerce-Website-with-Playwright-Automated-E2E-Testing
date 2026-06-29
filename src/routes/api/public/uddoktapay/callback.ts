import { createFileRoute } from "@tanstack/react-router";

async function handle(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id");
  let invoiceId = url.searchParams.get("invoice_id");

  if (!invoiceId && request.method === "POST") {
    const ct = request.headers.get("content-type") || "";
    try {
      if (ct.includes("application/json")) {
        const j: any = await request.json();
        invoiceId = j.invoice_id ?? null;
      } else {
        const fd = await request.formData();
        invoiceId = (fd.get("invoice_id") as string) ?? null;
      }
    } catch {}
  }

  const origin = url.origin;
  const failRedirect = (msg: string) =>
    Response.redirect(`${origin}/checkout?error=${encodeURIComponent(msg)}`, 302);

  if (!invoiceId) return failRedirect("invoice_id missing");

  const apiKey = process.env.UDDOKTAPAY_API_KEY;
  const baseUrl = process.env.UDDOKTAPAY_BASE_URL;
  if (!apiKey || !baseUrl) return failRedirect("gateway not configured");

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/verify-payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "RT-UDDOKTAPAY-API-KEY": apiKey,
      },
      body: JSON.stringify({ invoice_id: invoiceId }),
    });
    const data: any = await res.json().catch(() => ({}));

    const status = String(data?.status || "").toUpperCase();
    const resolvedOrderId = orderId || data?.metadata?.order_id;
    if (!resolvedOrderId) return failRedirect("order not identified");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (status !== "COMPLETED") {
      await supabaseAdmin
        .from("orders")
        .update({
          uddoktapay_invoice_id: invoiceId,
          uddoktapay_raw: data ?? null,
          payment_status: "unpaid",
        })
        .eq("id", resolvedOrderId);
      return failRedirect(data?.status || "payment not completed");
    }

    const paid = Number(data?.amount ?? 0);
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("total")
      .eq("id", resolvedOrderId)
      .maybeSingle();
    const total = Number(order?.total ?? 0);
    const due = Math.max(0, total - paid);

    await supabaseAdmin
      .from("orders")
      .update({
        uddoktapay_invoice_id: invoiceId,
        uddoktapay_transaction_id: data?.transaction_id ?? null,
        uddoktapay_sender_number: data?.sender_number ?? null,
        uddoktapay_payment_method: data?.payment_method ?? null,
        uddoktapay_raw: data ?? null,
        paid_amount: paid,
        due_amount: due,
        payment_status: due === 0 ? "paid" : "partial",
        status: "confirmed",
      })
      .eq("id", resolvedOrderId);

    return Response.redirect(`${origin}/order/${resolvedOrderId}?paid=1`, 302);
  } catch (e: any) {
    console.error("verify failed", e);
    return failRedirect("verification failed");
  }
}

export const Route = createFileRoute("/api/public/uddoktapay/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
