/** @format */

import { LedgerAccount } from "../Models/ledgerAccount.model.js";

const DEFAULT_ACCOUNTS = [
  { accountName: "Cash on Hand", accountGroup: "Cash_in_Hand", accountCode: "1010" },
  { accountName: "Main Bank Account", accountGroup: "Bank_Accounts", accountCode: "1020" },
  { accountName: "Input CGST", accountGroup: "Duties_and_Taxes", accountCode: "2110" },
  { accountName: "Input SGST", accountGroup: "Duties_and_Taxes", accountCode: "2120" },
  { accountName: "Input IGST", accountGroup: "Duties_and_Taxes", accountCode: "2130" },
  { accountName: "Output CGST", accountGroup: "Duties_and_Taxes", accountCode: "2140" },
  { accountName: "Output SGST", accountGroup: "Duties_and_Taxes", accountCode: "2150" },
  { accountName: "Output IGST", accountGroup: "Duties_and_Taxes", accountCode: "2160" },
  { accountName: "General Purchase Account", accountGroup: "Purchase_Accounts", accountCode: "5010" },
  { accountName: "General Sales Account", accountGroup: "Sales_Accounts", accountCode: "4010" },
  { accountName: "Office Expenses", accountGroup: "Indirect_Expenses", accountCode: "6010" },
  { accountName: "Rent & Utilities", accountGroup: "Indirect_Expenses", accountCode: "6020" },
  { accountName: "Professional & Legal Fees", accountGroup: "Indirect_Expenses", accountCode: "6030" },
  { accountName: "Round Off Account", accountGroup: "Indirect_Expenses", accountCode: "6040" },
  { accountName: "Sundry Creditors Control", accountGroup: "Sundry_Creditors", accountCode: "2010" },
  { accountName: "Sundry Debtors Control", accountGroup: "Sundry_Debtors", accountCode: "1030" },
];

export const seedDefaultChartOfAccounts = async (firmId, clientId) => {
  try {
    const existing = await LedgerAccount.countDocuments({ client: clientId });
    if (existing > 0) return;

    const accountsToInsert = DEFAULT_ACCOUNTS.map((acc) => ({
      ...acc,
      firm: firmId,
      client: clientId,
      isSystemDefault: true,
      openingBalance: 0,
      currentBalance: 0,
    }));

    await LedgerAccount.insertMany(accountsToInsert);
    console.log(`✅ Seeded ${accountsToInsert.length} default ledgers for client ${clientId}`);
  } catch (err) {
    console.error("Failed to seed default accounts:", err);
  }
};

