import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { taka, toBnDigits } from "@/lib/format";
import { Download, CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_shop/order/$id")({
  head: () => ({ meta: [{ title: "অর্ডার বিবরণী — মেডিকেয়ার" }] }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
      const { data: itemsData } = await supabase.from("order_items").select("*").eq("order_id", id);
      return { order, items: itemsData ?? [] };
    },
  });

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
    doc.setFontSize(12); doc.text(`Total: Tk ${Math.round(o.total)}`, 14, y);
    doc.save(`invoice-${shortId}.pdf`);
  };

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 max-w-3xl">
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <CheckCircle2 className="h-14 w-14 mx-auto text-primary" />
        <h1 className="mt-4 text-2xl font-semibold">ধন্যবাদ! অর্ডার নিশ্চিত হয়েছে</h1>
        <p className="mt-2 text-sm text-muted-foreground">আপনার অর্ডার নম্বর <span className="font-mono font-semibold text-foreground">#{shortId}</span></p>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
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
          <div className="flex justify-between font-semibold pt-2 border-t border-border"><span>মোট</span><span className="text-primary">{taka(o.total)}</span></div>
        </div>
      </div>
    </div>
  );
}
