// Facebook Pixel client helper
// Public ID — safe to ship in client bundle.
export const FB_PIXEL_ID = "1043916548098606";

declare global {
  interface Window {
    fbq?: ((...args: any[]) => void) & { callMethod?: any; queue?: any[]; loaded?: boolean; version?: string; push?: any };
    _fbq?: any;
  }
}

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return m ? decodeURIComponent(m[1]) : undefined;
}

/** Send to Conversions API (server-side) for de-duplicated, more reliable tracking. */
async function sendCapi(eventName: string, eventId: string, customData?: Record<string, any>) {
  try {
    await fetch("/api/public/fb-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: typeof window !== "undefined" ? window.location.href : undefined,
        fbp: getCookie("_fbp"),
        fbc: getCookie("_fbc"),
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        custom_data: customData,
      }),
      keepalive: true,
    });
  } catch {}
}

/** Track a standard or custom Facebook event on both browser pixel + CAPI (deduplicated by eventID). */
export function trackEvent(
  name: string,
  params?: Record<string, any>,
  opts: { custom?: boolean; capi?: boolean } = {},
) {
  if (typeof window === "undefined") return;
  const eventId = uuid();
  const method = opts.custom ? "trackCustom" : "track";
  try {
    window.fbq?.(method, name, params || {}, { eventID: eventId });
  } catch {}
  if (opts.capi !== false) {
    void sendCapi(name, eventId, params);
  }
}

/** Inline script that bootstraps fbq + fires the initial PageView. Inject once in <head>. */
export const FB_PIXEL_BOOTSTRAP = `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${FB_PIXEL_ID}');
fbq('track','PageView');
`;
