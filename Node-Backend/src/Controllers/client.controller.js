/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { Client } from "../Models/client.model.js";
import { Document } from "../Models/document.model.js";
import { LedgerAccount } from "../Models/ledgerAccount.model.js";
import { AuditLog } from "../Models/auditLog.model.js";
import { seedDefaultChartOfAccounts } from "../Utils/chartOfAccountsSeed.js";

// Create a new client entity workspace
export const createClient = AsyncHandler(async (req, res) => {
  const {
    businessName,
    tradeName,
    legalStructure,
    gstin,
    panNumber,
    industry,
    financialYear,
  } = req.body;

  if (!businessName) {
    throw new ApiError(400, "Business name is required.");
  }

  const cleanGstin = gstin ? gstin.trim().toUpperCase() : "";
  const cleanPan = panNumber
    ? panNumber.trim().toUpperCase()
    : cleanGstin.length >= 12
    ? cleanGstin.substring(2, 12)
    : "";
  const stateCode = cleanGstin.length >= 2 ? cleanGstin.substring(0, 2) : "24";

  // Create unique inbox email e.g. client_abc123@inbox.cksfinbot.com
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .substring(0, 10);
  const inboxEmail = `${slug}_${Math.floor(1000 + Math.random() * 9000)}@inbox.cksfinbot.com`;

  const client = await Client.create({
    firm: req.firmId,
    businessName,
    tradeName: tradeName || businessName,
    legalStructure: legalStructure || "Private_Limited",
    gstin: cleanGstin,
    panNumber: cleanPan,
    industry: industry || "General",
    financialYear: financialYear || { currentFY: "2024-2025" },
    inboxEmail,
    settings: {
      stateCode,
    },
  });

  // Automatically seed standard Indian accounting ledgers
  await seedDefaultChartOfAccounts(req.firmId, client._id);

  await AuditLog.create({
    firm: req.firmId,
    client: client._id,
    user: req.user._id,
    action: "CLIENT_CREATED",
    entityType: "Client",
    entityId: client._id,
    ipAddress: req.ip,
  });

  return res.status(201).json(
    new ApiResponse(201, client, "Client workspace created and Chart of Accounts initialized.")
  );
});

// List all clients for the active firm
export const listClients = AsyncHandler(async (req, res) => {
  let query = { firm: req.firmId, status: "Active" };

  // If Client_User, restrict to assigned client
  if (req.user.role === "Client_User" && req.user.assignedClients?.length > 0) {
    query._id = { $in: req.user.assignedClients };
  }

  const clients = await Client.find(query).sort({ businessName: 1 }).lean();

  // Enrich with pending review document count
  const clientIds = clients.map((c) => c._id);
  const pendingCounts = await Document.aggregate([
    {
      $match: {
        client: { $in: clientIds },
        status: { $in: ["Needs_Review", "Queued", "Processing"] },
      },
    },
    {
      $group: {
        _id: "$client",
        count: { $sum: 1 },
      },
    },
  ]);

  const countMap = {};
  pendingCounts.forEach((p) => {
    countMap[p._id.toString()] = p.count;
  });

  const enrichedClients = clients.map((c) => ({
    ...c,
    pendingReviewCount: countMap[c._id.toString()] || 0,
  }));

  return res.status(200).json(
    new ApiResponse(200, enrichedClients, "Clients retrieved successfully.")
  );
});

// Get client by ID
export const getClientById = AsyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const client = await Client.findOne({ _id: clientId, firm: req.firmId });

  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  return res.status(200).json(
    new ApiResponse(200, client, "Client retrieved successfully.")
  );
});

// Update client workspace
export const updateClient = AsyncHandler(async (req, res) => {
  const { clientId } = req.params;
  const { businessName, tradeName, legalStructure, gstin, panNumber, industry, settings } = req.body;

  const client = await Client.findOne({ _id: clientId, firm: req.firmId });
  if (!client) {
    throw new ApiError(404, "Client not found.");
  }

  if (businessName) client.businessName = businessName;
  if (tradeName) client.tradeName = tradeName;
  if (legalStructure) client.legalStructure = legalStructure;
  if (gstin) {
    client.gstin = gstin.toUpperCase();
    if (gstin.length >= 2) client.settings.stateCode = gstin.substring(0, 2);
  }
  if (panNumber) client.panNumber = panNumber.toUpperCase();
  if (industry) client.industry = industry;
  if (settings) client.settings = { ...client.settings, ...settings };

  await client.save();

  await AuditLog.create({
    firm: req.firmId,
    client: client._id,
    user: req.user._id,
    action: "CLIENT_UPDATED",
    entityType: "Client",
    entityId: client._id,
    ipAddress: req.ip,
  });

  return res.status(200).json(
    new ApiResponse(200, client, "Client updated successfully.")
  );
});

// List Chart of Accounts / Ledgers for a client
export const listClientLedgers = AsyncHandler(async (req, res) => {
  const clientId = req.params.clientId || req.clientId;
  if (!clientId) {
    throw new ApiError(400, "Client ID required.");
  }

  const ledgers = await LedgerAccount.find({ client: clientId }).sort({ accountGroup: 1, accountName: 1 });

  return res.status(200).json(
    new ApiResponse(200, ledgers, "Client Chart of Accounts retrieved successfully.")
  );
});

// Create custom Ledger Account
export const createClientLedger = AsyncHandler(async (req, res) => {
  const clientId = req.params.clientId || req.clientId;
  const { accountName, accountGroup, accountCode, openingBalance, gstin } = req.body;

  if (!accountName || !accountGroup) {
    throw new ApiError(400, "Account name and account group are required.");
  }

  const newLedger = await LedgerAccount.create({
    firm: req.firmId,
    client: clientId,
    accountName: accountName.trim(),
    accountGroup,
    accountCode: accountCode || "",
    openingBalance: Number(openingBalance) || 0,
    currentBalance: Number(openingBalance) || 0,
    gstin: gstin ? gstin.toUpperCase() : "",
  });

  return res.status(201).json(
    new ApiResponse(201, newLedger, "Ledger account created successfully.")
  );
});

