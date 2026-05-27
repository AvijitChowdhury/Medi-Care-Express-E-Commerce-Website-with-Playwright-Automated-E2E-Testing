import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchHome } from "@/lib/queries";
import { img, hero } from "@/lib/images";
import { ProductCard } from "@/components/site/ProductCard";
import { taka, toBnDigits } from "@/lib/format";
import { Star, ShieldCheck, Truck, RotateCcw, BadgeCheck, Headphones } from "lucide-react";

export const Route = createFileRoute("/_shop/")({
  head: () => ({
    meta: [
      { title: "মেডিকেয়ার — প্রিমিয়াম স্বাস্থ্য ও সৌন্দর্য পণ্য" },
      { name: "description", content: "১০০% অরিজিনাল ভিটামিন, স্কিন কেয়ার, হেয়ার কেয়ার, সাপ্লিমেন্ট। ক্যাশ অন ডেলিভারি ও দ্রুত শিপিং।" },
      { property: "og:image", content: "/hero.jpg" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data } = useQuery({ queryKey: ["home"], queryFn: fetchHome });

  const heroBanner = data?.banners.find((b) => b.position === "hero");
  const promoLeft = data?.banners.find((b) => b.position === "promo_left");
  const promoRight = data?.banners.find((b) => b.position === "promo_right");

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="container mx-auto px-4 pt-6 md:pt-10">
        <div className="relative overflow-hidden rounded-2xl bg-secondary">
          <img src={img(heroBanner?.image_url) || hero} alt="হিরো ব্যানার" width={1600} height={900} className="w-full h-[280px] md:h-[520px] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/60 to-transparent" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-xl px-6 md:px-12">
              <span className="inline-block text-xs tracking-wider uppercase text-primary mb-3">নতুন কালেকশন</span>
              <h1 className="text-3xl md:text-5xl font-semibold leading-tight text-foreground">
                {heroBanner?.title_bn ?? "প্রিমিয়াম স্বাস্থ্য ও সৌন্দর্যের সমাধান"}
              </h1>
              <p className="mt-4 text-sm md:text-base text-muted-foreground max-w-md">
                {heroBanner?.subtitle_bn ?? "১০০% অরিজিনাল • দ্রুত ডেলিভারি • ক্যাশ অন ডেলিভারি"}
              </p>
              <div className="mt-6 flex gap-3">
                <Link to="/products" className="inline-flex h-11 px-6 items-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                  এখনই কেনাকাটা করুন
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 mt-14">
        <SectionHeading title="সব ক্যাটাগরি" />
        <div className="mt-6 flex gap-4 md:gap-6 overflow-x-auto pb-4 -mx-4 px-4 snap-x">
          {data?.categories.map((c) => (
            <Link
              key={c.id}
              to="/products"
              search={{ cat: c.slug } as any}
              className="shrink-0 snap-start text-center group"
            >
              <div className="w-24 md:w-32 aspect-square rounded-full overflow-hidden bg-secondary border border-border">
                <img src={img(c.image_url)} alt={c.name_bn} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="mt-3 text-xs md:text-sm font-medium">{c.name_bn}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="container mx-auto px-4 mt-16">
        <SectionHeading title="ফিচারড প্রোডাক্ট" subtitle="আমাদের বেস্ট সেলিং পণ্যসমূহ" />
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
          {data?.featured.map((p) => <ProductCard key={p.id} p={p as any} />)}
        </div>
      </section>

      {/* Promo banners */}
      <section className="container mx-auto px-4 mt-16 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {[promoLeft, promoRight].map((b, i) => b && (
          <Link key={i} to="/products" className="relative overflow-hidden rounded-2xl group">
            <img src={img(b.image_url)} alt={b.title_bn || ""} loading="lazy" className="w-full h-56 md:h-72 object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />
            <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-center max-w-[60%]">
              <h3 className="text-lg md:text-2xl font-semibold text-foreground">{b.title_bn}</h3>
              <p className="mt-2 text-xs md:text-sm text-muted-foreground">{b.subtitle_bn}</p>
              <span className="mt-4 text-xs md:text-sm text-primary font-medium">এখনই দেখুন →</span>
            </div>
          </Link>
        ))}
      </section>

      {/* All products */}
      <section className="container mx-auto px-4 mt-16">
        <SectionHeading title="সব পণ্য" subtitle="আমাদের পুরো কালেকশন থেকে বেছে নিন" right={<Link to="/products" className="text-sm text-primary hover:underline">সব দেখুন →</Link>} />
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
          {data?.all.map((p) => <ProductCard key={p.id} p={p as any} />)}
        </div>
      </section>

      {/* Reviews */}
      <section className="container mx-auto px-4 mt-20">
        <SectionHeading title="কাস্টমার রিভিউ" subtitle="আমাদের গ্রাহকদের অভিজ্ঞতা" />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {data?.reviews.map((r: any) => (
            <div key={r.id} className="bg-card border border-border rounded-2xl p-6">
              <div className="flex gap-0.5 text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "opacity-30"}`} />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">{r.body_bn}</p>
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs">
                <span className="font-medium">{r.author_name}</span>
                {r.products && <span className="text-muted-foreground">{r.products.name_bn}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="container mx-auto px-4 mt-20">
        <SectionHeading title="আমরা বনাম অন্যরা" subtitle="পার্থক্যটা স্পষ্ট" />
        <div className="mt-8 overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-3 bg-secondary/50 text-sm font-medium">
            <div className="p-4 md:p-5">ফিচার</div>
            <div className="p-4 md:p-5 text-center bg-primary text-primary-foreground">মেডিকেয়ার</div>
            <div className="p-4 md:p-5 text-center">অন্যান্য</div>
          </div>
          {[
            ["১০০% অরিজিনাল প্রোডাক্ট", true, false],
            ["ক্যাশ অন ডেলিভারি", true, true],
            ["মানি ব্যাক গ্যারান্টি", true, false],
            ["২৪/৭ কাস্টমার সাপোর্ট", true, false],
            ["সারা দেশে ডেলিভারি", true, true],
            ["প্রিমিয়াম প্যাকেজিং", true, false],
          ].map((row, i) => (
            <div key={i} className="grid grid-cols-3 text-sm border-t border-border">
              <div className="p-4 md:p-5">{row[0]}</div>
              <div className="p-4 md:p-5 text-center bg-primary/5 text-primary font-medium">{row[1] ? "✓" : "—"}</div>
              <div className="p-4 md:p-5 text-center text-muted-foreground">{row[2] ? "✓" : "—"}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="container mx-auto px-4 mt-20">
        <SectionHeading title="কেন আমাদের থেকে কিনবেন" />
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { Icon: BadgeCheck, t: "১০০% অরিজিনাল", d: "নির্ভরযোগ্য উৎস থেকে সংগৃহীত" },
            { Icon: Truck, t: "দ্রুত ডেলিভারি", d: "সারা দেশে ২৪-৭২ ঘন্টায়" },
            { Icon: ShieldCheck, t: "নিরাপদ পেমেন্ট", d: "ক্যাশ ও অনলাইন উভয় সুবিধা" },
            { Icon: Headphones, t: "২৪/৭ সাপোর্ট", d: "যেকোনো সময় যোগাযোগ" },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="bg-card border border-border rounded-2xl p-5 md:p-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-medium text-sm">{t}</div>
              <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Money back guarantee */}
      <section className="container mx-auto px-4 mt-16">
        <div className="rounded-2xl bg-primary text-primary-foreground p-8 md:p-12 flex flex-col md:flex-row items-center gap-6">
          <div className="h-16 w-16 rounded-full bg-primary-foreground/10 flex items-center justify-center shrink-0">
            <RotateCcw className="h-7 w-7" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl md:text-2xl font-semibold">৭ দিনের মানি ব্যাক গ্যারান্টি</h3>
            <p className="mt-2 text-sm opacity-90">পণ্য পছন্দ না হলে অথবা সমস্যা হলে ৭ দিনের মধ্যে ফেরত দিয়ে সম্পূর্ণ টাকা ফেরত নিন।</p>
          </div>
          <Link to="/policy/refund" className="bg-primary-foreground text-primary px-5 h-11 rounded-md text-sm font-medium inline-flex items-center hover:bg-primary-foreground/90">
            বিস্তারিত জানুন
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionHeading({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between">
      <div>
        <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
