import { Link } from "@tanstack/react-router";
import { img } from "@/lib/images";
import { taka, toBnDigits } from "@/lib/format";
import { Plus } from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";

type P = {
  id: string;
  name_bn: string;
  slug: string;
  price: number;
  compare_at_price?: number | null;
  images: string[];
  brand?: string | null;
};

export function ProductCard({ p }: { p: P }) {
  const add = useCart((s) => s.add);
  const discount = p.compare_at_price && Number(p.compare_at_price) > Number(p.price)
    ? Math.round(((Number(p.compare_at_price) - Number(p.price)) / Number(p.compare_at_price)) * 100)
    : 0;

  return (
    <div className="group bg-card rounded-[2rem] p-4 border border-border/60 transition-all duration-500 hover:shadow-[0_30px_60px_-20px_color-mix(in_oklab,var(--color-primary)_22%,transparent)] hover:-translate-y-1">
      <Link to="/products/$slug" params={{ slug: p.slug }} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-secondary">
          <img
            src={img(p.images?.[0])}
            alt={p.name_bn}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
          {discount > 0 && (
            <span className="absolute top-4 left-4 bg-rose-soft text-primary-foreground text-[11px] font-semibold px-3 py-1 rounded-full shadow-sm">
              -{toBnDigits(discount)}%
            </span>
          )}
        </div>
      </Link>
      <div className="mt-5 space-y-3 px-1 pb-1">
        {p.brand && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-soft">{p.brand}</p>
        )}
        <Link to="/products/$slug" params={{ slug: p.slug }}>
          <h3 className="text-base md:text-lg font-semibold text-primary line-clamp-2 leading-snug hover:text-rose-soft transition-colors">
            {p.name_bn}
          </h3>
        </Link>
        <div className="flex items-end justify-between pt-2">
          <div>
            <p className="text-lg md:text-xl font-bold text-primary">{taka(p.price)}</p>
            {p.compare_at_price && Number(p.compare_at_price) > Number(p.price) && (
              <p className="text-xs text-muted-foreground line-through">{taka(p.compare_at_price)}</p>
            )}
          </div>
          <button
            aria-label="কার্টে যোগ করুন"
            onClick={() => {
              add({ productId: p.id, slug: p.slug, name_bn: p.name_bn, price: Number(p.price), image: img(p.images?.[0]) });
              toast.success("কার্টে যোগ হয়েছে");
            }}
            className="h-11 w-11 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center transition-all duration-300 hover:bg-rose-soft hover:rotate-90 active:scale-90 shadow-md"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
