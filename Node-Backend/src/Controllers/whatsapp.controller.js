/** @format */

import { AsyncHandler } from "../Utils/AsyncHandler.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import {
  verifyWebhookChallenge,
  handleInboundWhatsAppMessage,
} from "../Services/whatsapp.service.js";

// Meta WhatsApp Webhook verification
export const verifyWebhook = (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  const verified = verifyWebhookChallenge(mode, token, challenge);
  if (verified) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send("Verification failed");
};

// Inbound WhatsApp webhook message receiver
export const handleWebhookMessage = AsyncHandler(async (req, res) => {
  const payload = req.body;

  // Process asynchronously without blocking webhook acknowledgement
  handleInboundWhatsAppMessage(payload).catch((err) => {
    console.error("WhatsApp message handling background error:", err);
  });

  // Meta expects an immediate 200 OK
  return res.status(200).json(new ApiResponse(200, { received: true }, "EVENT_RECEIVED"));
});

// Testing Simulator: Simulate sending an inbound document from WhatsApp for testing
export const simulateInboundWhatsApp = AsyncHandler(async (req, res) => {
  const { senderPhone, filename = "Sample_Invoice.pdf", fileType = "image" } = req.body;

  const mockPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  from: senderPhone,
                  type: fileType === "image" ? "image" : "document",
                  [fileType === "image" ? "image" : "document"]: {
                    id: "mock_media_12345",
                    filename,
                    mime_type: fileType === "image" ? "image/jpeg" : "application/pdf",
                  },
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const result = await handleInboundWhatsAppMessage(mockPayload);

  return res.status(200).json(
    new ApiResponse(200, result, "WhatsApp simulation event executed successfully.")
  );
});

