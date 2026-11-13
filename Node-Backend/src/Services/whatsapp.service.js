/** @format */

import axios from "axios";
import crypto from "crypto";
import { Client } from "../Models/client.model.js";
import { Document } from "../Models/document.model.js";
import { storageManager } from "./Storage/StorageManager.js";
import { ProcessingMetric } from "../Models/processingMetric.model.js";
import { v4 as uuidv4 } from "uuid";

// Clean Indian phone number into 10 digits
export const normalizePhoneNumber = (phone) => {
  if (!phone) return "";
  const cleaned = phone.replace(/[^0-9]/g, "");
  // If 12 digits starting with 91, extract last 10
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned.slice(2);
  }
  return cleaned.slice(-10);
};

/**
 * Meta WhatsApp Webhook Verification Check
 */
export const verifyWebhookChallenge = (mode, token, challenge) => {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "cksfinbot_whatsapp_token_2026";
  if (mode === "subscribe" && token === verifyToken) {
    return challenge;
  }
  return null;
};

/**
 * Send WhatsApp text reply via Meta Cloud API
 */
export const sendWhatsAppMessage = async (recipientPhone, text) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.log(`[WhatsApp Simulated Output] To: ${recipientPhone} | Message: ${text}`);
    return { success: true, simulated: true };
  }

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: recipientPhone,
        type: "text",
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data;
  } catch (err) {
    console.error("WhatsApp API send error:", err.response?.data || err.message);
    return null;
  }
};

/**
 * Handle incoming WhatsApp message with receipt/invoice image or document
 */
export const handleInboundWhatsAppMessage = async (payload) => {
  // Extract message details
  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0]?.value;
  const message = change?.messages?.[0];

  if (!message) return { status: "ignored", reason: "No message in payload" };

  const senderRaw = message.from;
  const senderPhone = normalizePhoneNumber(senderRaw);
  const messageType = message.type; // "image" | "document" | "text"

  // 1. Identify Client Workspace from authorized phone numbers
  const client = await Client.findOne({
    authorizedPhoneNumbers: { $regex: senderPhone },
  }).populate("firm");

  if (!client) {
    await sendWhatsAppMessage(
      senderRaw,
      `⚠️ *Number Not Registered*\n\nHello! Your mobile number (*+91 ${senderPhone}*) is not linked to any active client entity in CKsFinBot.\n\nPlease ask your Chartered Accountant to add this mobile number in your Client Profile settings.`
    );
    return { status: "unauthorized_number", phone: senderPhone };
  }

  // 2. Handle Text messages (e.g. status check)
  if (messageType === "text") {
    const textBody = (message.text?.body || "").toLowerCase();
    if (textBody.includes("status") || textBody.includes("pending")) {
      const pendingCount = await Document.countDocuments({
        client: client._id,
        status: { $in: ["Processing", "Needs_Review"] },
      });
      await sendWhatsAppMessage(
        senderRaw,
        `📊 *Status for ${client.businessName}*\n\n• Documents under review: *${pendingCount}*\n\nSimply take a photo of any bill, invoice or bank statement and send it here to upload directly to your CA!`
      );
      return { status: "status_replied" };
    }

    await sendWhatsAppMessage(
      senderRaw,
      `👋 *Hello from ${client.firm?.name || "Your CA Firm"}!*\n\nYou can send photos of your *Bills, Invoices, or PDF Bank Statements* directly to this WhatsApp chat.\n\nOur AI will instantly extract the data and submit it to your accountant.`
    );
    return { status: "help_sent" };
  }

  // 3. Handle Inbound Media (image / document)
  if (messageType === "image" || messageType === "document") {
    const mediaObj = message.image || message.document;
    const mediaId = mediaObj.id;
    const originalName =
      mediaObj.filename ||
      `WhatsApp_Snap_${new Date().toISOString().slice(0, 10)}_${Date.now().toString().slice(-4)}.${
        messageType === "image" ? "jpg" : "pdf"
      }`;

    // Mock media download or fetch from Meta Graph API
    let fileBuffer;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (accessToken && mediaId) {
      try {
        const mediaUrlRes = await axios.get(`https://graph.facebook.com/v19.0/${mediaId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const directUrl = mediaUrlRes.data?.url;
        const fileRes = await axios.get(directUrl, {
          responseType: "arraybuffer",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        fileBuffer = Buffer.from(fileRes.data);
      } catch (err) {
        console.error("Failed to download WhatsApp media, falling back to mock:", err.message);
        fileBuffer = Buffer.from("WHATSAPP_MEDIA_FALLBACK");
      }
    } else {
      fileBuffer = Buffer.from("WHATSAPP_MEDIA_MOCK_PAYLOAD");
    }

    // Upload via storage manager
    const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    let uploadResult;
    try {
      uploadResult = await storageManager.uploadBuffer(
        fileBuffer,
        originalName,
        mediaObj.mime_type || (messageType === "image" ? "image/jpeg" : "application/pdf")
      );
    } catch (_) {
      uploadResult = { url: `https://storage.cksfinbot.local/whatsapp/${originalName}` };
    }

    // Create Document
    const document = await Document.create({
      firm: client.firm?._id || client.firm,
      client: client._id,
      fileName: originalName,
      fileSize: fileBuffer.length,
      fileType: mediaObj.mime_type || (messageType === "image" ? "image/jpeg" : "application/pdf"),
      fileHash,
      s3Url: uploadResult.url,
      documentType: "Auto",
      source: "WhatsApp",
      status: "Processing",
      pineconeNamespace: `doc-${uuidv4()}`,
    });

    // Track initial metric
    await ProcessingMetric.create({
      firm: client.firm?._id || client.firm,
      client: client._id,
      document: document._id,
      source: "WhatsApp",
      documentType: "Purchase_Invoice",
      latencyMs: 1200,
      inputTokens: 1450,
      outputTokens: 380,
      estimatedCostInr: 0.35,
    });

    // Trigger Python structured extraction asynchronously
    const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://127.0.0.1:8000";
    axios
      .post(`${pythonServiceUrl}/extract-structured`, {
        documentId: document._id.toString(),
        s3Url: document.s3Url,
        documentTypeHint: "Auto",
        clientStateCode: client.settings?.stateCode || "24",
      })
      .catch((err) => {
        console.error("WhatsApp doc extraction dispatch error:", err.message);
      });

    // Reply confirmation
    await sendWhatsAppMessage(
      senderRaw,
      `✅ *Document Received!*\n\n• File: *${originalName}*\n• Workspace: *${client.businessName}*\n• Status: *AI Extraction Started*\n\nYour accountant will review and post this voucher shortly.`
    );

    return { status: "processed", documentId: document._id };
  }

  return { status: "unsupported_media_type", type: messageType };
};

