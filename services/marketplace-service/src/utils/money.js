/** @format */

/**
 * Money Utility — Correctness-First Integer Paise Engine.
 * 
 * NON-NEGOTIABLE FINTECH RULES:
 * 1. Money is NEVER a float. All monetary amounts are stored as integer paise (1 INR = 100 paise).
 * 2. Explicit rounding modes:
 *    - HALF_UP: Standard Indian GST & commercial invoice rounding (rounds .5 towards infinity).
 *    - HALF_EVEN: Banker's rounding (rounds .5 to nearest even integer) for financial closes.
 * 3. The LLM never performs arithmetic. All calculations, splits, and subtotals are deterministic.
 * 4. Zero paise loss: When splitting GST equally into CGST & SGST, any odd paise is deterministically
 *    handled so that cgst + sgst + igst === total_tax_paise.
 */

export const RoundingMode = {
  HALF_UP: "HALF_UP",
  HALF_EVEN: "HALF_EVEN",
};

/**
 * Converts a rupee input (number, string, or decimal string) into exact integer paise.
 * Throws on NaN, infinite, or invalid inputs.
 * e.g., 1250.50 -> 125050
 * e.g., "1,250.75" -> 125075
 */
export function toPaise(rupeesInput, roundingMode = RoundingMode.HALF_UP) {
  if (rupeesInput === null || rupeesInput === undefined || rupeesInput === "") {
    return 0;
  }

  let cleanStr = String(rupeesInput).trim().replace(/,/g, "").replace(/₹/g, "");
  if (cleanStr === "" || isNaN(Number(cleanStr))) {
    throw new TypeError(`Invalid money input: cannot convert '${rupeesInput}' to paise.`);
  }

  // Handle negative sign
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
    // More than 2 decimal digits -> round according to specified mode
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
        // Exactly half -> round to even
        roundUp = firstTwo % 2n !== 0n;
      }
    }

    paiseBigInt += firstTwo + (roundUp ? 1n : 0n);
  }

  const finalPaise = Number(isNegative ? -paiseBigInt : paiseBigInt);
  if (!Number.isSafeInteger(finalPaise)) {
    throw new RangeError(`Amount exceeds safe integer range: ${rupeesInput}`);
  }
  return finalPaise;
}

/**
 * Converts integer paise to standard Rupee string representation with 2 decimal places.
 * e.g., 125050 -> "1250.50"
 */
export function toRupees(paise) {
  if (typeof paise !== "number" || !Number.isInteger(paise)) {
    throw new TypeError(`toRupees requires an integer paise value, received: ${paise}`);
  }
  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupees = Math.floor(absPaise / 100);
  const remainderPaise = absPaise % 100;
  const sign = isNegative ? "-" : "";
  return `${sign}${rupees}.${remainderPaise.toString().padStart(2, "0")}`;
}

/**
 * Deterministic addition of integer paise.
 */
export function addPaise(...paiseAmounts) {
  return paiseAmounts.reduce((sum, amt) => {
    if (typeof amt !== "number" || !Number.isInteger(amt)) {
      throw new TypeError(`Amount must be integer paise: ${amt}`);
    }
    return sum + amt;
  }, 0);
}

/**
 * Deterministic subtraction of integer paise.
 */
export function subtractPaise(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    throw new TypeError(`Operands must be integer paise: a=${a}, b=${b}`);
  }
  return a - b;
}

/**
 * Multiplies an integer paise amount by a percentage expressed in basis points (1% = 100 bps).
 * e.g. 18% GST on ₹1,000 (100000 paise) -> multiplyPaise(100000, 1800) -> 18000 paise (₹180.00).
 */
export function multiplyPaise(paise, basisPoints, roundingMode = RoundingMode.HALF_UP) {
  if (!Number.isInteger(paise) || !Number.isInteger(basisPoints)) {
    throw new TypeError(`Operands must be integers: paise=${paise}, basisPoints=${basisPoints}`);
  }

  const pBig = BigInt(paise);
  const bpBig = BigInt(basisPoints);
  const numerator = pBig * bpBig;
  const denominator = 10000n; // 100 bps per % * 100%

  const quotient = numerator / denominator;
  const remainder = numerator % denominator;

  if (remainder === 0n) {
    return Number(quotient);
  }

  const absRemainder = remainder < 0n ? -remainder : remainder;
  const doubleRemainder = absRemainder * 2n;

  let roundUp = false;
  if (roundingMode === RoundingMode.HALF_UP) {
    roundUp = doubleRemainder >= denominator;
  } else if (roundingMode === RoundingMode.HALF_EVEN) {
    if (doubleRemainder > denominator) {
      roundUp = true;
    } else if (doubleRemainder === denominator) {
      const absQuotient = quotient < 0n ? -quotient : quotient;
      roundUp = absQuotient % 2n !== 0n;
    }
  }

  const result = quotient + (numerator >= 0n ? (roundUp ? 1n : 0n) : (roundUp ? -1n : 0n));
  return Number(result);
}

/**
 * Splits tax deterministically into CGST, SGST, or IGST with ZERO lost paise.
 * For Intra-State supplies: Tax is split evenly into CGST and SGST. If odd paise,
 * CGST receives the remainder paise (explicit convention) so CGST + SGST === Total Tax.
 * For Inter-State supplies: 100% allocated to IGST.
 *
 * @param {number} taxablePaise - Taxable amount in integer paise.
 * @param {number} gstRateBasisPoints - Rate in basis points (e.g. 1800 for 18%).
 * @param {boolean} isInterState - True if inter-state supply (IGST), false if intra-state (CGST + SGST).
 * @param {number} cessBasisPoints - Optional Cess rate in basis points.
 */
export function splitGstTax(
  taxablePaise,
  gstRateBasisPoints,
  isInterState = false,
  cessBasisPoints = 0
) {
  if (!Number.isInteger(taxablePaise)) {
    throw new TypeError(`taxablePaise must be integer paise: ${taxablePaise}`);
  }

  const totalGstPaise = multiplyPaise(taxablePaise, gstRateBasisPoints, RoundingMode.HALF_UP);
  const cessPaise = cessBasisPoints > 0
    ? multiplyPaise(taxablePaise, cessBasisPoints, RoundingMode.HALF_UP)
    : 0;

  if (isInterState) {
    return {
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: totalGstPaise,
      cessPaise,
      totalTaxPaise: totalGstPaise + cessPaise,
    };
  }

  // Intra-State: Split total GST equally into CGST & SGST
  const halfTax = Math.floor(totalGstPaise / 2);
  const remainder = totalGstPaise % 2;

  // Remainder paise deterministically allocated to CGST (ensures conservation of paise)
  const cgstPaise = halfTax + remainder;
  const sgstPaise = halfTax;

  return {
    cgstPaise,
    sgstPaise,
    igstPaise: 0,
    cessPaise,
    totalTaxPaise: cgstPaise + sgstPaise + cessPaise,
  };
}

/**
 * Formats integer paise into the Indian Rupee representation (Lakhs and Crores grouping).
 * e.g., 123456789 paise -> "₹12,34,567.89"
 */
export function formatPaiseToINR(paise, { showSymbol = true } = {}) {
  if (typeof paise !== "number" || !Number.isInteger(paise)) {
    return showSymbol ? "₹0.00" : "0.00";
  }

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const rupeesPart = Math.floor(absPaise / 100);
  const paisePart = (absPaise % 100).toString().padStart(2, "0");

  // Format integer rupee part with Indian numbering system (3, 2, 2...)
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

export const formatINR = formatPaiseToINR;

export default {
  RoundingMode,
  toPaise,
  toRupees,
  addPaise,
  subtractPaise,
  multiplyPaise,
  splitGstTax,
  formatPaiseToINR,
  formatINR,
};

