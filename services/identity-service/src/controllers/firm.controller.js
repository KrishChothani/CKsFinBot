/** @format */

import { identityService } from "../services/identity.service.js";
import { Firm } from "../models/firm.model.js";

export async function createFirm(req, res, next) {
  try {
    const { name, email, phone, firmType, gstin, panNumber, branding } = req.body;
    const firm = await identityService.createFirm({
      name,
      email,
      phone,
      firmType,
      gstin,
      panNumber,
      branding,
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "CA Practice Firm created successfully.",
      data: firm,
    });
  } catch (err) {
    next(err);
  }
}

export async function getFirm(req, res, next) {
  try {
    const firmId = req.params.id || req.headers["x-firm-id"];
    const firm = await Firm.findById(firmId);
    if (!firm) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Firm not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: firm,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateFirmBranding(req, res, next) {
  try {
    const firmId = req.params.id || req.headers["x-firm-id"];
    const branding = req.body.branding || req.body;

    const firm = await Firm.findByIdAndUpdate(
      firmId,
      { $set: { branding } },
      { new: true }
    );

    if (!firm) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Firm not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Firm branding updated successfully.",
      data: firm,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  createFirm,
  getFirm,
  updateFirmBranding,
};

