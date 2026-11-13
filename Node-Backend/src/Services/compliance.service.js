/** @format */

import { ComplianceTask } from "../Models/complianceTask.model.js";
import { AuditLog } from "../Models/auditLog.model.js";

/**
 * Seed full statutory Indian compliance calendar for an SME client for the financial year
 */
export const seedIndianComplianceCalendar = async (
  firmId,
  clientId,
  financialYear = "2026-2027"
) => {
  const existingCount = await ComplianceTask.countDocuments({
    client: clientId,
    financialYear,
  });

  if (existingCount > 0) {
    // Already seeded, refresh overdue status
    const now = new Date();
    await ComplianceTask.updateMany(
      {
        client: clientId,
        financialYear,
        status: "Pending",
        statutoryDueDate: { $lt: now },
      },
      { status: "Overdue" }
    );
    return;
  }

  // Parse start year (e.g. 2026 from "2026-2027")
  const startYear = parseInt(financialYear.split("-")[0], 10) || 2026;
  const tasks = [];

  const months = [
    { name: "April", year: startYear, dueMonth: 4, dueYear: startYear }, // April return due in May
    { name: "May", year: startYear, dueMonth: 5, dueYear: startYear },
    { name: "June", year: startYear, dueMonth: 6, dueYear: startYear },
    { name: "July", year: startYear, dueMonth: 7, dueYear: startYear },
    { name: "August", year: startYear, dueMonth: 8, dueYear: startYear },
    { name: "September", year: startYear, dueMonth: 9, dueYear: startYear },
    { name: "October", year: startYear, dueMonth: 10, dueYear: startYear },
    { name: "November", year: startYear, dueMonth: 11, dueYear: startYear },
    { name: "December", year: startYear, dueMonth: 12, dueYear: startYear },
    { name: "January", year: startYear + 1, dueMonth: 1, dueYear: startYear + 1 },
    { name: "February", year: startYear + 1, dueMonth: 2, dueYear: startYear + 1 },
    { name: "March", year: startYear + 1, dueMonth: 3, dueYear: startYear + 1 },
  ];

  // 1. Monthly GSTR-1 (11th of succeeding month)
  months.forEach((m) => {
    // Target due date: 11th of next month
    const dueDate = new Date(m.dueYear, m.dueMonth, 11);
    tasks.push({
      firm: firmId,
      client: clientId,
      financialYear,
      category: "GST",
      taskName: `GSTR-1 Monthly Return`,
      period: `${m.name} ${m.year}`,
      statutoryDueDate: dueDate,
      status: dueDate < new Date() ? "Overdue" : "Pending",
      isSystemGenerated: true,
    });
  });

  // 2. Monthly GSTR-3B (20th of succeeding month)
  months.forEach((m) => {
    const dueDate = new Date(m.dueYear, m.dueMonth, 20);
    tasks.push({
      firm: firmId,
      client: clientId,
      financialYear,
      category: "GST",
      taskName: `GSTR-3B Summary Return & Tax Payment`,
      period: `${m.name} ${m.year}`,
      statutoryDueDate: dueDate,
      status: dueDate < new Date() ? "Overdue" : "Pending",
      isSystemGenerated: true,
    });
  });

  // 3. Monthly TDS Payment (7th of succeeding month, 30th April for March)
  months.forEach((m) => {
    const isMarch = m.name === "March";
    const dueDay = isMarch ? 30 : 7;
    const dueDate = new Date(m.dueYear, m.dueMonth, dueDay);
    tasks.push({
      firm: firmId,
      client: clientId,
      financialYear,
      category: "TDS",
      taskName: `TDS Challan 281 Deposit`,
      period: `${m.name} ${m.year}`,
      statutoryDueDate: dueDate,
      status: dueDate < new Date() ? "Overdue" : "Pending",
      isSystemGenerated: true,
    });
  });

  // 4. Quarterly TDS Returns (Form 24Q / 26Q)
  tasks.push({
    firm: firmId,
    client: clientId,
    financialYear,
    category: "TDS",
    taskName: `Quarterly TDS Return (Q1 Form 24Q/26Q)`,
    period: `Q1 (Apr - Jun ${startYear})`,
    statutoryDueDate: new Date(startYear, 6, 31), // 31 July
    status: new Date(startYear, 6, 31) < new Date() ? "Overdue" : "Pending",
  });
  tasks.push({
    firm: firmId,
    client: clientId,
    financialYear,
    category: "TDS",
    taskName: `Quarterly TDS Return (Q2 Form 24Q/26Q)`,
    period: `Q2 (Jul - Sep ${startYear})`,
    statutoryDueDate: new Date(startYear, 9, 31), // 31 Oct
    status: new Date(startYear, 9, 31) < new Date() ? "Overdue" : "Pending",
  });
  tasks.push({
    firm: firmId,
    client: clientId,
    financialYear,
    category: "TDS",
    taskName: `Quarterly TDS Return (Q3 Form 24Q/26Q)`,
    period: `Q3 (Oct - Dec ${startYear})`,
    statutoryDueDate: new Date(startYear + 1, 0, 31), // 31 Jan
    status: new Date(startYear + 1, 0, 31) < new Date() ? "Overdue" : "Pending",
  });
  tasks.push({
    firm: firmId,
    client: clientId,
    financialYear,
    category: "TDS",
    taskName: `Quarterly TDS Return (Q4 Form 24Q/26Q)`,
    period: `Q4 (Jan - Mar ${startYear + 1})`,
    statutoryDueDate: new Date(startYear + 1, 4, 31), // 31 May
    status: new Date(startYear + 1, 4, 31) < new Date() ? "Overdue" : "Pending",
  });

  // 5. Advance Tax Installments
  const advanceTaxDates = [
    { name: "1st Installment (15%)", date: new Date(startYear, 5, 15) },
    { name: "2nd Installment (45%)", date: new Date(startYear, 8, 15) },
    { name: "3rd Installment (75%)", date: new Date(startYear, 11, 15) },
    { name: "4th Installment (100%)", date: new Date(startYear + 1, 2, 15) },
  ];
  advanceTaxDates.forEach((adv) => {
    tasks.push({
      firm: firmId,
      client: clientId,
      financialYear,
      category: "ADVANCE_TAX",
      taskName: `Advance Tax - ${adv.name}`,
      period: `FY ${financialYear}`,
      statutoryDueDate: adv.date,
      status: adv.date < new Date() ? "Overdue" : "Pending",
    });
  });

  // 6. Annual Income Tax & Audit Deadlines
  tasks.push({
    firm: firmId,
    client: clientId,
    financialYear,
    category: "INCOME_TAX",
    taskName: `Non-Audit Income Tax Return (ITR)`,
    period: `AY ${startYear + 1}-${startYear + 2}`,
    statutoryDueDate: new Date(startYear, 6, 31), // 31 July
    status: new Date(startYear, 6, 31) < new Date() ? "Overdue" : "Pending",
  });
  tasks.push({
    firm: firmId,
    client: clientId,
    financialYear,
    category: "INCOME_TAX",
    taskName: `Tax Audit Report (Form 3CA / 3CD)`,
    period: `AY ${startYear + 1}-${startYear + 2}`,
    statutoryDueDate: new Date(startYear, 8, 30), // 30 Sept
    status: new Date(startYear, 8, 30) < new Date() ? "Overdue" : "Pending",
  });
  tasks.push({
    firm: firmId,
    client: clientId,
    financialYear,
    category: "INCOME_TAX",
    taskName: `Corporate / Audited Income Tax Return`,
    period: `AY ${startYear + 1}-${startYear + 2}`,
    statutoryDueDate: new Date(startYear, 9, 31), // 31 Oct
    status: new Date(startYear, 9, 31) < new Date() ? "Overdue" : "Pending",
  });

  // 7. Annual GST Return (GSTR-9 & 9C)
  tasks.push({
    firm: firmId,
    client: clientId,
    financialYear,
    category: "GST",
    taskName: `GSTR-9 Annual Return & GSTR-9C Reconciliation`,
    period: `FY ${financialYear}`,
    statutoryDueDate: new Date(startYear, 11, 31), // 31 Dec
    status: new Date(startYear, 11, 31) < new Date() ? "Overdue" : "Pending",
  });

  await ComplianceTask.insertMany(tasks);
};

/**
 * Fetch client tasks with stats
 */
export const getClientComplianceCalendar = async ({
  firmId,
  clientId,
  financialYear = "2026-2027",
  category = "ALL",
}) => {
  // Ensure calendar is seeded
  await seedIndianComplianceCalendar(firmId, clientId, financialYear);

  const query = { client: clientId, financialYear };
  if (category && category !== "ALL") {
    query.category = category;
  }

  const tasks = await ComplianceTask.find(query).sort({ statutoryDueDate: 1 });

  const totalTasks = tasks.length;
  const filedCount = tasks.filter((t) => t.status === "Filed").length;
  const pendingCount = tasks.filter((t) => t.status === "Pending").length;
  const overdueCount = tasks.filter((t) => t.status === "Overdue").length;

  return {
    financialYear,
    metrics: {
      totalTasks,
      filedCount,
      pendingCount,
      overdueCount,
      complianceScore:
        totalTasks > 0 ? Math.round((filedCount / totalTasks) * 100) : 100,
    },
    tasks,
  };
};

/**
 * Record filing of a compliance task
 */
export const recordComplianceFiling = async ({
  firmId,
  clientId,
  taskId,
  filingDetails,
  userId,
}) => {
  const task = await ComplianceTask.findOne({ _id: taskId, client: clientId });
  if (!task) throw new Error("Compliance task not found.");

  task.status = "Filed";
  task.filingDetails = {
    filedDate: filingDetails.filedDate ? new Date(filingDetails.filedDate) : new Date(),
    acknowledgementNumber: filingDetails.acknowledgementNumber || "",
    challanCin: filingDetails.challanCin || "",
    taxPaidAmount: Number(filingDetails.taxPaidAmount || 0),
    filedBy: userId,
    remarks: filingDetails.remarks || "",
  };
  await task.save();

  await AuditLog.create({
    firm: firmId,
    client: clientId,
    performedBy: userId,
    action: "VOUCHER_POST",
    entityType: "Document",
    entityId: task._id,
    metadata: {
      details: `Compliance marked as filed: ${task.taskName} (${task.period}) - ACK/CIN: ${task.filingDetails.acknowledgementNumber || task.filingDetails.challanCin}`,
    },
  });

  return task;
};

