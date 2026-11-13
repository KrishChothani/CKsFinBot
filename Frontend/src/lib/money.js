/** @format */

/**
 * Money Utility for Frontend — Correctness-First Integer Paise Engine.
 */

export const RoundingMode = {
  HALF_UP: "HALF_UP",
  HALF_EVEN: "HALF_EVEN",
};

/**
 * Converts a rupee input (number or string) into exact integer paise.
 */
export function toPaise(rupeesInput, roundingMode = RoundingMode.HALF_UP) {
  if (rupeesInput === null || rupeesInput === undefined || rupeesInput === "") {
    return 0;
  }

  let cleanStr = String(rupeesInput).trim().replace(/,/g, "").replace(/₹/g, "");
  if (cleanStr === "" || isNaN(Number(cleanStr))) {
    return 0;
  }

  const isNegative = cleanStr.startsWith("-");
  if (isNegative) {
    cleanStr = cleanStr.substring(1);
  }

  const parts = cleanStr.split(".");
  const wholePart = BigInt(parts[0] || "0");
  const fractionalPart = parts[1] || "";

  let paiseBigInt = wholePart * 100n;

  if (fractionalPart.length === 0) {
    // Exact whole rupees
  } else if (fractionalPart.length === 1) {
    paiseBigInt += BigInt(fractionalPart) * 10n;
  } else if (fractionalPart.length === 2) {
    paiseBigInt += BigInt(fractionalPart);
  } else {
    const firstTwo = BigInt(fractionalPart.substring(0, 2));
    const remainder = fractionalPart.substring(2);
    const nextDigit = parseInt(remainder[0], 10);
    const hasMoreNonZero = remainder.length > 1 && parseInt(remainder.substring(1), 10) > 0;

    let roundUp = false;
    if (roundingMode === RoundingMode.HALF_UP) {
      roundUp = nextDigit >= 5;
    } else if (roundingMode === RoundingMode.HALF_EVEN) {
      if (nextDigit > 5 || (nextDigit === 5 && hasMoreNonZero)) {
        roundUp = true;
      } else if (nextDigit === 5 && !hasMoreNonZero) {
        roundUp = firstTwo % 2n !== 0n;
      }
    }

    paiseBigInt += firstTwo + (roundUp ? 1n : 0n);
  }

  const finalPaise = Number(isNegative ? -paiseBigInt : paiseBigInt);
  return finalPaise;
}

/**
 * Converts integer paise to standard Rupee string representation with 2 decimal places.
 */
export function toRupees(paise) {
  if (typeof paise !== "number" || isNaN(paise)) {
    return "0.00";
  }
  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;
  const sign = isNegative ? "-" : "";
  return `${sign}${rupees}.${remainderPaise.toString().padStart(2, "0")}`;
}

/**
 * Formats integer paise into the Indian Rupee representation (Lakhs and Crores grouping).
 * e.g., 123456789 paise -> "₹12,34,567.89"
 */
export function formatPaiseToINR(paise, { showSymbol = true } = {}) {
  if (typeof paise !== "number" || isNaN(paise)) {
    return showSymbol ? "₹0.00" : "0.00";
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupeesPart = Math.floor(absPaise / 100);
  const paisePart = (absPaise % 100).toString().padStart(2, "0");

  const rupeesStr = rupeesPart.toString();
  let formattedRupees = "";

  if (rupeesStr.length <= 3) {
    formattedRupees = rupeesStr;
  } else {
    const lastThree = rupeesStr.substring(rupeesStr.length - 3);
    const otherNumbers = rupeesStr.substring(0, rupeesStr.length - 3);
    const withCommas = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    formattedRupees = `${withCommas},${lastThree}`;
  }

  const sign = isNegative ? "-" : "";
  const symbol = showSymbol ? "₹" : "";
  return `${sign}${symbol}${formattedRupees}.${paisePart}`;
}

export default {
  RoundingMode,
  toPaise,
  toRupees,
  formatPaiseToINR,
};

