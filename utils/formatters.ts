// utils/formatters.ts
export function formatINR(amount: number | string): string {
  const n =
    typeof amount === "string"
      ? Number(amount.replace(/[^\d.-]/g, ""))
      : amount;

  if (!Number.isFinite(n)) return "₹0";

  // Indian numbering system
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
