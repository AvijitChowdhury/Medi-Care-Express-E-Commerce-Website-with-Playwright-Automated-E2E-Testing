import { createFileRoute, Link } from "@tanstack/react-router";
import { useCart } from "@/lib/cart-store";
import { taka, toBnDigits } from "@/lib/format";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/_shop/cart")({
  head: () => ({ meta: [{ title: "কার্ট — মেডিকেয়ার" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal } = useCart();
  const total = subtotal();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <ShoppingBag className="h-14 w-14 mx-auto text-muted-foreground" />
        <h1 className="mt-6 text-2xl font-semibold">কার্ট খালি</h1>
        <p className="mt-2 text-sm text-muted-foreground">কেনাকাটা শুরু করতে নিচের বাটনে ক্লিক করুন।</p>
        <Link to="/products" className="mt-6 inline-flex h-11 px-6 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium">
          পণ্য দেখুন
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">আপনার কার্ট</h1>
      <div className="mt-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-3">
          {items.map((it) => (
            <div key={it.productId} className="flex gap-4 p-4 bg-card border border-border rounded-xl">
              <img src={it.image} alt={it.name_bn} className="h-20 w-20 md:h-24 md:w-24 rounded-lg object-cover bg-secondary" />
              <div className="flex-1 min-w-0">
                <Link to="/products/$slug" params={{ slug: it.slug }} className="text-sm font-medium hover:text-primary line-clamp-2">{it.name_bn}</Link>
                <div className="mt-1 text-primary font-semibold text-sm">{taka(it.price)}</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center border border-border rounded-md">
                    <button onClick={() => setQty(it.productId, it.qty - 1)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-muted"><Minus className="h-3 w-3" /></button>
                    <div className="h-8 w-10 inline-flex items-center justify-center text-xs">{toBnDigits(it.qty)}</div>
                    <button onClick={() => setQty(it.productId, it.qty + 1)} className="h-8 w-8 inline-flex items-center justify-center hover:bg-muted"><Plus className="h-3 w-3" /></button>
                  </div>
                  <button onClick={() => remove(it.productId)} className="text-xs text-destructive hover:underline inline-flex items-center gap-1">
                    <Trash2 className="h-3 w-3" /> মুছুন
                  </button>
                </div>
              </div>
              <div className="text-sm font-semibold">{taka(it.price * it.qty)}</div>
            </div>
          ))}
        </div>

        <aside className="bg-card border border-border rounded-xl p-6 h-fit lg:sticky lg:top-24">
          <h2 className="font-semibold">অর্ডার সারাংশ</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">সাবটোটাল</span><span>{taka(total)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">শিপিং</span><span>চেকআউটে গণনা হবে</span></div>
          </div>
          <div className="mt-4 pt-4 border-t border-border flex justify-between font-semibold">
            <span>মোট</span><span className="text-primary">{taka(total)}</span>
          </div>
          <Link to="/checkout" className="mt-6 w-full h-12 rounded-md bg-primary text-primary-foreground text-sm font-medium inline-flex items-center justify-center">
            চেকআউটে এগিয়ে যান
          </Link>
          <Link to="/products" className="mt-3 w-full h-11 rounded-md border border-border text-sm inline-flex items-center justify-center">
            কেনাকাটা চালিয়ে যান
          </Link>
        </aside>
      </div>
    </div>
  );
}
