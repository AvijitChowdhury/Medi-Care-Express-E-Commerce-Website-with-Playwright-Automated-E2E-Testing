import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/fb-pixel";

/**
 * Fires PageView on route change, plus TimeOnPage (30s),
 * PageScroll (50%), and InternalClick custom events.
 */
export function useFbEngagement(pathname: string) {
  const lastPath = useRef<string | null>(null);

  // PageView on every route change, including the first one (so CAPI also receives it).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackEvent("PageView", { path: pathname });
  }, [pathname]);

  // Per-page timers / listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeFired = false;
    let scrollFired = false;
    const watched = new WeakSet<HTMLVideoElement>();

    const timer = window.setTimeout(() => {
      if (!timeFired) {
        timeFired = true;
        trackEvent("TimeOnPage", { seconds: 30, path: pathname }, { custom: true });
      }
    }, 30_000);

    const onScroll = () => {
      if (scrollFired) return;
      const h = document.documentElement;
      const scrollable = h.scrollHeight - h.clientHeight;
      if (scrollable <= 0) return;
      const pct = (h.scrollTop / scrollable) * 100;
      if (pct >= 50) {
        scrollFired = true;
        trackEvent("PageScroll", { percent: 50, path: pathname }, { custom: true });
      }
    };

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const isInternal =
        href.startsWith("/") ||
        (a.hostname && a.hostname === window.location.hostname);
      if (isInternal) {
        trackEvent("InternalClick", { href, text: (a.innerText || "").slice(0, 80) }, { custom: true });
      }
    };

    // WatchVideo — fires on play, and again at 50% watched (once per video per page).
    const onPlay = (e: Event) => {
      const v = e.target as HTMLVideoElement;
      if (!v || v.tagName !== "VIDEO" || watched.has(v)) return;
      watched.add(v);
      trackEvent(
        "WatchVideo",
        { src: v.currentSrc || v.src || "", duration: v.duration || 0, path: pathname },
        { custom: true },
      );
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("play", onPlay, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("play", onPlay, true);
    };
  }, [pathname]);
}
