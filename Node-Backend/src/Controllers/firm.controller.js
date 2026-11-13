/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { Firm } from "../Models/firm.model.js";
import { User } from "../Models/user.model.js";
import { Client } from "../Models/client.model.js";
import { AuditLog } from "../Models/auditLog.model.js";

// Get current firm details
export const getCurrentFirm = AsyncHandler(async (req, res) => {
  const firm = await Firm.findById(req.firmId);
  if (!firm) {
    throw new ApiError(404, "Firm not found.");
  }

  const clientCount = await Client.countDocuments({ firm: req.firmId, status: "Active" });
  const teamCount = await User.countDocuments({ firm: req.firmId, isActive: true });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        firm,
        stats: {
          clientCount,
          teamCount,
          maxClients: firm.subscription?.maxClients || 15,
          monthlyDocLimit: firm.subscription?.monthlyDocLimit || 300,
          docsProcessedThisMonth: firm.subscription?.docsProcessedThisMonth || 0,
        },
      },
      "Firm details retrieved successfully."
    )
  );
});

// Update firm settings
export const updateFirm = AsyncHandler(async (req, res) => {
  const { name, phone, panNumber, gstin, address, settings } = req.body;

  const firm = await Firm.findById(req.firmId);
  if (!firm) {
    throw new ApiError(404, "Firm not found.");
  }

  if (name) firm.name = name;
  if (phone) firm.phone = phone;
  if (panNumber) firm.panNumber = panNumber.toUpperCase();
  if (gstin) firm.gstin = gstin.toUpperCase();
  if (address) firm.address = { ...firm.address, ...address };
  if (settings) firm.settings = { ...firm.settings, ...settings };

  await firm.save();

  await AuditLog.create({
    firm: req.firmId,
    user: req.user._id,
    action: "FIRM_UPDATED",
    entityType: "Firm",
    entityId: firm._id,
    ipAddress: req.ip,
  });

  return res.status(200).json(
    new ApiResponse(200, firm, "Firm profile updated successfully.")
  );
});

// List team members for the firm
export const listTeamMembers = AsyncHandler(async (req, res) => {
  const members = await User.find({ firm: req.firmId })
    .select("-password -refreshToken")
    .populate("assignedClients", "businessName gstin");

  return res.status(200).json(
    new ApiResponse(200, members, "Team members retrieved successfully.")
  );
});

// Add / invite team member
export const addTeamMember = AsyncHandler(async (req, res) => {
  const { fullName, email, password, role, assignedClients, phone } = req.body;

  if (!fullName || !email || !password) {
    throw new ApiError(400, "Full name, email, and temporary password are required.");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, "User with this email already exists.");
  }

  const assignedRole = ["Firm_Admin", "CA", "Accountant", "Client_User", "Viewer"].includes(role)
    ? role
    : "Accountant";

  const newUser = await User.create({
    firm: req.firmId,
    fullName,
    userName: email.split("@")[0] + Math.floor(100 + Math.random() * 900),
    email: email.toLowerCase(),
    password,
    role: assignedRole,
    assignedClients: assignedClients || [],
    phone: phone || "",
    verified: true,
  });

  await AuditLog.create({
    firm: req.firmId,
    user: req.user._id,
    action: "USER_ROLE_CHANGED",
    entityType: "User",
    entityId: newUser._id,
    diff: { newRole: assignedRole },
    ipAddress: req.ip,
  });

  const sanitized = await User.findById(newUser._id).select("-password -refreshToken");

  return res.status(201).json(
    new ApiResponse(201, sanitized, "Team member added successfully.")
  );
});

