// Bangla number formatting + currency
const bnDigits = ["০","১","২","৩","৪","৫","৬","৭","৮","৯"];

export function toBnDigits(s: string | number): string {
  return String(s).replace(/[0-9]/g, (d) => bnDigits[Number(d)]);
}

export function taka(n: number | string): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  const rounded = Math.round(v);
  return `৳ ${toBnDigits(rounded.toLocaleString("en-US"))}`;
}
