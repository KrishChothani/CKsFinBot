/** @format */

import { validateTallyXml } from "./tallyLinter.service.js";

/**
 * Formats a Date object or ISO string to standard Tally date format: YYYYMMDD
 */
export function formatTallyDate(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return "20260401";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Escapes special XML characters strictly.
 */
export function escapeXml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates an XML snippet for a single accounting voucher according to the TallyPrime standard.
 */
export function generateTallyVoucherXml(voucher) {
  const tallyDate = formatTallyDate(voucher.voucherDate);
  const refDate = voucher.referenceDate ? formatTallyDate(voucher.referenceDate) : tallyDate;
  const vchType = escapeXml(voucher.voucherType || "Purchase");
  const vchNumber = escapeXml(voucher.voucherNumber || "VCH-001");
  const refNumber = escapeXml(voucher.referenceNumber || voucher.voucherNumber || "");
  const partyName = escapeXml(voucher.partyLedgerName || "Sundry Creditors");
  const narration = escapeXml(voucher.narration || "");

  let xml = `        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n`;
  xml += `          <VOUCHER VCHTYPE="${vchType}" ACTION="Create" OBJVIEW="Accounting Voucher View">\n`;
  xml += `            <DATE>${tallyDate}</DATE>\n`;
  xml += `            <EFFECTIVEDATE>${tallyDate}</EFFECTIVEDATE>\n`;
  xml += `            <VOUCHERTYPENAME>${vchType}</VOUCHERTYPENAME>\n`;
  xml += `            <VOUCHERNUMBER>${vchNumber}</VOUCHERNUMBER>\n`;
  if (refNumber) {
    xml += `            <REFERENCE>${refNumber}</REFERENCE>\n`;
    xml += `            <REFERENCEDATE>${refDate}</REFERENCEDATE>\n`;
  }
  xml += `            <PARTYLEDGERNAME>${partyName}</PARTYLEDGERNAME>\n`;
  xml += `            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>\n`;
  xml += `            <NARRATION>${narration}</NARRATION>\n`;

  // Ledger Entries
  const entries = voucher.entries || [];
  entries.forEach((entry) => {
    // In integer paise precision:
    const isDebit = entry.debitAmountPaise > 0 || entry.debitAmount > 0;
    const debitPaise = entry.debitAmountPaise || Math.round((entry.debitAmount || 0) * 100);
    const creditPaise = entry.creditAmountPaise || Math.round((entry.creditAmount || 0) * 100);

    const absRupees = isDebit ? debitPaise / 100 : creditPaise / 100;
    // Tally Polarity Rule:
    // Debits: ISDEEMEDPOSITIVE=Yes, Amount is negative
    // Credits: ISDEEMEDPOSITIVE=No, Amount is positive
    const formattedAmount = isDebit
      ? `-${absRupees.toFixed(2)}`
      : `${absRupees.toFixed(2)}`;

    const ledgerClean = escapeXml(entry.accountName || "Account");
    const isParty = !isDebit && entry.accountName === voucher.partyLedgerName;

    xml += `            <ALLLEDGERENTRIES.LIST>\n`;
    xml += `              <LEDGERNAME>${ledgerClean}</LEDGERNAME>\n`;
    xml += `              <ISDEEMEDPOSITIVE>${isDebit ? "Yes" : "No"}</ISDEEMEDPOSITIVE>\n`;
    xml += `              <LEDGERFROMITEM>No</LEDGERFROMITEM>\n`;
    xml += `              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>\n`;
    xml += `              <ISPARTYLEDGER>${isParty ? "Yes" : "No"}</ISPARTYLEDGER>\n`;
    xml += `              <AMOUNT>${formattedAmount}</AMOUNT>\n`;

    // Bill allocations for party ledger (Vendor tracking with MSME credit period)
    if (isParty) {
      const creditPeriod = voucher.msmeDetails?.creditPeriodDays
        ? `${voucher.msmeDetails.creditPeriodDays} Days`
        : "45 Days";
      xml += `              <BILLALLOCATIONS.LIST>\n`;
      xml += `                <NAME>${refNumber || vchNumber}</NAME>\n`;
      xml += `                <BILLTYPE>New Ref</BILLTYPE>\n`;
      xml += `                <BILLCREDITPERIOD>${creditPeriod}</BILLCREDITPERIOD>\n`;
      xml += `                <AMOUNT>${formattedAmount}</AMOUNT>\n`;
      xml += `              </BILLALLOCATIONS.LIST>\n`;
    }

    xml += `            </ALLLEDGERENTRIES.LIST>\n`;
  });

  xml += `          </VOUCHER>\n`;
  xml += `        </TALLYMESSAGE>\n`;

  return xml;
}

/**
 * Builds a complete, compliant TallyPrime XML import envelope for an array of vouchers.
 * Automatically validates the result through the Tally XML schema linter.
 */
export function buildTallyXmlEnvelope(vouchers, companyName = "CKsFinBot Client") {
  const cleanCompany = escapeXml(companyName);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<ENVELOPE>\n`;
  xml += `  <HEADER>\n`;
  xml += `    <TALLYREQUEST>Import Data</TALLYREQUEST>\n`;
  xml += `  </HEADER>\n`;
  xml += `  <BODY>\n`;
  xml += `    <IMPORTDATA>\n`;
  xml += `      <REQUESTDESC>\n`;
  xml += `        <REPORTNAME>Vouchers</REPORTNAME>\n`;
  xml += `        <STATICVARIABLES>\n`;
  xml += `          <SVCURRENTCOMPANY>${cleanCompany}</SVCURRENTCOMPANY>\n`;
  xml += `        </STATICVARIABLES>\n`;
  xml += `      </REQUESTDESC>\n`;
  xml += `      <REQUESTDATA>\n`;

  vouchers.forEach((v) => {
    xml += generateTallyVoucherXml(v);
  });

  xml += `      </REQUESTDATA>\n`;
  xml += `    </IMPORTDATA>\n`;
  xml += `  </BODY>\n`;
  xml += `</ENVELOPE>\n`;

  // Lint and validate generated XML
  const validationResult = validateTallyXml(xml);
  if (!validationResult.isValid) {
    throw new Error(
      `Generated Tally XML failed schema validation:\n${validationResult.errors.join("\n")}`
    );
  }

  return {
    xml,
    voucherCount: vouchers.length,
    validation: validationResult,
  };
}

