// Map DB image paths (slugs) to bundled assets.
import hero from "@/assets/hero.jpg";
import hairOil from "@/assets/p-hair-oil.jpg";
import vitC from "@/assets/p-vit-c.jpg";
import serum from "@/assets/p-serum.jpg";
import slim from "@/assets/p-slim.jpg";
import whey from "@/assets/p-whey.jpg";
import tea from "@/assets/p-tea.jpg";
import zinc from "@/assets/p-zinc.jpg";
import shampoo from "@/assets/p-shampoo.jpg";
import acne from "@/assets/p-acne.jpg";
import omega from "@/assets/p-omega.jpg";
import ash from "@/assets/p-ash.jpg";
import collagen from "@/assets/p-collagen.jpg";
import promo1 from "@/assets/banner-promo1.jpg";
import promo2 from "@/assets/banner-promo2.jpg";

const map: Record<string, string> = {
  "/banner-hero.jpg": hero,
  "/banner-promo1.jpg": promo1,
  "/banner-promo2.jpg": promo2,
  "/p-hair-oil.jpg": hairOil,
  "/p-vit-c.jpg": vitC,
  "/p-serum.jpg": serum,
  "/p-slim.jpg": slim,
  "/p-whey.jpg": whey,
  "/p-tea.jpg": tea,
  "/p-zinc.jpg": zinc,
  "/p-shampoo.jpg": shampoo,
  "/p-acne.jpg": acne,
  "/p-omega.jpg": omega,
  "/p-ash.jpg": ash,
  "/p-collagen.jpg": collagen,
  "/cat-vitamin.jpg": vitC,
  "/cat-hair.jpg": hairOil,
  "/cat-skin.jpg": serum,
  "/cat-weight.jpg": slim,
  "/cat-supplement.jpg": whey,
  "/cat-herbal.jpg": tea,
};

export function img(path?: string | null): string {
  if (!path) return hero;
  return map[path] ?? path;
}

export { hero };
