import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/fb-pixel";

/**
 * Fires PageView on route change, plus TimeOnPage (30s),
 * PageScroll (50%), and InternalClick custom events.
 */
export function useFbEngagement(pathname: string) {
  const lastPath = useRef<string | null>(null);

  // PageView on route change (skip first — bootstrap script already fired it)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lastPath.current === null) {
      lastPath.current = pathname;
      return;
    }
    if (lastPath.current !== pathname) {
      lastPath.current = pathname;
      trackEvent("PageView");
    }
  }, [pathname]);

  // Per-page timers / listeners
  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeFired = false;
    let scrollFired = false;
    const startedAt = Date.now();

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

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      const elapsed = (Date.now() - startedAt) / 1000;
      void elapsed;
    };
  }, [pathname]);
}
