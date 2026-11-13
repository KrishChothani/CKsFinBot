/** @format */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildTallyXmlEnvelope,
  generateTallyVoucherXml,
  formatTallyDate,
  escapeXml,
} from "./tallyExport.service.js";
import { validateTallyXml } from "./tallyLinter.service.js";
import { calculateMsmeDueDate } from "./voucher.service.js";

describe("TallyPrime Export & Double-Entry Invariant Hardening", () => {
  it("formats dates into Tally standard YYYYMMDD", () => {
    assert.equal(formatTallyDate(new Date("2026-04-15T00:00:00Z")), "20260415");
    assert.equal(formatTallyDate("2026-11-20"), "20261120");
  });

  it("escapes XML special characters safely", () => {
    assert.equal(
      escapeXml("A & B < C > 'Quotes' \"Double\""),
      "A &amp; B &lt; C &gt; &apos;Quotes&apos; &quot;Double&quot;"
    );
  });

  it("calculates MSME Section 43B(h) statutory due dates and caps agreements at 45 days", () => {
    const baseDate = new Date("2026-05-01T00:00:00Z");

    // Case 1: Micro supplier without agreement (defaults to 15 days)
    const microNoAgreement = calculateMsmeDueDate(baseDate, {
      msmeCategory: "Micro",
      creditPeriodDays: null,
    });
    assert.equal(microNoAgreement.isMsme, true);
    assert.equal(microNoAgreement.creditPeriodDays, 15);
    const expected15 = new Date(baseDate.getTime() + 15 * 24 * 60 * 60 * 1000);
    assert.equal(microNoAgreement.statutoryDueDate.toISOString(), expected15.toISOString());

    // Case 2: Small supplier with 30-day agreement
    const small30 = calculateMsmeDueDate(baseDate, {
      msmeCategory: "Small",
      creditPeriodDays: 30,
    });
    assert.equal(small30.isMsme, true);
    assert.equal(small30.creditPeriodDays, 30);

    // Case 3: Small supplier with 60-day agreement (capped at 45 days by Section 15 MSMED Act)
    const small60 = calculateMsmeDueDate(baseDate, {
      msmeCategory: "Small",
      creditPeriodDays: 60,
    });
    assert.equal(small60.isMsme, true);
    assert.equal(small60.creditPeriodDays, 45); // statutory ceiling

    // Case 4: Non-MSME supplier
    const nonMsme = calculateMsmeDueDate(baseDate, {
      msmeCategory: "None",
      creditPeriodDays: 90,
    });
    assert.equal(nonMsme.isMsme, false);
    assert.equal(nonMsme.statutoryDueDate, null);
  });

  it("generates compliant, balanced Tally XML with correct debits (negative) and credits (positive)", () => {
    const voucher = {
      voucherNumber: "PUR-0042",
      voucherType: "Purchase",
      voucherDate: new Date("2026-06-10"),
      referenceNumber: "INV-2026-881",
      referenceDate: new Date("2026-06-08"),
      partyLedgerName: "Apex Steel Works Ltd",
      narration: "Raw materials purchase for Q1 production",
      msmeDetails: {
        isMsme: true,
        category: "Micro",
        creditPeriodDays: 15,
      },
      entries: [
        {
          accountName: "General Purchase Account",
          debitAmountPaise: 1000000, // ₹10,000.00
          creditAmountPaise: 0,
        },
        {
          accountName: "Input CGST",
          debitAmountPaise: 90000, // ₹900.00
          creditAmountPaise: 0,
        },
        {
          accountName: "Input SGST",
          debitAmountPaise: 90000, // ₹900.00
          creditAmountPaise: 0,
        },
        {
          accountName: "Apex Steel Works Ltd",
          debitAmountPaise: 0,
          creditAmountPaise: 1180000, // ₹11,800.00
        },
      ],
    };

    const envelope = buildTallyXmlEnvelope([voucher], "Acme Enterprises");
    assert.equal(envelope.voucherCount, 1);
    assert.equal(envelope.validation.isValid, true);
    assert.equal(envelope.validation.errors.length, 0);

    const xml = envelope.xml;

    // Verify root tags
    assert.ok(xml.includes("<ENVELOPE>"));
    assert.ok(xml.includes("<TALLYREQUEST>Import Data</TALLYREQUEST>"));
    assert.ok(xml.includes("<SVCURRENTCOMPANY>Acme Enterprises</SVCURRENTCOMPANY>"));
    assert.ok(xml.includes("<VOUCHER VCHTYPE=\"Purchase\" ACTION=\"Create\" OBJVIEW=\"Accounting Voucher View\">"));
    assert.ok(xml.includes("<REFERENCE>INV-2026-881</REFERENCE>"));
    assert.ok(xml.includes("<PARTYLEDGERNAME>Apex Steel Works Ltd</PARTYLEDGERNAME>"));

    // Verify Tally polarity:
    // Debit of ₹10,000.00 must be -10000.00 with ISDEEMEDPOSITIVE=Yes
    assert.ok(xml.includes("<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>"));
    assert.ok(xml.includes("<AMOUNT>-10000.00</AMOUNT>"));
    assert.ok(xml.includes("<AMOUNT>-900.00</AMOUNT>"));

    // Credit of ₹11,800.00 must be 11800.00 with ISDEEMEDPOSITIVE=No
    assert.ok(xml.includes("<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>"));
    assert.ok(xml.includes("<AMOUNT>11800.00</AMOUNT>"));

    // Verify party bill allocation
    assert.ok(xml.includes("<BILLALLOCATIONS.LIST>"));
    assert.ok(xml.includes("<BILLCREDITPERIOD>15 Days</BILLCREDITPERIOD>"));
  });

  it("schema linter rejects unbalanced vouchers and inverted polarity", () => {
    // Malformed XML with unequal debits and credits
    const unbalancedXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Purchase">
            <DATE>20260401</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>PUR-BAD-01</VOUCHERNUMBER>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Expense</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>-500.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Creditor</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>450.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </REQUESTDATA>
      </IMPORTDATA>
    </BODY>
</ENVELOPE>`;

    const result = validateTallyXml(unbalancedXml);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes("Double-entry balance violation")));
  });

  it("schema linter rejects polarity violations (debits marked positive)", () => {
    const wrongPolarityXml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Purchase">
            <DATE>20260401</DATE>
            <VOUCHERTYPENAME>Purchase</VOUCHERTYPENAME>
            <VOUCHERNUMBER>PUR-BAD-02</VOUCHERNUMBER>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Expense</LEDGERNAME>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <AMOUNT>500.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Creditor</LEDGERNAME>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <AMOUNT>-500.00</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </REQUESTDATA>
      </IMPORTDATA>
    </BODY>
</ENVELOPE>`;

    const result = validateTallyXml(wrongPolarityXml);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.some((e) => e.includes("Polarity violation")));
  });
});

