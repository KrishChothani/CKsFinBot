/** @format */

import mongoose from "mongoose";
import { EventBus } from "@cksfinbot/event-bus";
import { createLogger } from "@cksfinbot/shared-logger";
import { Outbox } from "../models/outbox.model.js";

const logger = createLogger("document-service:outbox");

class OutboxRelayService {
  constructor() {
    this.eventBus = new EventBus({
      url: process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672",
    });
    this.pollerInterval = null;
    this.isProcessing = false;
  }

  async init() {
    try {
      await this.eventBus.connect();
      logger.info("Outbox relay event bus initialized.");
    } catch (err) {
      logger.warn(`Event bus connection deferred: ${err.message}`);
    }
  }

  /**
   * Persists the event in Outbox and attempts immediate publish.
   */
  async recordAndPublishEvent(envelope, routingKey) {
    let outboxEntry = null;

    if (mongoose.connection.readyState === 1) {
      try {
        outboxEntry = await Outbox.create({
          eventId: envelope.eventId,
          eventType: envelope.eventType,
          routingKey,
          envelope,
          status: "PENDING",
        });
      } catch (dbErr) {
        logger.error(`Failed to record outbox entry for event ${envelope.eventId}: ${dbErr.message}`);
      }
    }

    try {
      const published = await this.eventBus.publish(envelope, routingKey);
      if (published && outboxEntry) {
        outboxEntry.status = "PUBLISHED";
        outboxEntry.publishedAt = new Date();
        await outboxEntry.save();
      }
      return published;
    } catch (pubErr) {
      logger.warn(`Immediate publication failed for event ${envelope.eventId}, will retry via poller: ${pubErr.message}`);
      if (outboxEntry) {
        outboxEntry.lastError = pubErr.message;
        outboxEntry.attempts += 1;
        await outboxEntry.save();
      }
      return false;
    }
  }

  /**
   * Scans for pending outbox events and replays them to the message broker.
   */
  async processPendingEvents() {
    if (this.isProcessing || mongoose.connection.readyState !== 1) return;
    this.isProcessing = true;

    try {
      const pendingEvents = await Outbox.find({ status: "PENDING" })
        .sort({ createdAt: 1 })
        .limit(50);

      for (const entry of pendingEvents) {
        try {
          const published = await this.eventBus.publish(entry.envelope, entry.routingKey);
          if (published) {
            entry.status = "PUBLISHED";
            entry.publishedAt = new Date();
            await entry.save();
            logger.info(`Relayed outbox event [${entry.eventType}] (${entry.eventId})`);
          }
        } catch (err) {
          entry.attempts += 1;
          entry.lastError = err.message;
          if (entry.attempts >= 10) {
            entry.status = "FAILED";
          }
          await entry.save();
        }
      }
    } catch (err) {
      // Ignore poll query failures if DB is disconnecting
    } finally {
      this.isProcessing = false;
    }
  }

  startOutboxPoller(intervalMs = 5000) {
    if (this.pollerInterval) return;
    this.pollerInterval = setInterval(() => {
      this.processPendingEvents().catch(() => {});
    }, intervalMs);
    // Unref so poller doesn't keep node process open in test runner
    if (this.pollerInterval.unref) {
      this.pollerInterval.unref();
    }
  }

  stopOutboxPoller() {
    if (this.pollerInterval) {
      clearInterval(this.pollerInterval);
      this.pollerInterval = null;
    }
  }

  async close() {
    this.stopOutboxPoller();
    await this.eventBus.close();
  }
}

export const outboxRelay = new OutboxRelayService();
