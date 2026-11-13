/** @format */

import { ApiError } from "../Utils/ApiError.js";

/**
 * Role-Based Access Control Middleware:
 * Verifies that the authenticated user's role is included in allowedRoles.
 * Allowed roles: Firm_Admin, CA, Accountant, Client_User, Viewer
 */
export const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required."));
    }

    const userRole = req.user.role || "Accountant";

    // Firm_Admin always has full access
    if (userRole === "Firm_Admin") {
      return next();
    }

    if (!allowedRoles.includes(userRole)) {
      return next(
        new ApiError(
          403,
          `Access denied. Role '${userRole}' does not have sufficient permissions for this operation.`
        )
      );
    }

    next();
  };
};

