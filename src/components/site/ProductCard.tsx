import { Link } from "@tanstack/react-router";
import { img } from "@/lib/images";
import { taka, toBnDigits } from "@/lib/format";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";

type P = {
  id: string;
  name_bn: string;
  slug: string;
  price: number;
  compare_at_price?: number | null;
  images: string[];
};

export function ProductCard({ p }: { p: P }) {
  const add = useCart((s) => s.add);
  const discount = p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
    ? Math.round(((Number(p.compare_at_price) - Number(p.price)) / Number(p.compare_at_price)) * 100)
    : 0;

  return (
    <div className="group">
      <Link to="/products/$slug" params={{ slug: p.slug }} className="block">
        <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
          <img
            src={img(p.images?.[0])}
            alt={p.name_bn}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {discount > 0 && (
            <span className="absolute top-3 left-3 bg-accent text-accent-foreground text-[10px] px-2 py-1 rounded-full font-medium">
              -{toBnDigits(discount)}%
            </span>
          )}
        </div>
      </Link>
      <div className="pt-3 px-1">
        <Link to="/products/$slug" params={{ slug: p.slug }}>
          <h3 className="text-sm font-medium text-foreground line-clamp-2 min-h-[2.5rem] hover:text-primary transition-colors">
            {p.name_bn}
          </h3>
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-base font-semibold text-primary">{taka(p.price)}</span>
          {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
            <span className="text-xs text-muted-foreground line-through">{taka(p.compare_at_price)}</span>
          )}
        </div>
        <button
          onClick={() => {
            add({ productId: p.id, slug: p.slug, name_bn: p.name_bn, price: Number(p.price), image: img(p.images?.[0]) });
            toast.success("কার্টে যোগ হয়েছে");
          }}
          className="mt-3 w-full h-9 rounded-md border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors text-sm flex items-center justify-center gap-2"
        >
          <ShoppingBag className="h-4 w-4" />
          কার্টে যোগ করুন
        </button>
      </div>
    </div>
  );
}
