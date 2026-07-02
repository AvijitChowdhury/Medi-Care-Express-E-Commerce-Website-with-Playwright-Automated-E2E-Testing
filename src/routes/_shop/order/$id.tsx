import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";
import { Download, CheckCircle2, AlertCircle, RotateCw } from "lucide-react";
import jsPDF from "jspdf";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/fb-pixel";
import { z } from "zod";

export const Route = createFileRoute("/_shop/order/$id")({
  validateSearch: z.object({
    paid: z.string().optional(),
    payment: z.string().optional(),
  }),
  head: () => ({ meta: [{ title: "অর্ডার বিবরণী — মেডিকেয়ার" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { paid, payment } = Route.useSearch();
  const [retrying, setRetrying] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["order", id],
    refetchInterval: (q) => {
      // While the payment is being verified server-side, keep polling for the update.
      if (paid !== "1") return false;
      const o: any = (q.state.data as any)?.order;
      if (o && (o.payment_status === "paid" || o.payment_status === "partial") && Number(o.paid_amount ?? 0) > 0) return false;
      return 2500;
    },
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const guestToken = !userData.user ? (typeof window !== "undefined" ? localStorage.getItem(`medi-order-token-${id}`) : null) : null;
      const url = import.meta.env.VITE_SUPABASE_URL as string;
      const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const headers: Record<string, string> = { apikey: key, Authorization: `Bearer ${key}` };
      if (guestToken) headers["x-order-token"] = guestToken;
      else {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) headers.Authorization = `Bearer ${session.access_token}`;
      }
      const [oRes, iRes] = await Promise.all([
        fetch(`${url}/rest/v1/orders?id=eq.${id}&select=*`, { headers }),
        fetch(`${url}/rest/v1/order_items?order_id=eq.${id}&select=*`, { headers }),
      ]);
      const orderArr = await oRes.json();
      const itemsArr = await iRes.json();
      return { order: Array.isArray(orderArr) ? orderArr[0] : null, items: Array.isArray(itemsArr) ? itemsArr : [] };
    },
  });

  // Announce payment result once when returning from the gateway.
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (notifiedRef.current) return;
    const o: any = data?.order;
    if (!o) return;
    if (paid === "1" && (o.payment_status === "paid" || (o.payment_status === "partial" && Number(o.paid_amount ?? 0) > 0))) {
      notifiedRef.current = true;
      toast.success("পেমেন্ট নিশ্চিত হয়েছে");
      refetch();
    } else if (payment === "failed") {
      notifiedRef.current = true;
      toast.error("পেমেন্ট ব্যর্থ হয়েছে, আবার চেষ্টা করুন");
    }
  }, [data, paid, payment, refetch]);


  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current) return;
    const o = data?.order;
    const items = data?.items;
    if (!o || !items) return;
    firedRef.current = true;
    trackEvent("Purchase", {
      content_ids: items.map((it: any) => it.product_id),
      contents: items.map((it: any) => ({ id: it.product_id, quantity: it.qty, item_price: Number(it.unit_price) })),
      num_items: items.reduce((a: number, b: any) => a + b.qty, 0),
      value: Number(o.total),
      currency: "BDT",
      order_id: o.id,
    });
  }, [data]);

  if (isLoading) return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  if (!data?.order) return <div className="container mx-auto px-4 py-20 text-center">অর্ডার পাওয়া যায়নি।</div>;

  const o = data.order;
  const shortId = (o.order_number || o.id.slice(0, 8)).toUpperCase();

  const downloadInvoice = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("MEDICARE - INVOICE", 14, 20);
    doc.setFontSize(10);
    doc.text(`Order #: ${shortId}`, 14, 30);
    doc.text(`Date: ${new Date(o.created_at).toLocaleDateString("en-GB")}`, 14, 36);
    doc.text(`Customer: ${o.customer_name}`, 14, 46);
    doc.text(`Phone: ${o.customer_phone}`, 14, 52);
    doc.text(`Address: ${o.shipping_address}, ${o.shipping_city}`, 14, 58);
    let y = 72;
    doc.text("Items:", 14, y); y += 8;
    data.items.forEach((it: any) => {
      doc.text(`- ${it.qty} x  Tk ${Math.round(it.unit_price)} = Tk ${Math.round(it.unit_price * it.qty)}`, 14, y); y += 6;
    });
    y += 4;
    doc.text(`Subtotal: Tk ${Math.round(o.subtotal)}`, 14, y); y += 6;
    doc.text(`Delivery: Tk ${Math.round(o.delivery_fee)}`, 14, y); y += 6;
    doc.setFontSize(12); doc.text(`Total: Tk ${Math.round(o.total)}`, 14, y); y += 10;

    // Payment details
    doc.setFontSize(11); doc.text("Payment", 14, y); y += 6;
    doc.setFontSize(10);
    const payLabel = o.payment_method === "partial_online" ? "Partial Online (UddoktaPay)" : (o.payment_method || "COD");
    doc.text(`Method: ${payLabel}`, 14, y); y += 6;
    const statusLabel = o.payment_status === "paid" ? "PAID" : o.payment_status === "partial" ? "PARTIALLY PAID" : "UNPAID";
    doc.text(`Status: ${statusLabel}`, 14, y); y += 6;
    if (Number(o.paid_amount ?? 0) > 0) { doc.text(`Paid: Tk ${Math.round(o.paid_amount)}`, 14, y); y += 6; }
    if (Number(o.due_amount ?? 0) > 0) { doc.text(`Due (on delivery): Tk ${Math.round(o.due_amount)}`, 14, y); y += 6; }
    if (o.uddoktapay_payment_method) { doc.text(`Gateway: ${o.uddoktapay_payment_method}`, 14, y); y += 6; }
    if (o.uddoktapay_transaction_id) { doc.text(`Transaction ID: ${o.uddoktapay_transaction_id}`, 14, y); y += 6; }
    if (o.uddoktapay_sender_number) { doc.text(`Sender: ${o.uddoktapay_sender_number}`, 14, y); y += 6; }
    if (o.uddoktapay_invoice_id) { doc.text(`Invoice Ref: ${o.uddoktapay_invoice_id}`, 14, y); y += 6; }

    doc.save(`invoice-${shortId}.pdf`);
  };

  const needsPayment = o.payment_method === "partial_online" && o.payment_status !== "paid" && (o.payment_status !== "partial" || Number(o.paid_amount ?? 0) <= 0);
  const retryPayment = async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/payment/uddoktapay/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: o.id }),
      });
      const json = await res.json();
      if (!res.ok || !json.payment_url) throw new Error(json.error || "পেমেন্ট সংযোগ ব্যর্থ");
      window.location.href = json.payment_url;
    } catch (e: any) {
      toast.error(e.message || "পেমেন্ট সংযোগ ব্যর্থ");
      setRetrying(false);
    }
  };

  const isPaid = o.payment_status === "paid";
  const isPartial = o.payment_status === "partial" && Number(o.paid_amount ?? 0) > 0;
  const verifying = paid === "1" && !isPaid && !isPartial && o.payment_method === "partial_online";

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        {verifying ? (
          <>
            <RotateCw className="h-14 w-14 mx-auto text-primary animate-spin" />
            <h1 className="mt-4 text-2xl font-semibold">পেমেন্ট যাচাই হচ্ছে...</h1>
            <p className="mt-2 text-sm text-muted-foreground">অনুগ্রহ করে অপেক্ষা করুন, আপনার পেমেন্ট নিশ্চিত করা হচ্ছে।</p>
          </>
        ) : needsPayment ? (
          <>
            <AlertCircle className="h-14 w-14 mx-auto text-amber-500" />
            <h1 className="mt-4 text-2xl font-semibold">পেমেন্ট অসম্পূর্ণ</h1>
            <p className="mt-2 text-sm text-muted-foreground">অর্ডার নম্বর <span className="font-mono font-semibold text-foreground">#{shortId}</span> এর পেমেন্ট সম্পন্ন হয়নি। আবার চেষ্টা করুন।</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-14 w-14 mx-auto text-primary" />
            <h1 className="mt-4 text-2xl font-semibold">ধন্যবাদ! অর্ডার নিশ্চিত হয়েছে</h1>
            <p className="mt-2 text-sm text-muted-foreground">আপনার অর্ডার নম্বর <span className="font-mono font-semibold text-foreground">#{shortId}</span></p>
            {(isPaid || isPartial) && (
              <div className="mt-4 inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 px-4 py-1.5 rounded-full text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                {isPaid ? "পেমেন্ট সম্পন্ন" : `অগ্রিম পরিশোধিত: ${taka(o.paid_amount)}`}
              </div>
            )}
          </>
        )}
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          {needsPayment && !verifying && (
            <button disabled={retrying} onClick={retryPayment} className="h-11 px-5 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm inline-flex items-center gap-2 disabled:opacity-60">
              <RotateCw className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} /> {retrying ? "প্রসেস হচ্ছে..." : "পেমেন্ট আবার চেষ্টা করুন"}
            </button>
          )}
          <button onClick={downloadInvoice} className="h-11 px-5 rounded-md bg-primary text-primary-foreground text-sm inline-flex items-center gap-2">
            <Download className="h-4 w-4" /> ইনভয়েস ডাউনলোড
          </button>
          <Link to="/track" search={{ id: shortId } as any} className="h-11 px-5 rounded-md border border-border text-sm inline-flex items-center">অর্ডার ট্র্যাক করুন</Link>
        </div>
      </div>


      <div className="mt-6 bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold">অর্ডার বিবরণী</h2>
        <div className="mt-4 divide-y divide-border">
          {data.items.map((it: any) => (
            <div key={it.id} className="py-3 flex justify-between text-sm">
              <span>{it.name_bn} × {toBnDigits(it.qty)}</span>
              <span>{taka(it.unit_price * it.qty)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">সাবটোটাল</span><span>{taka(o.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">শিপিং</span><span>{taka(o.delivery_fee)}</span></div>
          {Number(o.paid_amount) > 0 && (
            <div className="flex justify-between text-emerald-600"><span>অগ্রিম পরিশোধিত</span><span>− {taka(o.paid_amount)}</span></div>
          )}
          <div className="flex justify-between font-semibold pt-2 border-t border-border"><span>মোট</span><span className="text-primary">{taka(o.total)}</span></div>
          {Number(o.due_amount) > 0 && (
            <div className="flex justify-between text-amber-600 font-medium"><span>বাকি (ডেলিভারিতে)</span><span>{taka(o.due_amount)}</span></div>
          )}
        </div>
        {(o.uddoktapay_transaction_id || o.uddoktapay_invoice_id) && (
          <div className="mt-5 pt-4 border-t border-border text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-foreground mb-1">পেমেন্ট তথ্য</div>
            {o.uddoktapay_payment_method && <div>মাধ্যম: <span className="text-foreground">{o.uddoktapay_payment_method}</span></div>}
            {o.uddoktapay_transaction_id && <div>ট্রানজেকশন ID: <span className="font-mono text-foreground">{o.uddoktapay_transaction_id}</span></div>}
            {o.uddoktapay_sender_number && <div>প্রেরক নম্বর: <span className="font-mono text-foreground">{o.uddoktapay_sender_number}</span></div>}
          </div>
        )}
      </div>
    </div>
  );
}
