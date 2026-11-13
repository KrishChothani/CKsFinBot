/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { Voucher } from "../Models/voucher.model.js";
import { Client } from "../Models/client.model.js";
import { AuditLog } from "../Models/auditLog.model.js";
import { buildTallyXmlEnvelope } from "../Services/tallyExport.service.js";
import ExcelJS from "exceljs";

// Helper to format date for Tally XML: YYYYMMDD
const formatTallyDate = (d) => {
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
};

// Preview Tally XML with Invariant & Schema Validation Report
export const previewTallyXml = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const { voucherType, startDate, endDate } = req.query;

  if (!clientId) {
    throw new ApiError(400, "Client workspace ID is required.");
  }

  const client = await Client.findOne({ _id: clientId, firm: req.firmId });
  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  let query = { firm: req.firmId, client: clientId, status: "Posted" };
  if (voucherType) query.voucherType = voucherType;
  if (startDate || endDate) {
    query.voucherDate = {};
    if (startDate) query.voucherDate.$gte = new Date(startDate);
    if (endDate) query.voucherDate.$lte = new Date(endDate);
  }

  const vouchers = await Voucher.find(query).sort({ voucherDate: 1 }).lean();
  if (vouchers.length === 0) {
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          xml: "",
          voucherCount: 0,
          validation: { isValid: true, errors: [], warnings: [] },
        },
        "No posted vouchers found matching criteria."
      )
    );
  }

  const companyName = client.tradeName || client.businessName || "CKsFinBot Client";
  const result = buildTallyXmlEnvelope(vouchers, companyName);

  return res.status(200).json(
    new ApiResponse(200, result, "Tally XML generated and verified against standard schema.")
  );
});

// Export Vouchers to standard TallyPrime XML
export const exportTallyXml = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const { voucherType, startDate, endDate } = req.query;

  if (!clientId) {
    throw new ApiError(400, "Client workspace ID is required for Tally export.");
  }

  const client = await Client.findOne({ _id: clientId, firm: req.firmId });
  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  let query = { firm: req.firmId, client: clientId, status: "Posted" };
  if (voucherType) query.voucherType = voucherType;
  if (startDate || endDate) {
    query.voucherDate = {};
    if (startDate) query.voucherDate.$gte = new Date(startDate);
    if (endDate) query.voucherDate.$lte = new Date(endDate);
  }

  const vouchers = await Voucher.find(query).sort({ voucherDate: 1 }).lean();

  if (vouchers.length === 0) {
    throw new ApiError(404, "No posted vouchers found matching the export criteria.");
  }

  const companyName = client.tradeName || client.businessName || "CKsFinBot Client";
  const { xml, voucherCount } = buildTallyXmlEnvelope(vouchers, companyName);

  // Mark exported
  const voucherIds = vouchers.map((v) => v._id);
  await Voucher.updateMany(
    { _id: { $in: voucherIds } },
    { $set: { tallyExported: true, tallyExportedAt: new Date() } }
  );

  await AuditLog.create({
    firm: req.firmId,
    client: clientId,
    user: req.user._id,
    action: "EXPORT_TALLY_XML",
    entityType: "Voucher",
    entityId: client._id,
    diff: { count: voucherCount },
    ipAddress: req.ip,
  });

  const filename = `Tally_Import_${client.businessName.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.xml`;

  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(xml);
});

// Export formatted Excel Purchase / Sales Register
export const exportExcelRegister = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const { voucherType = "Purchase" } = req.query;

  if (!clientId) {
    throw new ApiError(400, "Client workspace ID is required for Excel export.");
  }

  const client = await Client.findOne({ _id: clientId, firm: req.firmId });
  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  const vouchers = await Voucher.find({
    firm: req.firmId,
    client: clientId,
    voucherType,
    status: "Posted",
  })
    .populate("sourceDocument")
    .sort({ voucherDate: 1 })
    .lean();

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CKsFinBot Enterprise";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`${voucherType} Register`);

  // Style header row
  sheet.columns = [
    { header: "Voucher No", key: "voucherNumber", width: 15 },
    { header: "Date", key: "date", width: 14 },
    { header: "Particulars / Vendor", key: "particulars", width: 32 },
    { header: "Taxable Value (₹)", key: "taxable", width: 18 },
    { header: "CGST (₹)", key: "cgst", width: 14 },
    { header: "SGST (₹)", key: "sgst", width: 14 },
    { header: "IGST (₹)", key: "igst", width: 14 },
    { header: "Total Amount (₹)", key: "total", width: 18 },
    { header: "Narration", key: "narration", width: 36 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E3A8A" }, // Corporate Dark Blue
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  vouchers.forEach((v) => {
    // Extract breakdown
    let taxable = 0;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let vendorName = "";

    v.entries.forEach((e) => {
      if (e.creditAmount > 0 && !vendorName) {
        vendorName = e.accountName;
      }
      if (e.debitAmount > 0) {
        if (e.accountName.toLowerCase().includes("cgst")) cgst += e.debitAmount;
        else if (e.accountName.toLowerCase().includes("sgst")) sgst += e.debitAmount;
        else if (e.accountName.toLowerCase().includes("igst")) igst += e.debitAmount;
        else if (!e.accountName.toLowerCase().includes("round")) taxable += e.debitAmount;
      }
    });

    const row = sheet.addRow({
      voucherNumber: v.voucherNumber,
      date: new Date(v.voucherDate).toISOString().split("T")[0],
      particulars: vendorName || v.narration || "N/A",
      taxable,
      cgst,
      sgst,
      igst,
      total: v.totalAmount,
      narration: v.narration || "",
    });

    // Formatting currency cells
    [4, 5, 6, 7, 8].forEach((colIdx) => {
      const cell = row.getCell(colIdx);
      cell.numFmt = "₹#,##0.00";
    });
  });

  await AuditLog.create({
    firm: req.firmId,
    client: clientId,
    user: req.user._id,
    action: "EXPORT_EXCEL",
    entityType: "Voucher",
    entityId: client._id,
    diff: { count: vouchers.length },
    ipAddress: req.ip,
  });

  const filename = `${voucherType}_Register_${client.businessName.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.xlsx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  await workbook.xlsx.write(res);
  return res.end();
});

// Export Vouchers to Zoho Books compatible CSV format
export const exportZohoBooksCsv = AsyncHandler(async (req, res) => {
  const clientId = req.query.clientId || req.clientId;
  const { voucherType = "Purchase" } = req.query;

  if (!clientId) {
    throw new ApiError(400, "Client workspace ID is required for Zoho Books export.");
  }

  const client = await Client.findOne({ _id: clientId, firm: req.firmId });
  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  const vouchers = await Voucher.find({
    firm: req.firmId,
    client: clientId,
    voucherType,
    status: "Posted",
  }).sort({ voucherDate: 1 });

  // Build CSV content
  const headers = [
    "Vendor Name",
    "Bill Date",
    "Due Date",
    "Bill Number",
    "Account",
    "Item Description",
    "Price",
    "Tax Percentage",
    "Tax Amount",
    "Total",
    "Notes",
  ];

  const rows = [headers.join(",")];

  for (const v of vouchers) {
    const billDate = new Date(v.voucherDate).toISOString().slice(0, 10);
    const dueDate = new Date(v.voucherDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const vendorEntry = (v.entries || []).find((e) => e.creditAmount > 0);
    const vendorName = (vendorEntry?.accountName || "Vendor").replace(/,/g, " ");

    const expenseEntry = (v.entries || []).find((e) => e.debitAmount > 0);
    const accountName = (expenseEntry?.accountName || "Purchases").replace(/,/g, " ");

    const taxable = Number((expenseEntry?.debitAmount || v.totalAmount * 0.82).toFixed(2));
    const taxAmount = Number((v.totalAmount - taxable).toFixed(2));
    const taxPercent = taxable > 0 ? Math.round((taxAmount / taxable) * 100) : 18;

    rows.push(
      [
        `"${vendorName}"`,
        billDate,
        dueDate,
        `"${v.voucherNumber}"`,
        `"${accountName}"`,
        `"${(v.narration || "Document Entry").replace(/"/g, '""')}"`,
        taxable,
        taxPercent,
        taxAmount,
        v.totalAmount,
        `"Exported from CKsFinBot Enterprise"`,
      ].join(",")
    );
  }

  await AuditLog.create({
    firm: req.firmId,
    client: clientId,
    performedBy: req.user._id,
    action: "VOUCHER_POST",
    entityType: "Voucher",
    entityId: client._id,
    metadata: { details: `Exported ${vouchers.length} vouchers to Zoho Books CSV` },
  });

  const filename = `ZohoBooks_${voucherType}_${client.businessName.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.status(200).send(rows.join("\n"));
});

