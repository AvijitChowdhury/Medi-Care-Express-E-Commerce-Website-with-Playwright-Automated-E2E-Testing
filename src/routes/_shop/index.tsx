import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchHome } from "@/lib/queries";
import { img, hero } from "@/lib/images";
import { ProductCard } from "@/components/site/ProductCard";
import { useReveal } from "@/hooks/use-reveal";
import { ArrowRight, Star, ShieldCheck, Truck, RotateCcw, BadgeCheck, Headphones, Check } from "lucide-react";

const SITE_URL = "https://pharmacy-express-now.lovable.app";
const HOME_OG_IMAGE = "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f9279bff-e124-4d5b-9960-a6a7ea7c6c3d/id-preview-dfe3183d--fe4cb71a-8b25-4aa3-944b-b6c63c789591.lovable.app-1780041660951.png";

export const Route = createFileRoute("/_shop/")({
  head: () => ({
    meta: [
      { title: "মেডিকেয়ার — প্রিমিয়াম স্বাস্থ্য ও সৌন্দর্য পণ্য" },
      { name: "description", content: "১০০% অরিজিনাল ভিটামিন, স্কিন কেয়ার, হেয়ার কেয়ার ও সাপ্লিমেন্ট — সারা বাংলাদেশে দ্রুত ডেলিভারি, ক্যাশ অন ডেলিভারি ও ৭ দিনের মানি ব্যাক গ্যারান্টি।" },
      { property: "og:title", content: "মেডিকেয়ার — প্রিমিয়াম স্বাস্থ্য ও সৌন্দর্য পণ্য" },
      { property: "og:description", content: "১০০% অরিজিনাল ভিটামিন, স্কিন কেয়ার, হেয়ার কেয়ার ও সাপ্লিমেন্ট — সারা বাংলাদেশে দ্রুত ডেলিভারি ও ৭ দিনের মানি ব্যাক গ্যারান্টি।" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: HOME_OG_IMAGE },
      { name: "twitter:image", content: HOME_OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "মেডিকেয়ার",
          alternateName: "Medicare",
          url: SITE_URL,
          logo: HOME_OG_IMAGE,
          contactPoint: {
            "@type": "ContactPoint",
            email: "support@medicare.com.bd",
            contactType: "customer support",
            areaServed: "BD",
            availableLanguage: ["bn", "en"],
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "মেডিকেয়ার",
          url: SITE_URL,
          potentialAction: {
            "@type": "SearchAction",
            target: `${SITE_URL}/products?search={query}`,
            "query-input": "required name=query",
          },
        }),
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data } = useQuery({ queryKey: ["home"], queryFn: fetchHome });
  useReveal();

  const heroBanner = data?.banners.find((b) => b.position === "hero");
  const promoLeft = data?.banners.find((b) => b.position === "promo_left");
  const promoRight = data?.banners.find((b) => b.position === "promo_right");

  return (
    <div className="pb-24 overflow-hidden">
      {/* Hero */}
      <section className="relative px-4 md:px-6 pt-10 lg:pt-20 max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <div className="z-10 space-y-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-primary/5 border border-primary/10 rounded-full text-primary font-semibold text-xs md:text-sm tracking-wide">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            দ্রুত ডেলিভারি সারা বাংলাদেশে
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-[1.08] text-primary tracking-tight">
            {heroBanner?.title_bn ? (
              heroBanner.title_bn
            ) : (
              <>
                আপনার সুস্থতায়,<br />
                <span className="text-rose-soft italic font-medium">বিশ্বস্ততায়</span> আমরা
              </>
            )}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-lg leading-relaxed">
            {heroBanner?.subtitle_bn ?? "সঠিক ঔষধ, সঠিক সময়ে, সরাসরি আপনার দরজায়। আমাদের আছে অভিজ্ঞ ফার্মাসিস্টদের পরামর্শ ও শতভাগ অরিজিনাল ঔষধের নিশ্চয়তা।"}
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link to="/products" className="group relative inline-flex h-14 px-8 items-center rounded-2xl bg-primary text-primary-foreground font-semibold overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-primary/30 active:scale-95">
              <span className="relative z-10 flex items-center gap-2">এখনই অর্ডার করুন <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" /></span>
              <span className="absolute inset-0 bg-rose-soft translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            </Link>
            <Link to="/products" className="inline-flex h-14 px-8 items-center rounded-2xl border-2 border-primary/20 text-primary font-semibold hover:bg-primary/5 transition-all duration-300">
              সব পণ্য দেখুন
            </Link>
          </div>
        </div>

        <div className="relative animate-fade-in-up delay-300">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-rose-soft/20 rounded-full blur-[100px]" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[120px]" />
          <div className="relative z-10 bg-card/40 backdrop-blur-xl p-4 md:p-8 rounded-[2.5rem] border border-card/80 shadow-[0_32px_64px_-16px_color-mix(in_oklab,var(--color-primary)_15%,transparent)] animate-float-slow">
            <img
              src={img(heroBanner?.image_url) || hero}
              alt="মেডিকেয়ার প্রিমিয়াম স্বাস্থ্য ও সৌন্দর্য পণ্যের সংগ্রহ — ভিটামিন, সাপ্লিমেন্ট, স্কিন ও হেয়ার কেয়ার"
              width={800}
              height={600}
              fetchPriority="high"
              decoding="async"
              className="rounded-[2rem] shadow-2xl overflow-hidden aspect-[4/3] w-full object-cover"
            />
            <div className="absolute -bottom-8 -right-4 md:-right-10 bg-card p-4 md:p-5 rounded-3xl shadow-2xl border border-primary/5 flex items-center gap-3 md:gap-4">
              <div className="h-12 w-12 md:h-14 md:w-14 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground">
                <ShieldCheck className="h-6 w-6 md:h-7 md:w-7" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Verified</p>
                <p className="font-bold text-primary text-sm md:text-base">১০০% আসল পণ্য</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mt-32 md:mt-44 max-w-7xl mx-auto px-4 md:px-6 reveal">
        <SectionHead eyebrow="Categories" title="জনপ্রিয় বিভাগসমূহ" right={
          <Link to="/products" className="group hidden md:inline-flex items-center gap-2 text-primary font-semibold">
            সবগুলো দেখুন
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        } />
        <div className="mt-10 md:mt-14 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
          {data?.categories.slice(0, 5).map((c, i) => (
            <Link
              key={c.id}
              to="/products"
              search={{ cat: c.slug } as any}
              className="group cursor-pointer reveal"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="aspect-square bg-card border border-primary/5 rounded-[2rem] p-6 md:p-8 flex flex-col items-center justify-center gap-4 transition-all duration-500 group-hover:border-rose-soft/40 group-hover:shadow-[0_20px_40px_-12px_color-mix(in_oklab,var(--color-rose-soft)_25%,transparent)] group-hover:-translate-y-2">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-secondary group-hover:scale-110 transition-transform duration-500">
                  <img src={img(c.image_url)} alt={c.name_bn} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <span className="font-semibold text-sm md:text-base text-primary text-center">{c.name_bn}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mt-32 md:mt-44 max-w-7xl mx-auto px-4 md:px-6 reveal">
        <div className="flex items-center justify-between mb-10 md:mb-14">
          <div>
            <span className="text-rose-soft font-bold tracking-[0.2em] uppercase text-xs">Featured</span>
            <h2 className="text-3xl md:text-4xl font-bold text-primary mt-2">সেরা অফারসমূহ</h2>
          </div>
          <div className="hidden md:flex gap-2">
            <div className="h-1 w-12 bg-primary" />
            <div className="h-1 w-6 bg-primary/10" />
            <div className="h-1 w-6 bg-primary/10" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {data?.featured.map((p, i) => (
            <div key={p.id} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
              <ProductCard p={p as any} />
            </div>
          ))}
        </div>
      </section>

      {/* Promo banners */}
      <section className="mt-24 md:mt-32 max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 reveal">
        {[promoLeft, promoRight].map((b, i) => b && (
          <Link key={i} to="/products" className="relative overflow-hidden rounded-[2rem] group">
            <img src={img(b.image_url)} alt={b.title_bn || `মেডিকেয়ার প্রোমোশনাল অফার ${i + 1}`} loading="lazy" className="w-full h-56 md:h-80 object-cover group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/40 to-transparent" />
            <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-center max-w-[70%]">
              <h3 className="text-xl md:text-3xl font-bold text-primary leading-tight">{b.title_bn}</h3>
              <p className="mt-2 text-xs md:text-sm text-muted-foreground">{b.subtitle_bn}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm text-primary font-semibold">
                এখনই দেখুন <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </Link>
        ))}
      </section>

      {/* All products */}
      <section className="mt-32 md:mt-44 max-w-7xl mx-auto px-4 md:px-6 reveal">
        <SectionHead eyebrow="Catalog" title="সব পণ্য" right={
          <Link to="/products" className="group inline-flex items-center gap-2 text-primary font-semibold">
            সব দেখুন <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        } />
        <div className="mt-10 md:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {data?.all.map((p, i) => (
            <div key={p.id} className="reveal" style={{ transitionDelay: `${(i % 4) * 80}ms` }}>
              <ProductCard p={p as any} />
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="mt-32 md:mt-44 max-w-7xl mx-auto px-4 md:px-6 reveal">
        <SectionHead eyebrow="Reviews" title="কাস্টমার রিভিউ" subtitle="আমাদের গ্রাহকদের অভিজ্ঞতা" />
        <div className="mt-10 md:mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {data?.reviews.map((r: any, i: number) => (
            <div key={r.id} className="bg-card border border-border rounded-[2rem] p-7 reveal hover:-translate-y-1 hover:shadow-xl transition-all duration-500" style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="flex gap-0.5 text-gold">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`h-4 w-4 ${j < r.rating ? "fill-current" : "opacity-30"}`} />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">{r.body_bn}</p>
              <div className="mt-5 pt-5 border-t border-border flex items-center justify-between text-xs">
                <span className="font-semibold text-primary">{r.author_name}</span>
                {r.products && <span className="text-muted-foreground">{r.products.name_bn}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="mt-32 md:mt-44 max-w-7xl mx-auto px-4 md:px-6 reveal">
        <SectionHead eyebrow="Compare" title="আমরা বনাম অন্যরা" subtitle="পার্থক্যটা স্পষ্ট" />
        <div className="mt-10 md:mt-14 overflow-hidden rounded-[2rem] border border-border bg-card">
          <div className="grid grid-cols-3 text-sm font-semibold">
            <div className="p-5 md:p-6">ফিচার</div>
            <div className="p-5 md:p-6 text-center bg-primary text-primary-foreground">মেডিকেয়ার</div>
            <div className="p-5 md:p-6 text-center bg-secondary">অন্যান্য</div>
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
              <div className="p-5 md:p-6">{row[0]}</div>
              <div className="p-5 md:p-6 text-center bg-primary/5 text-primary font-semibold flex items-center justify-center">
                {row[1] ? <Check className="h-5 w-5" /> : "—"}
              </div>
              <div className="p-5 md:p-6 text-center text-muted-foreground">{row[2] ? <Check className="h-5 w-5 inline" /> : "—"}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Why us */}
      <section className="mt-32 md:mt-44 max-w-7xl mx-auto px-4 md:px-6 reveal">
        <SectionHead eyebrow="Why us" title="কেন আমাদের থেকে কিনবেন" />
        <div className="mt-10 md:mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { Icon: BadgeCheck, t: "১০০% অরিজিনাল", d: "নির্ভরযোগ্য উৎস থেকে সংগৃহীত" },
            { Icon: Truck, t: "দ্রুত ডেলিভারি", d: "সারা দেশে ২৪-৭২ ঘন্টায়" },
            { Icon: ShieldCheck, t: "নিরাপদ পেমেন্ট", d: "ক্যাশ ও অনলাইন উভয় সুবিধা" },
            { Icon: Headphones, t: "২৪/৭ সাপোর্ট", d: "যেকোনো সময় যোগাযোগ" },
          ].map(({ Icon, t, d }, i) => (
            <div key={t} className="group bg-card border border-border rounded-[2rem] p-6 md:p-7 text-center reveal hover:-translate-y-2 hover:border-rose-soft/40 hover:shadow-xl transition-all duration-500" style={{ transitionDelay: `${i * 100}ms` }}>
              <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground group-hover:rotate-6 transition-all duration-500">
                <Icon className="h-6 w-6" />
              </div>
              <div className="mt-4 font-semibold text-sm md:text-base text-primary">{t}</div>
              <div className="mt-2 text-xs text-muted-foreground leading-relaxed">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Guarantee */}
      <section className="mt-24 md:mt-32 max-w-7xl mx-auto px-4 md:px-6 reveal">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-primary text-primary-foreground p-8 md:p-14">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-rose-soft/30 rounded-full blur-3xl" />
          <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-primary-foreground/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-10">
            <div className="h-20 w-20 rounded-3xl bg-primary-foreground/10 flex items-center justify-center shrink-0 animate-float-slow">
              <RotateCcw className="h-9 w-9" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl md:text-4xl font-bold leading-tight">৭ দিনের মানি ব্যাক গ্যারান্টি</h3>
              <p className="mt-3 text-sm md:text-base opacity-90 max-w-2xl">পণ্য পছন্দ না হলে অথবা সমস্যা হলে ৭ দিনের মধ্যে ফেরত দিয়ে সম্পূর্ণ টাকা ফেরত নিন।</p>
            </div>
            <Link to="/policy/refund" className="bg-primary-foreground text-primary px-7 h-12 rounded-2xl text-sm font-semibold inline-flex items-center hover:bg-rose-soft hover:text-primary-foreground transition-all duration-300 active:scale-95">
              বিস্তারিত জানুন
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2">
        {eyebrow && <span className="text-rose-soft font-bold tracking-[0.2em] uppercase text-xs">{eyebrow}</span>}
        <h2 className="text-3xl md:text-4xl font-bold text-primary tracking-tight">{title}</h2>
        {subtitle && <p className="text-sm md:text-base text-muted-foreground">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
