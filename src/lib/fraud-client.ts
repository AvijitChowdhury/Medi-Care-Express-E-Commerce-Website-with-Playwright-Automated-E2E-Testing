import { checkPhoneFraud } from "./fraud.functions";

const SS_KEY = "medi-fraud-cache";

type Result = {
  ok: boolean;
  phone?: string;
  risk_level?: string;
  total_orders?: number;
  total_cancelled?: number;
  total_delivered?: number;
  success_ratio?: number;
  error?: string;
};

function readCache(): Record<string, Result> {
  if (typeof sessionStorage === "undefined") return {};
  try { return JSON.parse(sessionStorage.getItem(SS_KEY) || "{}"); } catch { return {}; }
}
function writeCache(c: Record<string, Result>) {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(c)); } catch {}
}

export async function checkFraudCached(phone: string, force = false): Promise<Result> {
  const key = (phone || "").replace(/\D/g, "");
  if (!key) return { ok: false, error: "invalid phone" };
  const cache = readCache();
  if (!force && cache[key]) return cache[key];
  const r = await (checkPhoneFraud as any)({ data: { phone, force } });
  cache[key] = r;
  writeCache(cache);
  return r;
}

export function riskColor(level?: string) {
  switch (level) {
    case "low": return { bg: "bg-emerald-500/10", text: "text-emerald-600", label: "নিরাপদ" };
    case "medium": return { bg: "bg-amber-500/10", text: "text-amber-600", label: "মাঝারি" };
    case "high": return { bg: "bg-red-500/10", text: "text-red-600", label: "ঝুঁকিপূর্ণ" };
    case "new": return { bg: "bg-blue-500/10", text: "text-blue-600", label: "নতুন" };
    default: return { bg: "bg-muted", text: "text-muted-foreground", label: "অজানা" };
  }
}
