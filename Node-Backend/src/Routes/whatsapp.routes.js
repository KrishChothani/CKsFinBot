/** @format */

import { Router } from "express";
import {
  verifyWebhook,
  handleWebhookMessage,
  simulateInboundWhatsApp,
} from "../Controllers/whatsapp.controller.js";

const router = Router();

// Public webhook endpoints for Meta WhatsApp
router.get("/webhook", verifyWebhook);
router.post("/webhook", handleWebhookMessage);

// Testing simulator endpoint
router.post("/simulate", simulateInboundWhatsApp);

export default router;

