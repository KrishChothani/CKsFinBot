/** @format */

/**
 * Builds standard statutory Indian compliance tasks for financial year.
 */
export function generateComplianceCalendar(financialYear = "2026-2027") {
  const startYear = parseInt(financialYear.split("-")[0], 10) || 2026;
  const tasks = [];

  const months = [
    { name: "April", year: startYear, dueMonth: 4, dueYear: startYear },
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
    const dueDate = new Date(Date.UTC(m.dueYear, m.dueMonth, 11));
    tasks.push({
      category: "GST",
      taskName: `GSTR-1 Outward Supplies Return`,
      period: `${m.name} ${m.year}`,
      statutoryDueDate: dueDate.toISOString(),
    });
  });

  // 2. Monthly GSTR-3B (20th of succeeding month)
  months.forEach((m) => {
    const dueDate = new Date(Date.UTC(m.dueYear, m.dueMonth, 20));
    tasks.push({
      category: "GST",
      taskName: `GSTR-3B Monthly Return & Tax Settlement`,
      period: `${m.name} ${m.year}`,
      statutoryDueDate: dueDate.toISOString(),
    });
  });

  // 3. Monthly TDS Challan 281 Payment (7th of succeeding month)
  months.forEach((m) => {
    const isMarch = m.name === "March";
    const dueDay = isMarch ? 30 : 7;
    const dueDate = new Date(Date.UTC(m.dueYear, m.dueMonth, dueDay));
    tasks.push({
      category: "TDS",
      taskName: `TDS Challan 281 Deposit`,
      period: `${m.name} ${m.year}`,
      statutoryDueDate: dueDate.toISOString(),
    });
  });

  // 4. Quarterly Advance Tax Instalments
  tasks.push({
    category: "Income_Tax",
    taskName: "Advance Tax Q1 (15% cumulative)",
    period: `Q1 ${startYear}`,
    statutoryDueDate: new Date(Date.UTC(startYear, 5, 15)).toISOString(),
  });
  tasks.push({
    category: "Income_Tax",
    taskName: "Advance Tax Q2 (45% cumulative)",
    period: `Q2 ${startYear}`,
    statutoryDueDate: new Date(Date.UTC(startYear, 8, 15)).toISOString(),
  });
  tasks.push({
    category: "Income_Tax",
    taskName: "Advance Tax Q3 (75% cumulative)",
    period: `Q3 ${startYear}`,
    statutoryDueDate: new Date(Date.UTC(startYear, 11, 15)).toISOString(),
  });
  tasks.push({
    category: "Income_Tax",
    taskName: "Advance Tax Q4 (100% cumulative)",
    period: `Q4 ${startYear + 1}`,
    statutoryDueDate: new Date(Date.UTC(startYear + 1, 2, 15)).toISOString(),
  });

  return tasks;
}

export default {
  generateComplianceCalendar,
};

