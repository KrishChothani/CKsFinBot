/** @format */

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";
import { Firm } from "../models/firm.model.js";
import { Client } from "../models/client.model.js";
import { identityRelay } from "./identityRelay.service.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "cksfinbot_access_token_secret_dev_2026";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "cksfinbot_refresh_token_secret_dev_2026";
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || "1d";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "10d";

export class IdentityService {
  /**
   * Generates JWT Access and Refresh tokens with standard claims and role.
   */
  generateTokens(user) {
    const payload = {
      _id: String(user._id),
      email: user.email,
      userName: user.userName,
      fullName: user.fullName,
      firm: user.firm ? String(user.firm) : null,
      role: user.role || "Firm_Admin",
      assignedClients: (user.assignedClients || []).map(String),
    };

    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(
      { _id: String(user._id) },
      REFRESH_TOKEN_SECRET,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    return { accessToken, refreshToken, payload };
  }

  /**
   * Verifies an incoming access token.
   */
  verifyAccessToken(token) {
    try {
      return jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (err) {
      throw new Error(`Invalid access token: ${err.message}`);
    }
  }

  /**
   * Verifies an incoming refresh token.
   */
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, REFRESH_TOKEN_SECRET);
    } catch (err) {
      throw new Error(`Invalid refresh token: ${err.message}`);
    }
  }

  /**
   * Validates multi-tenant boundary.
   * Ensures the requesting context has valid access to firmId and clientId.
   */
  validateTenantAccess(user, firmId, clientId = null) {
    if (!firmId) {
      return { allowed: false, reason: "Firm ID is required for multi-tenant isolation." };
    }

    // Firm boundary check: User's firm must match requested firmId
    if (user.firm && String(user.firm) !== String(firmId)) {
      return {
        allowed: false,
        reason: `Cross-tenant access rejected: User belonging to firm ${user.firm} cannot access firm ${firmId}.`,
      };
    }

    // Client boundary check: For Client_User role, ensure client is in assignedClients
    if (user.role === "Client_User" && clientId) {
      const assigned = (user.assignedClients || []).map(String);
      if (!assigned.includes(String(clientId))) {
        return {
          allowed: false,
          reason: `Access denied: Client user is not assigned to client workspace ${clientId}.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Registers a new User, associates with Firm if provided, and emits UserCreatedEvent.
   */
  async registerUser({ fullName, email, userName, password, phone, role = "Firm_Admin", firmId = null }) {
    if (!fullName || !email || !userName || !password) {
      throw new Error("Missing required fields: fullName, email, userName, and password are required.");
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { userName: userName.toLowerCase() }],
    });
    if (existing) {
      throw new Error("A user with this email or username already exists.");
    }

    const user = new User({
      fullName,
      email: email.toLowerCase(),
      userName: userName.toLowerCase(),
      password, // Password hashed by pre('save')
      phone,
      role,
      firm: firmId,
      verified: true,
      isActive: true,
    });

    await user.save();

    const tokens = this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Publish UserCreatedEvent
    await identityRelay.publishUserCreated({
      userId: user._id,
      email: user.email,
      userName: user.userName,
      fullName: user.fullName,
      firmId: user.firm,
      role: user.role,
    });

    return { user, ...tokens };
  }

  /**
   * Authenticates user with credentials and rotates tokens.
   */
  async loginUser({ identifier, password }) {
    if (!identifier || !password) {
      throw new Error("Identifier (email/username) and password are required.");
    }

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { userName: identifier.toLowerCase() },
      ],
    });

    if (!user) {
      throw new Error("User not found with provided identifier.");
    }

    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
      throw new Error("Invalid password.");
    }

    if (!user.isActive) {
      throw new Error("User account is inactive. Please contact firm administrator.");
    }

    const tokens = this.generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return { user, ...tokens };
  }

  /**
   * Creates a new CA Practice Firm tenant and emits TenantCreatedEvent.
   */
  async createFirm({ name, email, phone, firmType = "CA_Firm", gstin, panNumber, branding = {} }) {
    if (!name || !email) {
      throw new Error("Firm name and email are required.");
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const firm = new Firm({
      name,
      slug,
      email: email.toLowerCase(),
      phone,
      firmType,
      gstin,
      panNumber,
      branding,
    });

    await firm.save();

    await identityRelay.publishTenantCreated({
      tenantType: "FIRM",
      tenantId: firm._id,
      name: firm.name,
      slug: firm.slug,
    });

    return firm;
  }

  /**
   * Creates a new SME Client organization under a CA Firm and emits TenantCreatedEvent.
   */
  async createClient({ firmId, businessName, tradeName, legalStructure = "Private_Limited", gstin, panNumber, industry }) {
    if (!firmId || !businessName) {
      throw new Error("Firm ID and business name are required to onboard a client.");
    }

    const firm = await Firm.findById(firmId);
    if (!firm) {
      throw new Error(`Parent firm with ID ${firmId} not found.`);
    }

    const client = new Client({
      firm: firmId,
      businessName,
      tradeName: tradeName || businessName,
      legalStructure,
      gstin,
      panNumber,
      industry: industry || "General",
    });

    await client.save();

    await identityRelay.publishTenantCreated({
      tenantType: "CLIENT",
      tenantId: client._id,
      name: client.businessName,
      slug: client.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      parentFirmId: firmId,
    });

    return client;
  }
}

export const identityService = new IdentityService();

