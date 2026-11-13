/** @format */

import { ApiError } from "../Utils/ApiError.js";
import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { Firm } from "../Models/firm.model.js";
import { Client } from "../Models/client.model.js";

/**
 * Tenant Middleware:
 * Resolves active firmId and clientId from request headers, user context, or defaults.
 * Guarantees strict multi-tenant boundary isolation.
 */
export const resolveTenant = AsyncHandler(async (req, res, next) => {
  if (!req.user) {
    throw new ApiError(401, "Authentication required for tenant resolution.");
  }

  // 1. Resolve Firm ID
  let firmId = req.headers["x-firm-id"] || req.query.firmId || req.user.firm;

  // Auto-provision a default firm if user does not have one yet (backward compatibility)
  if (!firmId) {
    let defaultFirm = await Firm.findOne({ email: req.user.email });
    if (!defaultFirm) {
      const slugName = (req.user.userName || req.user.fullName || "firm")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");
      const uniqueSlug = `${slugName}-${Math.floor(1000 + Math.random() * 9000)}`;

      defaultFirm = await Firm.create({
        name: `${req.user.fullName}'s Practice`,
        slug: uniqueSlug,
        email: req.user.email,
        firmType: "CA_Firm",
      });
    }
    firmId = defaultFirm._id;
    req.user.firm = firmId;
    await req.user.save();
  }

  req.firmId = firmId;

  // 2. Resolve Client ID (Optional for firm-level endpoints, required for document/voucher endpoints)
  const clientId = req.headers["x-client-id"] || req.query.clientId;

  if (clientId) {
    const client = await Client.findOne({ _id: clientId, firm: firmId });
    if (!client) {
      throw new ApiError(404, "Client workspace not found or access denied for this firm.");
    }

    // Role-based client access check for Client_Users
    if (
      req.user.role === "Client_User" &&
      req.user.assignedClients &&
      req.user.assignedClients.length > 0
    ) {
      const hasAccess = req.user.assignedClients.some(
        (id) => id.toString() === client._id.toString()
      );
      if (!hasAccess) {
        throw new ApiError(403, "You do not have permission to access this client workspace.");
      }
    }

    req.clientId = client._id;
    req.client = client;
  }

  next();
});

// Alias for semantic flexibility across routes
export const resolveTenantContext = resolveTenant;

