/** @format */

/**
 * Formats a number to Indian Rupee (INR) currency representation.
 * e.g., 1234567.89 -> ₹12,34,567.89
 */
export const formatINR = (amount, { showDecimals = false } = {}) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(num);
};

/**
 * Compact Indian format: e.g. ₹1.25Cr, ₹45.2L, ₹12.5K
 */
export const formatINRCompact = (amount) => {
  const num = Math.abs(Number(amount) || 0);
  const sign = Number(amount) < 0 ? "-" : "";
  if (num >= 1e7) {
    return `${sign}₹${(num / 1e7).toFixed(2)} Cr`;
  }
  if (num >= 1e5) {
    return `${sign}₹${(num / 1e5).toFixed(2)} L`;
  }
  if (num >= 1e3) {
    return `${sign}₹${(num / 1e3).toFixed(1)} K`;
  }
  return `${sign}₹${num.toFixed(0)}`;
};

/**
 * Standard Indian date formatting (e.g. 07 Nov 2026)
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return "—";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  } catch {
    return "—";
  }
};

/**
 * GSTIN Formatter / Sanitize
 */
export const formatGSTIN = (gstin) => {
  if (!gstin) return "—";
  return gstin.trim().toUpperCase();
};

