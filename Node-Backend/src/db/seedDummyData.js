/** @format */

import dns from "node:dns";

// Ensure reliable DNS resolution for MongoDB Atlas SRV connection strings
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch {
  // Ignore in environments where setting DNS servers is restricted
}

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "./index.js";

import { User } from "../Models/user.model.js";
import { Firm } from "../Models/firm.model.js";
import { Client } from "../Models/client.model.js";
import { LedgerAccount } from "../Models/ledgerAccount.model.js";
import { Document } from "../Models/document.model.js";
import { ExtractedData } from "../Models/extractedData.model.js";
import { Voucher } from "../Models/voucher.model.js";
import { BankTransaction } from "../Models/bankTransaction.model.js";
import { Gstr2bRecord } from "../Models/gstr2b.model.js";
import { ComplianceTask } from "../Models/complianceTask.model.js";
import { DocumentRequest } from "../Models/documentRequest.model.js";
import { ProcessingMetric } from "../Models/processingMetric.model.js";
import { AuditLog } from "../Models/auditLog.model.js";
import { Conversation } from "../Models/conversation.model.js";
import { Message } from "../Models/message.model.js";

async function seedData() {
  console.log("--------------------------------------------------");
  console.log("Connecting to MongoDB Atlas...");
  await connectDB();

  // Ensure legacy pineconeNamespace index is removed if present
  try {
    await Document.collection.dropIndex("pineconeNamespace_1");
  } catch (e) {
    // Already dropped
  }

  // 1. Setup User: developer123@gmail.com
  console.log("\n[1/10] Setting up user: developer123@gmail.com");
  let user = await User.findOne({ email: "developer123@gmail.com" });

  const plainPassword = "developer@123";
  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  if (!user) {
    user = new User({
      email: "developer123@gmail.com",
      userName: "developer123",
      fullName: "CA Krish Chothani (Senior Partner)",
      password: hashedPassword,
      phone: "+91 98250 12345",
      role: "Firm_Admin",
      verified: true,
      isActive: true,
    });
    // Direct save with pre-hashed to avoid double-hash or save unhashed
    await User.collection.insertOne(user);
    user = await User.findOne({ email: "developer123@gmail.com" });
  } else {
    // Update existing user
    user.fullName = "CA Krish Chothani (Senior Partner)";
    user.userName = "developer123";
    user.role = "Firm_Admin";
    user.verified = true;
    user.isActive = true;
    user.phone = "+91 98250 12345";
    user.password = hashedPassword;
    await User.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          fullName: user.fullName,
          userName: user.userName,
          role: user.role,
          verified: true,
          isActive: true,
          phone: user.phone,
          password: hashedPassword,
        },
      }
    );
  }
  console.log("User verified and password synchronized for developer123@gmail.com");

  // 2. Setup Firm: CKsFinBot Enterprise CA Practice
  console.log("\n[2/10] Setting up Enterprise CA Practice Firm...");
  let firm;
  if (user.firm) {
    firm = await Firm.findById(user.firm);
  }
  if (!firm) {
    firm = await Firm.findOne({ email: "developer123@gmail.com" });
  }

  if (!firm) {
    firm = await Firm.create({
      name: "CKsFinBot Enterprise CA Practice",
      slug: "cksfinbot-ca-enterprise",
      firmType: "CA_Firm",
      email: "developer123@gmail.com",
      phone: "+91 98250 12345",
      panNumber: "AAAFC1234D",
      gstin: "24AAAFC1234D1Z2",
      address: {
        line1: "401-404, Titanium Business Square, SG Highway",
        city: "Ahmedabad",
        state: "Gujarat",
        pincode: "380054",
        country: "India",
      },
      subscription: {
        plan: "Enterprise",
        status: "active",
        maxClients: 50,
        monthlyDocLimit: 2500,
        docsProcessedThisMonth: 148,
        renewsAt: new Date("2027-03-31"),
      },
      settings: {
        defaultCurrency: "INR",
        financialYearStartMonth: 4,
        enableAuditLog: true,
      },
    });
  } else {
    firm.name = "CKsFinBot Enterprise CA Practice";
    firm.slug = "cksfinbot-ca-enterprise";
    firm.firmType = "CA_Firm";
    firm.panNumber = "AAAFC1234D";
    firm.gstin = "24AAAFC1234D1Z2";
    firm.address = {
      line1: "401-404, Titanium Business Square, SG Highway",
      city: "Ahmedabad",
      state: "Gujarat",
      pincode: "380054",
      country: "India",
    };
    firm.subscription = {
      plan: "Enterprise",
      status: "active",
      maxClients: 50,
      monthlyDocLimit: 2500,
      docsProcessedThisMonth: 148,
      renewsAt: new Date("2027-03-31"),
    };
    await firm.save();
  }

  // Ensure user is linked to firm
  if (!user.firm || user.firm.toString() !== firm._id.toString()) {
    await User.collection.updateOne(
      { _id: user._id },
      { $set: { firm: firm._id } }
    );
  }
  console.log(`Firm configured: "${firm.name}" (ID: ${firm._id})`);

  // 3. Clear old demo data for this firm so we have a clean, balanced state
  console.log("\n[3/10] Resetting workspace data for clean demo environment...");
  const oldClients = await Client.find({ firm: firm._id });
  const oldClientIds = oldClients.map((c) => c._id);

  if (oldClientIds.length > 0) {
    await Promise.all([
      Document.deleteMany({ client: { $in: oldClientIds } }),
      ExtractedData.deleteMany({ client: { $in: oldClientIds } }),
      Voucher.deleteMany({ client: { $in: oldClientIds } }),
      LedgerAccount.deleteMany({ client: { $in: oldClientIds } }),
      BankTransaction.deleteMany({ client: { $in: oldClientIds } }),
      Gstr2bRecord.deleteMany({ client: { $in: oldClientIds } }),
      ComplianceTask.deleteMany({ client: { $in: oldClientIds } }),
      DocumentRequest.deleteMany({ client: { $in: oldClientIds } }),
      ProcessingMetric.deleteMany({ firm: firm._id }),
      AuditLog.deleteMany({ firm: firm._id }),
      Client.deleteMany({ firm: firm._id }),
    ]);
  }

  // 4. Create 3 Representative SME Clients
  console.log("\n[4/10] Creating 3 Realistic Client Workspaces...");
  const clientApex = await Client.create({
    firm: firm._id,
    businessName: "Apex Steel & Alloys Pvt Ltd",
    tradeName: "Apex Steels",
    legalStructure: "Private_Limited",
    gstin: "24AAACA1234A1Z5",
    panNumber: "AAACA1234A",
    industry: "Heavy Engineering & Steel Fabrication",
    financialYear: {
      currentFY: "2026-2027",
      booksBeginDate: new Date("2026-04-01"),
    },
    inboxEmail: "apexsteel.inbox@cksfinbot.com",
    authorizedPhoneNumbers: ["+91 98250 99881", "+91 98250 99882"],
    gstCredentials: {
      username: "apex_steel_gst",
      gspAppKey: "gsp_live_key_9921",
      isConnected: true,
      lastSyncedAt: new Date(),
    },
    approvalPolicy: {
      requiresPartnerApprovalAbove: 100000,
      requiresSeniorReview: true,
    },
    settings: {
      autoVoucherApprovalConfidence: 0.95,
      stateCode: "24",
    },
    status: "Active",
  });

  const clientZenith = await Client.create({
    firm: firm._id,
    businessName: "Zenith Agro Tech LLP",
    tradeName: "Zenith Agro",
    legalStructure: "LLP",
    gstin: "27AABCZ5678B1Z2",
    panNumber: "AABCZ5678B",
    industry: "AgriTech & Food Processing",
    financialYear: {
      currentFY: "2026-2027",
      booksBeginDate: new Date("2026-04-01"),
    },
    inboxEmail: "zenithagro.inbox@cksfinbot.com",
    authorizedPhoneNumbers: ["+91 97120 44551"],
    gstCredentials: {
      username: "zenith_gst",
      gspAppKey: "gsp_live_key_3341",
      isConnected: true,
      lastSyncedAt: new Date(),
    },
    approvalPolicy: {
      requiresPartnerApprovalAbove: 75000,
      requiresSeniorReview: true,
    },
    settings: {
      autoVoucherApprovalConfidence: 0.95,
      stateCode: "27",
    },
    status: "Active",
  });

  const clientNexus = await Client.create({
    firm: firm._id,
    businessName: "Nexus Digital Logistics Pvt Ltd",
    tradeName: "Nexus Logistics",
    legalStructure: "Private_Limited",
    gstin: "29AABCN9012C1Z8",
    panNumber: "AABCN9012C",
    industry: "Logistics & Supply Chain Solutions",
    financialYear: {
      currentFY: "2026-2027",
      booksBeginDate: new Date("2026-04-01"),
    },
    inboxEmail: "nexuslogistics.inbox@cksfinbot.com",
    authorizedPhoneNumbers: ["+91 99001 22334"],
    status: "Active",
  });

  console.log(`Created clients:
  1. ${clientApex.businessName} (GSTIN: ${clientApex.gstin})
  2. ${clientZenith.businessName} (GSTIN: ${clientZenith.gstin})
  3. ${clientNexus.businessName} (GSTIN: ${clientNexus.gstin})`);

  // 5. Create Chart of Accounts (Ledgers) for Apex Steel
  console.log("\n[5/10] Building Chart of Accounts with MSME tagging for Apex Steel...");
  const ledgersData = [
    // Bank & Cash
    {
      accountName: "HDFC Bank Current A/c (9182)",
      accountCode: "1010",
      accountGroup: "Bank_Accounts",
      openingBalance: 1250000,
      currentBalance: 1420500,
      isSystemDefault: true,
    },
    {
      accountName: "State Bank of India CC A/c",
      accountCode: "1020",
      accountGroup: "Bank_Accounts",
      openingBalance: 450000,
      currentBalance: 320000,
    },
    {
      accountName: "Cash in Hand",
      accountCode: "1030",
      accountGroup: "Cash_in_Hand",
      openingBalance: 65000,
      currentBalance: 42000,
      isSystemDefault: true,
    },
    // Fixed Assets
    {
      accountName: "Plant & Heavy Machinery",
      accountCode: "1100",
      accountGroup: "Fixed_Assets",
      openingBalance: 4500000,
      currentBalance: 4500000,
    },
    {
      accountName: "Factory Land & Building",
      accountCode: "1110",
      accountGroup: "Fixed_Assets",
      openingBalance: 8200000,
      currentBalance: 8200000,
    },
    // Sales Accounts
    {
      accountName: "Domestic Sales - 18% GST",
      accountCode: "3010",
      accountGroup: "Sales_Accounts",
      isSystemDefault: true,
    },
    {
      accountName: "Scrap & Waste Metal Sales",
      accountCode: "3020",
      accountGroup: "Sales_Accounts",
    },
    // Purchases & Direct Costs
    {
      accountName: "Raw Material Steel Coil Purchases",
      accountCode: "4010",
      accountGroup: "Purchase_Accounts",
      isSystemDefault: true,
    },
    {
      accountName: "Factory Power, Fuel & Electricity",
      accountCode: "4020",
      accountGroup: "Direct_Expenses",
    },
    {
      accountName: "Inward Freight & Transportation",
      accountCode: "4030",
      accountGroup: "Direct_Expenses",
    },
    // Indirect Expenses
    {
      accountName: "Factory & Office Rent",
      accountCode: "5010",
      accountGroup: "Indirect_Expenses",
    },
    {
      accountName: "Legal & Statutory Audit Fees",
      accountCode: "5020",
      accountGroup: "Indirect_Expenses",
    },
    {
      accountName: "Salaries & Wages",
      accountCode: "5030",
      accountGroup: "Indirect_Expenses",
    },
    {
      accountName: "Enterprise Cloud & ERP Subscriptions",
      accountCode: "5040",
      accountGroup: "Indirect_Expenses",
    },
    // Duties & Taxes
    {
      accountName: "Input CGST 9%",
      accountCode: "2010",
      accountGroup: "Duties_and_Taxes",
      isSystemDefault: true,
    },
    {
      accountName: "Input SGST 9%",
      accountCode: "2020",
      accountGroup: "Duties_and_Taxes",
      isSystemDefault: true,
    },
    {
      accountName: "Input IGST 18%",
      accountCode: "2030",
      accountGroup: "Duties_and_Taxes",
      isSystemDefault: true,
    },
    {
      accountName: "Output CGST 9%",
      accountCode: "2040",
      accountGroup: "Duties_and_Taxes",
      isSystemDefault: true,
    },
    {
      accountName: "Output SGST 9%",
      accountCode: "2050",
      accountGroup: "Duties_and_Taxes",
      isSystemDefault: true,
    },
    {
      accountName: "Output IGST 18%",
      accountCode: "2060",
      accountGroup: "Duties_and_Taxes",
      isSystemDefault: true,
    },
    {
      accountName: "TDS Payable u/s 194C (Contractors)",
      accountCode: "2070",
      accountGroup: "Duties_and_Taxes",
    },
    {
      accountName: "TDS Payable u/s 194J (Professional)",
      accountCode: "2080",
      accountGroup: "Duties_and_Taxes",
    },
    // Vendors (Sundry Creditors) with Section 43B(h) MSME Tags
    {
      accountName: "Tata Steel BSL Ltd",
      accountCode: "2100",
      accountGroup: "Sundry_Creditors",
      msmeCategory: "Medium",
      gstin: "27AAACT0012A1Z1",
      creditPeriodDays: 45,
      openingBalance: 0,
      currentBalance: 531000,
    },
    {
      accountName: "Shree Ram Industrial Spares",
      accountCode: "2110",
      accountGroup: "Sundry_Creditors",
      msmeCategory: "Micro",
      msmeUdyamNumber: "UDYAM-GJ-01-0012345",
      gstin: "24AABCS9876Q1Z3",
      creditPeriodDays: 45,
      openingBalance: 0,
      currentBalance: 88500,
    },
    {
      accountName: "Kapadia Precision Tools LLP",
      accountCode: "2120",
      accountGroup: "Sundry_Creditors",
      msmeCategory: "Small",
      msmeUdyamNumber: "UDYAM-MH-02-0054321",
      gstin: "27AACCK4455P1Z8",
      creditPeriodDays: 30,
      openingBalance: 0,
      currentBalance: 147500,
    },
    {
      accountName: "Gujarat Gas Ltd",
      accountCode: "2130",
      accountGroup: "Sundry_Creditors",
      msmeCategory: "None",
      gstin: "24AAACG1122D1Z0",
      creditPeriodDays: 30,
      openingBalance: 0,
      currentBalance: 42000,
    },
    {
      accountName: "Aditya Translines Logistics",
      accountCode: "2140",
      accountGroup: "Sundry_Creditors",
      msmeCategory: "Small",
      msmeUdyamNumber: "UDYAM-GJ-01-0099881",
      gstin: "24AABCA5566K1Z4",
      creditPeriodDays: 45,
      openingBalance: 0,
      currentBalance: 64900,
    },
    // Debtors (Customers)
    {
      accountName: "Larsen & Toubro Heavy Eng Ltd",
      accountCode: "1200",
      accountGroup: "Sundry_Debtors",
      gstin: "27AAACL0123A1ZV",
      openingBalance: 0,
      currentBalance: 885000,
    },
    {
      accountName: "Adani Ports & Special Economic Zone",
      accountCode: "1210",
      accountGroup: "Sundry_Debtors",
      gstin: "24AAACA0000A1Z0",
      openingBalance: 0,
      currentBalance: 619500,
    },
    {
      accountName: "Reliance Infrastructure Ltd",
      accountCode: "1220",
      accountGroup: "Sundry_Debtors",
      gstin: "27AAACR1234C1Z9",
      openingBalance: 0,
      currentBalance: 413000,
    },
    // Capital
    {
      accountName: "Partners / Equity Capital",
      accountCode: "3000",
      accountGroup: "Capital_Account",
      openingBalance: 10000000,
      currentBalance: 10000000,
    },
  ];

  const ledgerDocs = await LedgerAccount.insertMany(
    ledgersData.map((l) => ({
      ...l,
      firm: firm._id,
      client: clientApex._id,
    }))
  );

  const ledgerMap = new Map();
  ledgerDocs.forEach((l) => ledgerMap.set(l.accountName, l));

  // Link default cash & bank accounts in Client settings
  clientApex.settings.defaultCashAccount = ledgerMap.get("Cash in Hand")._id;
  clientApex.settings.defaultBankAccount = ledgerMap.get(
    "HDFC Bank Current A/c (9182)"
  )._id;
  await clientApex.save();
  console.log(`Created ${ledgerDocs.length} ledger accounts for Apex Steel.`);

  // 6. Create Documents & Extracted Data
  console.log("\n[6/10] Seeding Document Inbox & AI Review Queue...");

  // Doc 1: Needs_Review (Shree Ram Fasteners)
  const doc1 = await Document.create({
    firm: firm._id,
    client: clientApex._id,
    user: user._id,
    fileName: "INV-2026-SR-918.pdf",
    fileSize: 245100,
    fileType: "application/pdf",
    s3Url:
      "https://cksfinbot-storage.s3.ap-south-1.amazonaws.com/samples/INV-2026-SR-918.pdf",
    documentType: "Purchase_Invoice",
    source: "Web_Upload",
    status: "Needs_Review",
  });

  const extData1 = await ExtractedData.create({
    firm: firm._id,
    client: clientApex._id,
    document: doc1._id,
    rawOcrText:
      "TAX INVOICE\nShree Ram Industrial Spares\nGSTIN: 24AABCS9876Q1Z3\nInvoice No: SR/26/918\nDate: 04-Nov-2026\nBill To: Apex Steel & Alloys Pvt Ltd (24AAACA1234A1Z5)\nItem: Hardened Carbon Steel Fasteners M16 (HSN 7318)\nQty: 500 KGS @ 150/KG = 75,000\nCGST 9%: 6,750 | SGST 9%: 6,750\nTotal: INR 88,500",
    extractionConfidence: 0.96,
    invoiceDetails: {
      invoiceNumber: { value: "SR/26/918", confidence: 0.98 },
      invoiceDate: { value: new Date("2026-11-04"), confidence: 0.97 },
      dueDate: { value: new Date("2026-12-19"), confidence: 0.95 },
      placeOfSupply: { value: "24-Gujarat", confidence: 0.99 },
      currency: { value: "INR", confidence: 1.0 },
    },
    counterParty: {
      name: { value: "Shree Ram Industrial Spares", confidence: 0.97 },
      gstin: { value: "24AABCS9876Q1Z3", confidence: 0.99 },
      pan: { value: "AABCS9876Q", confidence: 0.99 },
      address: {
        value: "Plot 42, GIDC Vatva, Ahmedabad, Gujarat 382445",
        confidence: 0.92,
      },
    },
    lineItems: [
      {
        description: "Hardened Carbon Steel Fasteners M16",
        hsnCode: "7318",
        quantity: 500,
        unit: "KGS",
        rate: 150,
        taxableAmount: 75000,
        gstRate: 18,
        cgstAmount: 6750,
        sgstAmount: 6750,
        igstAmount: 0,
        cessAmount: 0,
        totalAmount: 88500,
        confidence: 0.98,
      },
    ],
    financialSummary: {
      subTotal: 75000,
      totalCgst: 6750,
      totalSgst: 6750,
      totalIgst: 0,
      totalCess: 0,
      roundOff: 0,
      grandTotal: 88500,
    },
    validationResults: {
      isMathValid: true,
      isGstinChecksumValid: true,
      hasTaxMismatch: false,
      isInterState: false,
      errors: [],
      warnings: [
        "Vendor is tagged as MSME Micro Enterprise (UDYAM-GJ-01-0012345). Section 43B(h) 45-day payment statutory rule applies.",
      ],
    },
  });
  doc1.extractedDataId = extData1._id;
  await doc1.save();

  // Doc 2: Needs_Review (Kapadia CNC Tools - Inter-state)
  const doc2 = await Document.create({
    firm: firm._id,
    client: clientApex._id,
    user: user._id,
    fileName: "Kapadia_Tools_TaxInv_1042.pdf",
    fileSize: 312000,
    fileType: "application/pdf",
    s3Url:
      "https://cksfinbot-storage.s3.ap-south-1.amazonaws.com/samples/Kapadia_Tools_TaxInv_1042.pdf",
    documentType: "Purchase_Invoice",
    source: "Email_Forward",
    status: "Needs_Review",
  });

  const extData2 = await ExtractedData.create({
    firm: firm._id,
    client: clientApex._id,
    document: doc2._id,
    rawOcrText:
      "TAX INVOICE\nKapadia Precision Tools LLP\nGSTIN: 27AACCK4455P1Z8\nInvoice No: KPT/MH/1042\nDate: 02-Nov-2026\nBill To: Apex Steel & Alloys Pvt Ltd (Gujarat)\nItem: Tungsten Carbide CNC Milling Cutters 12mm (HSN 8207)\nQty: 25 NOS @ 5,000 = 1,25,000\nIGST 18%: 22,500\nTotal: INR 1,47,500",
    extractionConfidence: 0.94,
    invoiceDetails: {
      invoiceNumber: { value: "KPT/MH/1042", confidence: 0.96 },
      invoiceDate: { value: new Date("2026-11-02"), confidence: 0.95 },
      dueDate: { value: new Date("2026-12-02"), confidence: 0.94 },
      placeOfSupply: { value: "24-Gujarat", confidence: 0.98 },
      currency: { value: "INR", confidence: 1.0 },
    },
    counterParty: {
      name: { value: "Kapadia Precision Tools LLP", confidence: 0.96 },
      gstin: { value: "27AACCK4455P1Z8", confidence: 0.99 },
      pan: { value: "AACCK4455P", confidence: 0.99 },
      address: {
        value: "Wagle Industrial Estate, Thane, Maharashtra 400604",
        confidence: 0.91,
      },
    },
    lineItems: [
      {
        description: "Tungsten Carbide CNC Milling Cutters 12mm",
        hsnCode: "8207",
        quantity: 25,
        unit: "NOS",
        rate: 5000,
        taxableAmount: 125000,
        gstRate: 18,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 22500,
        cessAmount: 0,
        totalAmount: 147500,
        confidence: 0.95,
      },
    ],
    financialSummary: {
      subTotal: 125000,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 22500,
      totalCess: 0,
      roundOff: 0,
      grandTotal: 147500,
    },
    validationResults: {
      isMathValid: true,
      isGstinChecksumValid: true,
      hasTaxMismatch: false,
      isInterState: true,
      errors: [],
      warnings: [
        "Inter-state transaction detected: Supplier is in Maharashtra (27), Place of Supply is Gujarat (24). IGST applied correctly.",
      ],
    },
  });
  doc2.extractedDataId = extData2._id;
  await doc2.save();

  // Doc 3: Needs_Review (Legal Fee Note - Section 194J flag)
  const doc3 = await Document.create({
    firm: firm._id,
    client: clientApex._id,
    user: user._id,
    fileName: "Legal_Audit_Fee_Note_Q2.pdf",
    fileSize: 182400,
    fileType: "application/pdf",
    s3Url:
      "https://cksfinbot-storage.s3.ap-south-1.amazonaws.com/samples/Legal_Audit_Fee_Note_Q2.pdf",
    documentType: "Expense_Bill",
    source: "Client_Portal",
    status: "Needs_Review",
  });

  const extData3 = await ExtractedData.create({
    firm: firm._id,
    client: clientApex._id,
    document: doc3._id,
    rawOcrText:
      "FEE BILL / MEMO\nMehta & Associates Legal Advisors\nGSTIN: 24AAAFM4411C1Z3\nBill No: LEG/2026/044\nDate: 05-Nov-2026\nBill To: Apex Steel & Alloys Pvt Ltd\nNarration: Professional Retainership & Contract Vetting\nFees: 45,000 | CGST 9%: 4,050 | SGST 9%: 4,050\nTotal: INR 53,100",
    extractionConfidence: 0.95,
    invoiceDetails: {
      invoiceNumber: { value: "LEG/2026/044", confidence: 0.96 },
      invoiceDate: { value: new Date("2026-11-05"), confidence: 0.97 },
      dueDate: { value: new Date("2026-11-20"), confidence: 0.94 },
      placeOfSupply: { value: "24-Gujarat", confidence: 0.98 },
      currency: { value: "INR", confidence: 1.0 },
    },
    counterParty: {
      name: { value: "Mehta & Associates Legal Advisors", confidence: 0.97 },
      gstin: { value: "24AAAFM4411C1Z3", confidence: 0.99 },
      pan: { value: "AAAFM4411C", confidence: 0.99 },
    },
    lineItems: [
      {
        description: "Professional Legal Advisory & Statutory Contract Vetting",
        hsnCode: "9982",
        quantity: 1,
        unit: "NOS",
        rate: 45000,
        taxableAmount: 45000,
        gstRate: 18,
        cgstAmount: 4050,
        sgstAmount: 4050,
        igstAmount: 0,
        cessAmount: 0,
        totalAmount: 53100,
        confidence: 0.97,
      },
    ],
    financialSummary: {
      subTotal: 45000,
      totalCgst: 4050,
      totalSgst: 4050,
      totalIgst: 0,
      totalCess: 0,
      roundOff: 0,
      grandTotal: 53100,
    },
    validationResults: {
      isMathValid: true,
      isGstinChecksumValid: true,
      hasTaxMismatch: false,
      isInterState: false,
      errors: [],
      warnings: [
        "Section 194J TDS warning: Invoice exceeds ₹30,000 annual threshold for professional/legal fees. 10% TDS (₹4,500) deduction recommended.",
      ],
    },
  });
  doc3.extractedDataId = extData3._id;
  await doc3.save();

  // Doc 4: Processing
  await Document.create({
    firm: firm._id,
    client: clientApex._id,
    user: user._id,
    fileName: "HDFC_Bank_Statement_Oct2026.pdf",
    fileSize: 421000,
    fileType: "application/pdf",
    s3Url:
      "https://cksfinbot-storage.s3.ap-south-1.amazonaws.com/samples/HDFC_Bank_Statement_Oct2026.pdf",
    documentType: "Bank_Statement",
    source: "Web_Upload",
    status: "Processing",
  });

  // Doc 5: Queued
  await Document.create({
    firm: firm._id,
    client: clientApex._id,
    user: user._id,
    fileName: "Vendor_Invoices_Batch_Nov08.zip",
    fileSize: 1250000,
    fileType: "application/zip",
    s3Url:
      "https://cksfinbot-storage.s3.ap-south-1.amazonaws.com/samples/Vendor_Invoices_Batch_Nov08.zip",
    documentType: "Purchase_Invoice",
    source: "Web_Upload",
    status: "Queued",
  });

  // Doc 6: Failed
  await Document.create({
    firm: firm._id,
    client: clientApex._id,
    user: user._id,
    fileName: "Blurred_Mobile_Receipt.jpg",
    fileSize: 95400,
    fileType: "image/jpeg",
    s3Url:
      "https://cksfinbot-storage.s3.ap-south-1.amazonaws.com/samples/Blurred_Mobile_Receipt.jpg",
    documentType: "Expense_Bill",
    source: "Client_Portal",
    status: "Failed",
    errorMessage:
      "OCR confidence below 0.40 threshold. Image is blurred and tax invoice number is illegible.",
  });

  // Doc 7: Approved / Voucher Created (Tata Steel)
  const doc7 = await Document.create({
    firm: firm._id,
    client: clientApex._id,
    user: user._id,
    fileName: "TataSteel_TaxInvoice_TS00891.pdf",
    fileSize: 489000,
    fileType: "application/pdf",
    s3Url:
      "https://cksfinbot-storage.s3.ap-south-1.amazonaws.com/samples/TataSteel_TaxInvoice_TS00891.pdf",
    documentType: "Purchase_Invoice",
    source: "Web_Upload",
    status: "Voucher_Created",
  });

  // Doc 8: Approved / Voucher Created (Larsen & Toubro Sales)
  const doc8 = await Document.create({
    firm: firm._id,
    client: clientApex._id,
    user: user._id,
    fileName: "SalesInv_LarsenToubro_LT4410.pdf",
    fileSize: 512000,
    fileType: "application/pdf",
    s3Url:
      "https://cksfinbot-storage.s3.ap-south-1.amazonaws.com/samples/SalesInv_LarsenToubro_LT4410.pdf",
    documentType: "Sales_Invoice",
    source: "Web_Upload",
    status: "Voucher_Created",
  });

  console.log("Seeded 8 documents spanning all workflow pipeline statuses.");

  // 7. Seed Balanced Vouchers (Purchase, Sales, Payment, Receipt)
  console.log("\n[7/10] Posting Balanced Double-Entry Vouchers...");

  // Voucher 1: High-value Purchase from Tata Steel (Triggers 4-Eye Senior Review Workflow!)
  const v1 = await Voucher.create({
    firm: firm._id,
    client: clientApex._id,
    voucherNumber: "PUR-2026-001",
    voucherType: "Purchase",
    voucherDate: new Date("2026-10-15"),
    sourceDocument: doc7._id,
    referenceNumber: "TS/2026/00891",
    referenceDate: new Date("2026-10-15"),
    partyLedgerName: "Tata Steel BSL Ltd",
    totalAmount: 531000,
    totalAmountPaise: 53100000,
    narration:
      "Being purchase of HR Steel Coils 2.5mm vide Invoice TS/2026/00891",
    postedBy: user._id,
    status: "Posted",
    approvalWorkflow: {
      stage: "Pending_Senior_CA",
      currentReviewerRole: "Senior_CA",
      requiresApproval: true,
      history: [
        {
          action: "Submitted",
          by: user._id,
          role: "Accountant",
          date: new Date("2026-10-16"),
          remarks:
            "High-value purchase > ₹1,00,000 threshold submitted for Senior CA verification.",
        },
      ],
    },
    entries: [
      {
        ledgerAccount: ledgerMap.get("Raw Material Steel Coil Purchases")._id,
        accountName: "Raw Material Steel Coil Purchases",
        debitAmount: 450000,
        debitAmountPaise: 45000000,
        creditAmount: 0,
        creditAmountPaise: 0,
        narration: "Raw materials purchase 450,000",
      },
      {
        ledgerAccount: ledgerMap.get("Input IGST 18%")._id,
        accountName: "Input IGST 18%",
        debitAmount: 81000,
        debitAmountPaise: 8100000,
        creditAmount: 0,
        creditAmountPaise: 0,
        narration: "18% IGST on inter-state steel inward",
      },
      {
        ledgerAccount: ledgerMap.get("Tata Steel BSL Ltd")._id,
        accountName: "Tata Steel BSL Ltd",
        debitAmount: 0,
        debitAmountPaise: 0,
        creditAmount: 531000,
        creditAmountPaise: 53100000,
        narration: "Credit to supplier Tata Steel BSL Ltd",
      },
    ],
  });
  doc7.voucherId = v1._id;
  await doc7.save();

  // Voucher 2: Overdue MSME Purchase (Date: 52 days ago -> Triggers Section 43B(h) overdue!)
  const v2Date = new Date(Date.now() - 52 * 24 * 60 * 60 * 1000);
  const v2DueDate = new Date(v2Date.getTime() + 45 * 24 * 60 * 60 * 1000); // Overdue by 7 days
  const v2 = await Voucher.create({
    firm: firm._id,
    client: clientApex._id,
    voucherNumber: "PUR-2026-002",
    voucherType: "Purchase",
    voucherDate: v2Date, // ~Sept 18, 2026
    referenceNumber: "SRIS-2026-904",
    referenceDate: v2Date,
    partyLedgerName: "Shree Ram Industrial Spares",
    msmeDetails: {
      isMsme: true,
      category: "Micro",
      udyamNumber: "UDYAM-GJ-01-0012345",
      creditPeriodDays: 45,
      statutoryDueDate: v2DueDate,
      isOverdue: true,
    },
    totalAmount: 118000,
    totalAmountPaise: 11800000,
    narration:
      "Being purchase of industrial ball bearings and CNC tooling spare parts",
    postedBy: user._id,
    status: "Posted",
    approvalWorkflow: { stage: "Approved", requiresApproval: false },
    entries: [
      {
        ledgerAccount: ledgerMap.get("Raw Material Steel Coil Purchases")._id,
        accountName: "Raw Material Steel Coil Purchases",
        debitAmount: 100000,
        debitAmountPaise: 10000000,
        creditAmount: 0,
        creditAmountPaise: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Input CGST 9%")._id,
        accountName: "Input CGST 9%",
        debitAmount: 9000,
        debitAmountPaise: 900000,
        creditAmount: 0,
        creditAmountPaise: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Input SGST 9%")._id,
        accountName: "Input SGST 9%",
        debitAmount: 9000,
        debitAmountPaise: 900000,
        creditAmount: 0,
        creditAmountPaise: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Shree Ram Industrial Spares")._id,
        accountName: "Shree Ram Industrial Spares",
        debitAmount: 0,
        debitAmountPaise: 0,
        creditAmount: 118000,
        creditAmountPaise: 11800000,
      },
    ],
  });

  // Voucher 3: MSME Purchase due in 4 days from Kapadia Tools (Date: 26 days ago, credit period 30)
  const v3Date = new Date(Date.now() - 26 * 24 * 60 * 60 * 1000);
  const v3DueDate = new Date(v3Date.getTime() + 30 * 24 * 60 * 60 * 1000); // Due in ~4 days
  const v3 = await Voucher.create({
    firm: firm._id,
    client: clientApex._id,
    voucherNumber: "PUR-2026-003",
    voucherType: "Purchase",
    voucherDate: v3Date, // ~Oct 14, 2026
    referenceNumber: "KPT-891",
    referenceDate: v3Date,
    partyLedgerName: "Kapadia Precision Tools LLP",
    msmeDetails: {
      isMsme: true,
      category: "Small",
      udyamNumber: "UDYAM-GJ-02-0054321",
      creditPeriodDays: 30,
      statutoryDueDate: v3DueDate,
      isOverdue: false,
    },
    totalAmount: 82600,
    totalAmountPaise: 8260000,
    narration: "Being purchase of carbide end mills and drilling inserts",
    postedBy: user._id,
    status: "Posted",
    approvalWorkflow: { stage: "Approved", requiresApproval: false },
    entries: [
      {
        ledgerAccount: ledgerMap.get("Raw Material Steel Coil Purchases")._id,
        accountName: "Raw Material Steel Coil Purchases",
        debitAmount: 70000,
        debitAmountPaise: 7000000,
        creditAmount: 0,
        creditAmountPaise: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Input IGST 18%")._id,
        accountName: "Input IGST 18%",
        debitAmount: 12600,
        debitAmountPaise: 1260000,
        creditAmount: 0,
        creditAmountPaise: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Kapadia Precision Tools LLP")._id,
        accountName: "Kapadia Precision Tools LLP",
        debitAmount: 0,
        debitAmountPaise: 0,
        creditAmount: 82600,
        creditAmountPaise: 8260000,
      },
    ],
  });
        creditAmount: 82600,
      },
    ],
  });

  // Voucher 4: High Cash Payment (Disallowance alert: Section 40A(3) cash > ₹10,000)
  const v4 = await Voucher.create({
    firm: firm._id,
    client: clientApex._id,
    voucherNumber: "PAY-2026-001",
    voucherType: "Payment",
    voucherDate: new Date("2026-10-22"),
    totalAmount: 35000,
    narration:
      "Urgent cash payment disbursed to freight driver for heavy machinery transport",
    postedBy: user._id,
    status: "Posted",
    approvalWorkflow: { stage: "Approved", requiresApproval: false },
    entries: [
      {
        ledgerAccount: ledgerMap.get("Inward Freight & Transportation")._id,
        accountName: "Inward Freight & Transportation",
        debitAmount: 35000,
        creditAmount: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Cash in Hand")._id,
        accountName: "Cash in Hand",
        debitAmount: 0,
        creditAmount: 35000,
      },
    ],
  });

  // Voucher 5: Legal Fees without TDS deduction (Disallowance alert: Section 194J)
  const v5 = await Voucher.create({
    firm: firm._id,
    client: clientApex._id,
    voucherNumber: "PUR-2026-004",
    voucherType: "Purchase",
    voucherDate: new Date("2026-10-25"),
    totalAmount: 59000,
    narration:
      "Professional and legal fees for contract restructuring without TDS deduction",
    postedBy: user._id,
    status: "Posted",
    approvalWorkflow: { stage: "Approved", requiresApproval: false },
    entries: [
      {
        ledgerAccount: ledgerMap.get("Legal & Statutory Audit Fees")._id,
        accountName: "Legal & Statutory Audit Fees",
        debitAmount: 50000,
        creditAmount: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Input CGST 9%")._id,
        accountName: "Input CGST 9%",
        debitAmount: 4500,
        creditAmount: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Input SGST 9%")._id,
        accountName: "Input SGST 9%",
        debitAmount: 4500,
        creditAmount: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Shree Ram Industrial Spares")._id,
        accountName: "Shree Ram Industrial Spares",
        debitAmount: 0,
        creditAmount: 59000,
      },
    ],
  });

  // Voucher 6: Major Sales Voucher to Larsen & Toubro
  const v6 = await Voucher.create({
    firm: firm._id,
    client: clientApex._id,
    voucherNumber: "SAL-2026-001",
    voucherType: "Sales",
    voucherDate: new Date("2026-10-18"),
    sourceDocument: doc8._id,
    totalAmount: 885000,
    narration:
      "Being supply of fabricated steel girders for bridge project as per PO LT/9921",
    postedBy: user._id,
    status: "Posted",
    approvalWorkflow: { stage: "Approved", requiresApproval: false },
    entries: [
      {
        ledgerAccount: ledgerMap.get("Larsen & Toubro Heavy Eng Ltd")._id,
        accountName: "Larsen & Toubro Heavy Eng Ltd",
        debitAmount: 885000,
        creditAmount: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Domestic Sales - 18% GST")._id,
        accountName: "Domestic Sales - 18% GST",
        debitAmount: 0,
        creditAmount: 750000,
      },
      {
        ledgerAccount: ledgerMap.get("Output IGST 18%")._id,
        accountName: "Output IGST 18%",
        debitAmount: 0,
        creditAmount: 135000,
      },
    ],
  });
  doc8.voucherId = v6._id;
  await doc8.save();

  // Voucher 7: Sales Voucher to Adani Ports
  const v7 = await Voucher.create({
    firm: firm._id,
    client: clientApex._id,
    voucherNumber: "SAL-2026-002",
    voucherType: "Sales",
    voucherDate: new Date("2026-10-28"),
    totalAmount: 619500,
    narration:
      "Being supply of structural steel channels and angles for port expansion",
    postedBy: user._id,
    status: "Posted",
    approvalWorkflow: { stage: "Approved", requiresApproval: false },
    entries: [
      {
        ledgerAccount: ledgerMap.get("Adani Ports & Special Economic Zone")._id,
        accountName: "Adani Ports & Special Economic Zone",
        debitAmount: 619500,
        creditAmount: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Domestic Sales - 18% GST")._id,
        accountName: "Domestic Sales - 18% GST",
        debitAmount: 0,
        creditAmount: 525000,
      },
      {
        ledgerAccount: ledgerMap.get("Output CGST 9%")._id,
        accountName: "Output CGST 9%",
        debitAmount: 0,
        creditAmount: 47250,
      },
      {
        ledgerAccount: ledgerMap.get("Output SGST 9%")._id,
        accountName: "Output SGST 9%",
        debitAmount: 0,
        creditAmount: 47250,
      },
    ],
  });

  // Voucher 8: Sales Voucher to Reliance Infrastructure
  const v8 = await Voucher.create({
    firm: firm._id,
    client: clientApex._id,
    voucherNumber: "SAL-2026-003",
    voucherType: "Sales",
    voucherDate: new Date("2026-11-03"),
    totalAmount: 413000,
    narration: "Being supply of mild steel round bars and tie rods",
    postedBy: user._id,
    status: "Posted",
    approvalWorkflow: { stage: "Approved", requiresApproval: false },
    entries: [
      {
        ledgerAccount: ledgerMap.get("Reliance Infrastructure Ltd")._id,
        accountName: "Reliance Infrastructure Ltd",
        debitAmount: 413000,
        creditAmount: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Domestic Sales - 18% GST")._id,
        accountName: "Domestic Sales - 18% GST",
        debitAmount: 0,
        creditAmount: 350000,
      },
      {
        ledgerAccount: ledgerMap.get("Output IGST 18%")._id,
        accountName: "Output IGST 18%",
        debitAmount: 0,
        creditAmount: 63000,
      },
    ],
  });

  // Voucher 9: Bank Receipt from Larsen & Toubro
  const v9 = await Voucher.create({
    firm: firm._id,
    client: clientApex._id,
    voucherNumber: "REC-2026-001",
    voucherType: "Receipt",
    voucherDate: new Date("2026-10-29"),
    totalAmount: 500000,
    narration:
      "NEFT received from Larsen & Toubro Heavy Eng against Invoice SAL-2026-001",
    postedBy: user._id,
    status: "Posted",
    approvalWorkflow: { stage: "Approved", requiresApproval: false },
    entries: [
      {
        ledgerAccount: ledgerMap.get("HDFC Bank Current A/c (9182)")._id,
        accountName: "HDFC Bank Current A/c (9182)",
        debitAmount: 500000,
        creditAmount: 0,
      },
      {
        ledgerAccount: ledgerMap.get("Larsen & Toubro Heavy Eng Ltd")._id,
        accountName: "Larsen & Toubro Heavy Eng Ltd",
        debitAmount: 0,
        creditAmount: 500000,
      },
    ],
  });

  // Voucher 10: Bank Payment to Tata Steel BSL Ltd
  const v10 = await Voucher.create({
    firm: firm._id,
    client: clientApex._id,
    voucherNumber: "PAY-2026-002",
    voucherType: "Payment",
    voucherDate: new Date("2026-11-01"),
    totalAmount: 300000,
    narration:
      "RTGS payment to Tata Steel BSL Ltd towards part payment of PUR-2026-001",
    postedBy: user._id,
    status: "Posted",
    approvalWorkflow: { stage: "Approved", requiresApproval: false },
    entries: [
      {
        ledgerAccount: ledgerMap.get("Tata Steel BSL Ltd")._id,
        accountName: "Tata Steel BSL Ltd",
        debitAmount: 300000,
        creditAmount: 0,
      },
      {
        ledgerAccount: ledgerMap.get("HDFC Bank Current A/c (9182)")._id,
        accountName: "HDFC Bank Current A/c (9182)",
        debitAmount: 0,
        creditAmount: 300000,
      },
    ],
  });

  console.log("Seeded 10 balanced double-entry vouchers with verified debits & credits.");

  // 8. Bank Transactions (Bank Reconciliation / BRS)
  console.log("\n[8/10] Seeding Bank Statement Transactions & BRS matches...");
  await BankTransaction.create([
    {
      firm: firm._id,
      client: clientApex._id,
      bankName: "HDFC Bank Current A/c (9182)",
      accountNumber: "50200088991821",
      date: new Date("2026-10-29"),
      narration: "NEFT-CMS-LARSEN TOUBRO-REF9921827",
      referenceNumber: "NEFT9921827",
      transactionType: "Credit",
      amount: 500000,
      balance: 1750000,
      reconciliationStatus: "Reconciled",
      matchedVoucher: v9._id,
      confidenceScore: 0.99,
      matchNotes:
        "Exact amount, counterparty and reference match to voucher REC-2026-001",
      reconciledAt: new Date("2026-10-30"),
      reconciledBy: user._id,
    },
    {
      firm: firm._id,
      client: clientApex._id,
      bankName: "HDFC Bank Current A/c (9182)",
      accountNumber: "50200088991821",
      date: new Date("2026-11-01"),
      narration: "RTGS-UTIBR26305-TATA STEEL BSL LTD",
      referenceNumber: "RTGS26305",
      transactionType: "Debit",
      amount: 300000,
      balance: 1450000,
      reconciliationStatus: "Reconciled",
      matchedVoucher: v10._id,
      confidenceScore: 0.98,
      matchNotes:
        "Exact amount and beneficiary match to voucher PAY-2026-002",
      reconciledAt: new Date("2026-11-02"),
      reconciledBy: user._id,
    },
    {
      firm: firm._id,
      client: clientApex._id,
      bankName: "HDFC Bank Current A/c (9182)",
      accountNumber: "50200088991821",
      date: new Date("2026-11-04"),
      narration: "UPI-43110298-GUJARAT GAS CO-UTILITY",
      referenceNumber: "UPI43110298",
      transactionType: "Debit",
      amount: 42000,
      balance: 1408000,
      reconciliationStatus: "Suggested",
      confidenceScore: 0.88,
      matchNotes: "Suggested match with Gujarat Gas Ltd ledger balance",
    },
    {
      firm: firm._id,
      client: clientApex._id,
      bankName: "HDFC Bank Current A/c (9182)",
      accountNumber: "50200088991821",
      date: new Date("2026-11-06"),
      narration: "POS-DEBIT-IOCL PETROL PUMP SG HIGHWAY",
      referenceNumber: "POS88910",
      transactionType: "Debit",
      amount: 4850,
      balance: 1403150,
      reconciliationStatus: "Unreconciled",
    },
    {
      firm: firm._id,
      client: clientApex._id,
      bankName: "HDFC Bank Current A/c (9182)",
      accountNumber: "50200088991821",
      date: new Date("2026-11-07"),
      narration: "INTEREST CREDIT - Q2 HDFC AUTO SWEEP",
      referenceNumber: "INT2026Q2",
      transactionType: "Credit",
      amount: 17350,
      balance: 1420500,
      reconciliationStatus: "Unreconciled",
    },
  ]);
  console.log("Seeded 5 bank transactions with Reconciled, Suggested, and Unreconciled states.");

  // 9. GSTR-2B vs Books Records
  console.log("\n[9/10] Seeding GSTR-2B Recon (MATCHED, MISSING_IN_BOOKS, TAX_MISMATCH)...");
  await Gstr2bRecord.create([
    {
      firm: firm._id,
      client: clientApex._id,
      returnPeriod: "102026",
      financialYear: "2026-2027",
      supplierGstin: "27AAACT0012A1Z1",
      supplierTradeName: "Tata Steel BSL Ltd",
      invoiceNumber: "TS/2026/00891",
      normalizedInvoiceNumber: "TS202600891",
      invoiceDate: new Date("2026-10-15"),
      invoiceType: "Regular",
      invoiceValue: 531000,
      taxableValue: 450000,
      igst: 81000,
      cgst: 0,
      sgst: 0,
      itcAvailability: "Yes",
      reconciliationStatus: "MATCHED",
      matchedVoucher: v1._id,
      difference: { taxableDiff: 0, taxDiff: 0 },
      sourceFile: "GSTR2B_24AAACA1234A1Z5_102026.json",
    },
    {
      firm: firm._id,
      client: clientApex._id,
      returnPeriod: "102026",
      financialYear: "2026-2027",
      supplierGstin: "27AACCK4455P1Z8",
      supplierTradeName: "Kapadia Precision Tools LLP",
      invoiceNumber: "KPT/MH/1042",
      normalizedInvoiceNumber: "KPTMH1042",
      invoiceDate: new Date("2026-10-14"),
      invoiceType: "Regular",
      invoiceValue: 147500,
      taxableValue: 70000,
      igst: 12600,
      cgst: 0,
      sgst: 0,
      itcAvailability: "Yes",
      reconciliationStatus: "MATCHED",
      matchedVoucher: v3._id,
      difference: { taxableDiff: 0, taxDiff: 0 },
      sourceFile: "GSTR2B_24AAACA1234A1Z5_102026.json",
    },
    {
      firm: firm._id,
      client: clientApex._id,
      returnPeriod: "102026",
      financialYear: "2026-2027",
      supplierGstin: "24AABCA5566K1Z4",
      supplierTradeName: "Aditya Translines Logistics",
      invoiceNumber: "ATL/OCT/339",
      normalizedInvoiceNumber: "ATLOCT339",
      invoiceDate: new Date("2026-10-20"),
      invoiceType: "Regular",
      invoiceValue: 64900,
      taxableValue: 55000,
      cgst: 4950,
      sgst: 4950,
      igst: 0,
      itcAvailability: "Yes",
      reconciliationStatus: "MISSING_IN_BOOKS",
      difference: { taxableDiff: 55000, taxDiff: 9900 },
      sourceFile: "GSTR2B_24AAACA1234A1Z5_102026.json",
    },
    {
      firm: firm._id,
      client: clientApex._id,
      returnPeriod: "102026",
      financialYear: "2026-2027",
      supplierGstin: "24AAACG1122D1Z0",
      supplierTradeName: "Gujarat Gas Ltd",
      invoiceNumber: "GG/GAS/8821",
      normalizedInvoiceNumber: "GGGAS8821",
      invoiceDate: new Date("2026-10-24"),
      invoiceType: "Regular",
      invoiceValue: 42000,
      taxableValue: 35000,
      cgst: 3150,
      sgst: 3150,
      igst: 0,
      itcAvailability: "Yes",
      reconciliationStatus: "TAX_MISMATCH",
      difference: { taxableDiff: 0, taxDiff: 1260 },
      sourceFile: "GSTR2B_24AAACA1234A1Z5_102026.json",
    },
  ]);
  console.log("Seeded 4 GSTR-2B records with MATCHED, MISSING_IN_BOOKS, and TAX_MISMATCH.");

  // 10. Compliance Calendar, Document Requests, Observability & Chat
  console.log("\n[10/10] Seeding Compliance Tasks, Requests, Observability & AI Assistant...");

  // Compliance Tasks
  await ComplianceTask.create([
    {
      firm: firm._id,
      client: clientApex._id,
      financialYear: "2026-2027",
      category: "GST",
      taskName: "GSTR-3B Monthly Summary Return",
      period: "October 2026",
      statutoryDueDate: new Date("2026-11-20"),
      status: "Pending",
      isSystemGenerated: true,
    },
    {
      firm: firm._id,
      client: clientApex._id,
      financialYear: "2026-2027",
      category: "GST",
      taskName: "GSTR-1 Outward Supplies Statement",
      period: "October 2026",
      statutoryDueDate: new Date("2026-11-11"),
      status: "Pending",
      isSystemGenerated: true,
    },
    {
      firm: firm._id,
      client: clientApex._id,
      financialYear: "2026-2027",
      category: "TDS",
      taskName: "TDS Challan 281 Deposit (Sec 194C & 194J)",
      period: "October 2026",
      statutoryDueDate: new Date("2026-11-07"),
      status: "Filed",
      filingDetails: {
        filedDate: new Date("2026-11-06"),
        acknowledgementNumber: "TDS281-9988221",
        challanCin: "HDFC26110600124",
        taxPaidAmount: 18500,
        filedBy: user._id,
        remarks:
          "Paid online via HDFC Corporate Net Banking challan CIN verified.",
      },
      isSystemGenerated: true,
    },
    {
      firm: firm._id,
      client: clientApex._id,
      financialYear: "2026-2027",
      category: "ADVANCE_TAX",
      taskName: "Advance Tax Installment 3 (75% cumulative milestone)",
      period: "Q3 FY 2026-27",
      statutoryDueDate: new Date("2026-12-15"),
      status: "Pending",
      isSystemGenerated: true,
    },
    {
      firm: firm._id,
      client: clientApex._id,
      financialYear: "2026-2027",
      category: "TDS",
      taskName: "Quarterly TDS Return Form 26Q (Q2)",
      period: "July - September 2026",
      statutoryDueDate: new Date("2026-10-31"),
      status: "Filed",
      filingDetails: {
        filedDate: new Date("2026-10-28"),
        acknowledgementNumber: "PRN-26Q-2026-881273",
        taxPaidAmount: 42800,
        filedBy: user._id,
        remarks: "Filed through TIN-FC center token generated.",
      },
      isSystemGenerated: true,
    },
  ]);

  // Document Requests (Client Portal magic links)
  await DocumentRequest.create([
    {
      firm: firm._id,
      client: clientApex._id,
      requestedBy: user._id,
      title: "HDFC Current Account Bank Statement (October 2026)",
      description:
        "Please upload the full PDF bank statement with transaction narration for BRS reconciliation.",
      documentCategory: "Bank_Statement",
      period: "October 2026",
      urgency: "High",
      dueDate: new Date("2026-11-15"),
      token: "req_hdfc_oct26_apex",
      tokenExpiresAt: new Date("2026-11-30"),
      status: "Pending",
    },
    {
      firm: firm._id,
      client: clientApex._id,
      requestedBy: user._id,
      title: "Electricity & Factory Overhead Bills (Q2)",
      description:
        "Needed for direct manufacturing overhead voucher booking and audit schedule.",
      documentCategory: "Expense_Bill",
      period: "Q2 FY 2026-27",
      urgency: "Normal",
      dueDate: new Date("2026-11-20"),
      token: "req_gidc_q2_apex",
      tokenExpiresAt: new Date("2026-11-30"),
      status: "Pending",
    },
  ]);

  // Enterprise Observability & LLM Processing Metrics
  const sampleMetrics = [];
  const sources = ["Web_Upload", "WhatsApp", "Client_Portal", "Email"];
  const docTypes = [
    "Purchase_Invoice",
    "Sales_Invoice",
    "Expense_Bill",
    "Bank_Statement",
  ];

  for (let i = 0; i < 15; i++) {
    const daysAgo = Math.floor(i / 2);
    const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    sampleMetrics.push({
      firm: firm._id,
      client: clientApex._id,
      document: doc1._id,
      modelUsed: "gemini-2.0-flash",
      inputTokens: 1200 + Math.floor(Math.random() * 1500),
      outputTokens: 450 + Math.floor(Math.random() * 400),
      latencyMs: 1400 + Math.floor(Math.random() * 900),
      estimatedCostInr: Number((0.25 + Math.random() * 0.3).toFixed(2)),
      confidenceScore: Number((0.92 + Math.random() * 0.07).toFixed(2)),
      documentType: docTypes[i % docTypes.length],
      source: sources[i % sources.length],
      isSuccess: true,
      createdAt: date,
      updatedAt: date,
    });
  }
  await ProcessingMetric.insertMany(sampleMetrics);

  // Audit Logs
  await AuditLog.create([
    {
      firm: firm._id,
      client: clientApex._id,
      user: user._id,
      action: "CLIENT_CREATED",
      entityType: "Client",
      entityId: clientApex._id,
      diff: { after: { businessName: clientApex.businessName } },
      ipAddress: "103.212.144.10",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128",
      timestamp: new Date("2026-10-01"),
    },
    {
      firm: firm._id,
      client: clientApex._id,
      user: user._id,
      action: "VOUCHER_POSTED",
      entityType: "Voucher",
      entityId: v1._id,
      diff: { after: { voucherNumber: "PUR-2026-001", amount: 531000 } },
      ipAddress: "103.212.144.10",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128",
      timestamp: new Date("2026-10-15"),
    },
    {
      firm: firm._id,
      client: clientApex._id,
      user: user._id,
      action: "RECONCILIATION_MATCHED",
      entityType: "BankTransaction",
      entityId: v9._id,
      diff: { after: { amount: 500000, status: "Reconciled" } },
      ipAddress: "103.212.144.10",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128",
      timestamp: new Date("2026-10-30"),
    },
  ]);

  // AI Assistant Conversations
  const chatConvo = await Conversation.create({
    user: user._id,
    title: "Q2 ITC Reconciliation & Section 43B(h) Analysis",
    featureUsed: "Smart_Chat",
    documents: [doc1._id, doc2._id],
  });

  await Message.create([
    {
      conversation: chatConvo._id,
      role: "user",
      content:
        "What is our current ITC at risk due to GSTR-2B mismatches for Q2?",
      status: "success",
    },
    {
      conversation: chatConvo._id,
      role: "assistant",
      content: `Based on the latest statutory GSTR-2B reconciliation for **Apex Steel & Alloys Pvt Ltd**:

1. **Eligible Matched ITC**: **₹93,600** (Verified against Tata Steel & Kapadia Tools invoices).
2. **At-Risk / Missing in 2B**: **₹18,000** on vendor *Shree Ram Industrial Spares* (GSTR-1 not filed by counterparty before cut-off date).
3. **Action Required**: Per Section 16(2)(aa) of the CGST Act, you cannot avail this ITC until the supplier uploads Form GSTR-1. Remind vendor before the 11th.
4. **Section 43B(h) Alert**: *Shree Ram Industrial Spares* is tagged as a Micro Enterprise with an invoice overdue by 52 days. Payment must be disbursed immediately to prevent income tax disallowance.`,
      status: "success",
      confidenceScore: 0.98,
    },
  ]);

  const draftConvo = await Conversation.create({
    user: user._id,
    title: "Statutory Audit Engagement Letter FY 2026-27",
    featureUsed: "Financial_Drafter",
  });

  await Message.create([
    {
      conversation: draftConvo._id,
      role: "user",
      content:
        "Draft an independent statutory audit engagement letter for Apex Steel & Alloys Pvt Ltd as per SA 210.",
      status: "success",
    },
    {
      conversation: draftConvo._id,
      role: "assistant",
      content: `# AUDIT ENGAGEMENT LETTER
**To the Board of Directors,**  
**Apex Steel & Alloys Pvt Ltd**  
Plot 108, Phase II, GIDC Vatva, Ahmedabad, Gujarat - 382445  

**Subject: Engagement for Independent Statutory Audit for FY 2026-2027**

Dear Sirs/Madams,

You have requested that we audit the financial statements of **Apex Steel & Alloys Pvt Ltd**, which comprise the Balance Sheet as at March 31, 2027, the Statement of Profit and Loss, and notes to the financial statements, including a summary of significant accounting policies.

### 1. Objective and Scope of Audit
We are pleased to confirm our acceptance and understanding of this audit engagement by means of this letter. Our audit will be conducted with the objective of expressing an opinion on whether the financial statements give a true and fair view in accordance with the Companies Act, 2013 and applicable Accounting Standards.

### 2. Responsibilities of the Management
Management is responsible for:
- The preparation and fair presentation of the financial statements in accordance with Section 134(5) of the Companies Act, 2013.
- Compliance with Section 43B(h) regarding timely payment to Micro and Small Enterprises within 45 days.
- Timely deposit of statutory dues including TDS, TCS, and GST.

### 3. Reporting
We will issue an Independent Auditor's Report that includes our opinion on the financial statements and reporting on matters specified under the Companies (Auditor's Report) Order, 2020 (CARO 2020).

Sincerely,  
**For CKsFinBot Enterprise CA Practice**  
*Chartered Accountants (FRN: 104200W)*  

**CA Krish Chothani, FCA**  
Senior Partner  
Ahmedabad | November 09, 2026`,
      status: "success",
    },
  ]);

  // Update user's conversation list
  await User.collection.updateOne(
    { _id: user._id },
    { $set: { conversations: [chatConvo._id, draftConvo._id] } }
  );

  console.log("\n==================================================");
  console.log("DUMMY DATA SEEDING COMPLETED SUCCESSFULLY!");
  console.log("==================================================");
  console.log("Credentials:");
  console.log("  Email:    developer123@gmail.com");
  console.log("  Password: developer@123");
  console.log("Workspace:");
  console.log(`  Firm:     ${firm.name}`);
  console.log(`  Client:   ${clientApex.businessName} (GSTIN: ${clientApex.gstin})`);
  console.log("Features Seeded with Data:");
  console.log("  - Executive Dashboard (Sales, Purchases, Net GST, Top Vendors)");
  console.log("  - Document Inbox (Queued, Processing, Needs_Review, Approved, Failed)");
  console.log("  - AI Review Queue (3 detailed invoices with line items & validation)");
  console.log("  - Vouchers & Ledgers (10 balanced vouchers, Chart of Accounts)");
  console.log("  - Schedule III Financials (P&L, Balance Sheet, Ageing report)");
  console.log("  - Tax Advisory (Sec 43B(h) 45-day tracker, Sec 40A(3), Sec 194J)");
  console.log("  - Reconciliation (Bank BRS matched & unmatched, GSTR-2B vs Books)");
  console.log("  - Statutory Compliance Calendar (GST, TDS, Advance Tax tasks)");
  console.log("  - Client Portal Requests (Magic link tokens)");
  console.log("  - Enterprise 4-Eye Approval Queue & LLM Observability Metrics");
  console.log("  - AI Assistant & Drafting Studio");
  console.log("==================================================");

  await mongoose.disconnect();
}

seedData().catch((err) => {
  console.error("FATAL ERROR IN SEEDING:", err);
  process.exit(1);
});
