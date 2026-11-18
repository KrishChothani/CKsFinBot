/** @format */

import { identityService } from "../services/identity.service.js";
import { Client } from "../models/client.model.js";

export async function createClient(req, res, next) {
  try {
    const firmId = req.headers["x-firm-id"] || req.body.firmId;
    const { businessName, tradeName, legalStructure, gstin, panNumber, industry } = req.body;

    const client = await identityService.createClient({
      firmId,
      businessName,
      tradeName,
      legalStructure,
      gstin,
      panNumber,
      industry,
    });

    res.status(201).json({
      success: true,
      statusCode: 201,
      message: "SME Client organization created successfully.",
      data: client,
    });
  } catch (err) {
    next(err);
  }
}

export async function getClients(req, res, next) {
  try {
    const firmId = req.headers["x-firm-id"] || req.query.firmId;
    if (!firmId) {
      return res.status(400).json({
        success: false,
        statusCode: 400,
        message: "Firm ID header (x-firm-id) is required.",
      });
    }

    const clients = await Client.find({ firm: firmId });
    res.status(200).json({
      success: true,
      data: clients,
    });
  } catch (err) {
    next(err);
  }
}

export async function getClientById(req, res, next) {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Client not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: client,
    });
  } catch (err) {
    next(err);
  }
}

export default {
  createClient,
  getClients,
  getClientById,
};

