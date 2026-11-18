/** @format */

/**
 * Pure Schema Linter & Invariant Validator for TallyPrime Accounting XML.
 * Validates XML well-formedness, tag structure, polarity, and mathematical double-entry balance.
 */
export function validateTallyXml(xmlString) {
  const errors = [];
  const warnings = [];

  if (!xmlString || typeof xmlString !== "string" || xmlString.trim().length === 0) {
    return {
      isValid: false,
      voucherCount: 0,
      errors: ["XML payload is empty or invalid string."],
      warnings,
    };
  }

  // 1. Basic Well-Formedness Check (no unescaped ampersands)
  const rawAmpMatch = xmlString.match(/&(?!(amp|lt|gt|quot|apos);)/g);
  if (rawAmpMatch) {
    errors.push(`XML contains ${rawAmpMatch.length} unescaped '&' characters.`);
  }

  // 2. Envelope and Header Verification
  if (!xmlString.includes("<ENVELOPE>") || !xmlString.includes("</ENVELOPE>")) {
    errors.push("Missing root <ENVELOPE> element.");
  }
  if (!xmlString.includes("<TALLYREQUEST>Import Data</TALLYREQUEST>")) {
    errors.push("Missing or invalid <TALLYREQUEST> tag.");
  }
  if (!xmlString.includes("<IMPORTDATA>") || !xmlString.includes("</IMPORTDATA>")) {
    errors.push("Missing <IMPORTDATA> payload wrapper.");
  }

  // 3. Extract Vouchers
  const voucherRegex = /<VOUCHER\b[^>]*>([\s\S]*?)<\/VOUCHER>/g;
  const vouchers = [];
  let match;
  while ((match = voucherRegex.exec(xmlString)) !== null) {
    vouchers.push(match[1]);
  }

  if (vouchers.length === 0) {
    errors.push("No <VOUCHER> elements found in XML payload.");
    return {
      isValid: false,
      voucherCount: 0,
      errors,
      warnings,
    };
  }

  // 4. Validate Each Voucher
  vouchers.forEach((vContent, idx) => {
    const vIndex = idx + 1;

    // Check Date (YYYYMMDD)
    const dateMatch = vContent.match(/<DATE>(\d{8})<\/DATE>/);
    if (!dateMatch) {
      errors.push(`Voucher #${vIndex}: Missing or invalid <DATE> (expected 8-digit YYYYMMDD format).`);
    }

    // Check Voucher Type & Number
    const vTypeMatch = vContent.match(/<VOUCHERTYPENAME>(.*?)<\/VOUCHERTYPENAME>/);
    if (!vTypeMatch || !vTypeMatch[1].trim()) {
      errors.push(`Voucher #${vIndex}: Missing <VOUCHERTYPENAME>.`);
    }

    const vNumMatch = vContent.match(/<VOUCHERNUMBER>(.*?)<\/VOUCHERNUMBER>/);
    if (!vNumMatch || !vNumMatch[1].trim()) {
      errors.push(`Voucher #${vIndex}: Missing <VOUCHERNUMBER>.`);
    }
    const voucherNum = vNumMatch ? vNumMatch[1] : `#${vIndex}`;

    // Check Ledger Entries
    const entryRegex = /<ALLLEDGERENTRIES\.LIST>([\s\S]*?)<\/ALLLEDGERENTRIES\.LIST>/g;
    const entries = [];
    let entryMatch;
    while ((entryMatch = entryRegex.exec(vContent)) !== null) {
      entries.push(entryMatch[1]);
    }

    if (entries.length < 2) {
      errors.push(
        `Voucher ${voucherNum}: Double-entry requires at least 2 ledger entries, found ${entries.length}.`
      );
    }

    // Track algebraic sum of amounts for balance check
    let algebraicSum = 0;
    let hasDebit = false;
    let hasCredit = false;

    entries.forEach((entContent, eIdx) => {
      const eNum = eIdx + 1;
      const ledgerMatch = entContent.match(/<LEDGERNAME>(.*?)<\/LEDGERNAME>/);
      if (!ledgerMatch || !ledgerMatch[1].trim()) {
        errors.push(`Voucher ${voucherNum}, Entry #${eNum}: Missing or empty <LEDGERNAME>.`);
      }

      const deemedMatch = entContent.match(/<ISDEEMEDPOSITIVE>(Yes|No)<\/ISDEEMEDPOSITIVE>/);
      if (!deemedMatch) {
        errors.push(
          `Voucher ${voucherNum}, Entry #${eNum}: <ISDEEMEDPOSITIVE> must be 'Yes' or 'No'.`
        );
      }
      const isDeemedPositive = deemedMatch ? deemedMatch[1] === "Yes" : false;

      const amtMatch = entContent.match(/<AMOUNT>([+-]?\d+(?:\.\d+)?)<\/AMOUNT>/);
      if (!amtMatch) {
        errors.push(`Voucher ${voucherNum}, Entry #${eNum}: Missing or invalid numeric <AMOUNT>.`);
      } else {
        const amount = parseFloat(amtMatch[1]);
        algebraicSum += amount;

        // In Tally convention:
        // Debits: ISDEEMEDPOSITIVE=Yes, AMOUNT must be negative (< 0)
        // Credits: ISDEEMEDPOSITIVE=No, AMOUNT must be positive (> 0)
        if (isDeemedPositive) {
          hasDebit = true;
          if (amount > 0) {
            errors.push(
              `Voucher ${voucherNum}, Entry #${eNum}: Polarity violation. Debits (ISDEEMEDPOSITIVE=Yes) must have a negative AMOUNT in Tally XML (found: ${amount}).`
            );
          }
        } else {
          hasCredit = true;
          if (amount < 0) {
            errors.push(
              `Voucher ${voucherNum}, Entry #${eNum}: Polarity violation. Credits (ISDEEMEDPOSITIVE=No) must have a positive AMOUNT in Tally XML (found: ${amount}).`
            );
          }
        }
      }
    });

    if (!hasDebit) {
      errors.push(`Voucher ${voucherNum}: Missing debit entry (ISDEEMEDPOSITIVE=Yes).`);
    }
    if (!hasCredit) {
      errors.push(`Voucher ${voucherNum}: Missing credit entry (ISDEEMEDPOSITIVE=No).`);
    }

    // Double-Entry Balance Check
    const roundedSum = Math.round(algebraicSum * 100) / 100;
    if (Math.abs(roundedSum) > 0.01) {
      errors.push(
        `Voucher ${voucherNum}: Double-entry balance violation. Sum of all ledger amounts is ${roundedSum} (expected exactly 0.00).`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    voucherCount: vouchers.length,
    errors,
    warnings,
  };
}

