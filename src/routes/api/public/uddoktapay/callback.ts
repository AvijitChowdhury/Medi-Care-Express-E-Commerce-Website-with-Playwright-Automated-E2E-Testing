import { createFileRoute } from "@tanstack/react-router";

function uddoktaApiUrl(baseUrl: string, path: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  const apiBase = trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  return `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
}

async function handle(request: Request) {
  const url = new URL(request.url);
  let invoiceId = url.searchParams.get("invoice_id");
  let orderId = url.searchParams.get("order_id");

  if (!invoiceId && request.method === "POST") {
    const ct = request.headers.get("content-type") || "";
    try {
      if (ct.includes("application/json")) {
        const j: any = await request.json();
        invoiceId = j.invoice_id ?? null;
        orderId = orderId || j?.metadata?.order_id || null;
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
    const res = await fetch(uddoktaApiUrl(baseUrl, "/verify-payment"), {
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Resolve order_id: query param → metadata → lookup by invoice_id
    let resolvedOrderId = orderId || data?.metadata?.order_id || null;
    if (!resolvedOrderId) {
      const { data: found } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("uddoktapay_invoice_id", invoiceId)
        .maybeSingle();
      resolvedOrderId = found?.id || null;
    }
    if (!resolvedOrderId) return failRedirect("order not identified");

    if (status !== "COMPLETED") {
      await supabaseAdmin
        .from("orders")
        .update({
          uddoktapay_invoice_id: invoiceId,
          uddoktapay_raw: data ?? null,
          payment_status: "unpaid",
        })
        .eq("id", resolvedOrderId);
      return Response.redirect(`${origin}/order/${resolvedOrderId}?payment=failed`, 302);
    }

    const paid = Number(data?.amount ?? data?.charged_amount ?? 0);
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
