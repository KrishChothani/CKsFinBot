/** @format */

import { EventEmitter } from "events";
import {
  validateEventEnvelope,
  getRoutingKey,
} from "@cksfinbot/event-contracts";

let amqplib = null;
try {
  amqplib = await import("amqplib");
} catch (e) {
  // amqplib unavailable in pure mock environment
}

export const DEFAULT_EXCHANGE = "cksfinbot.events";
export const DEAD_LETTER_EXCHANGE = "cksfinbot.dlx";
export const DEAD_LETTER_QUEUE = "cksfinbot.dlq";

/**
 * Enterprise Event Bus Client for CKsFinBot.
 * Supports RabbitMQ (AMQP 0-9-1) with full In-Memory Fallback.
 */
export class EventBus {
  constructor(options = {}) {
    this.url = options.url || process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";
    this.exchange = options.exchange || DEFAULT_EXCHANGE;
    this.dlxExchange = options.dlxExchange || DEAD_LETTER_EXCHANGE;
    this.mode = options.mode || process.env.EVENT_BUS_MODE || (amqplib ? "amqp" : "memory");

    this.connection = null;
    this.publishChannel = null;
    this.subscribeChannels = new Map();

    // In-Memory Fallback Emitter
    this.memoryEmitter = new EventEmitter();
    this.memoryEmitter.setMaxListeners(100);
    this.deadLetterStore = [];
    this.isConnected = false;
  }

  /**
   * Initializes connections and asserts durable exchanges.
   */
  async connect() {
    if (this.isConnected) return;

    if (this.mode === "memory" || !amqplib) {
      this.mode = "memory";
      this.isConnected = true;
      console.log("ℹ️ [EventBus] Running in IN-MEMORY mode (no external RabbitMQ connection).");
      return;
    }

    try {
      const conn = await amqplib.connect(this.url);
      this.connection = conn;

      conn.on("error", (err) => {
        console.error("❌ [EventBus] AMQP Connection Error:", err.message);
        this.isConnected = false;
      });

      conn.on("close", () => {
        console.warn("⚠️ [EventBus] AMQP Connection Closed.");
        this.isConnected = false;
      });

      // Dedicated publish channel with confirms
      const pubChan = await conn.createConfirmChannel();
      await pubChan.assertExchange(this.exchange, "topic", { durable: true });
      await pubChan.assertExchange(this.dlxExchange, "topic", { durable: true });

      // Assert default dead-letter queue
      await pubChan.assertQueue(DEAD_LETTER_QUEUE, { durable: true });
      await pubChan.bindQueue(DEAD_LETTER_QUEUE, this.dlxExchange, "#");

      this.publishChannel = pubChan;
      this.isConnected = true;
      console.log(`✅ [EventBus] Connected to RabbitMQ at ${this.url.replace(/:[^:@]*@/, ":***@")}`);
    } catch (err) {
      console.warn(
        `⚠️ [EventBus] RabbitMQ unavailable (${err.message}). Falling back to IN-MEMORY event bus.`
      );
      this.mode = "memory";
      this.isConnected = true;
    }
  }

  /**
   * Publishes an event envelope to the topic exchange.
   *
   * @param {Object} envelope - Standardized event envelope from @cksfinbot/event-contracts
   * @param {string} [routingKeyOverride] - Optional custom routing key
   * @returns {Promise<boolean>} Resolves true when broker confirms persistence
   */
  async publish(envelope, routingKeyOverride = null) {
    if (!this.isConnected) {
      await this.connect();
    }

    const validation = validateEventEnvelope(envelope);
    if (!validation.isValid) {
      throw new Error(`[EventBus] Publish rejected — malformed envelope: ${validation.errors.join("; ")}`);
    }

    const routingKey = routingKeyOverride || getRoutingKey(envelope.eventType);

    if (this.mode === "memory") {
      // Emit event in memory asynchronously on next tick
      setImmediate(() => {
        this.memoryEmitter.emit(routingKey, envelope);
        this.memoryEmitter.emit("#", envelope); // Wildcard listener
      });
      return true;
    }

    // AMQP Publish with publisher confirmation
    return new Promise((resolve, reject) => {
      const payloadBuffer = Buffer.from(JSON.stringify(envelope));
      this.publishChannel.publish(
        this.exchange,
        routingKey,
        payloadBuffer,
        {
          persistent: true,
          contentType: "application/json",
          contentEncoding: "utf-8",
          messageId: envelope.eventId,
          timestamp: new Date(envelope.occurredAt).getTime(),
          headers: {
            "x-event-type": envelope.eventType,
            "x-correlation-id": envelope.correlationId,
            "x-firm-id": envelope.tenant?.firmId,
            "x-client-id": envelope.tenant?.clientId,
          },
        },
        (err) => {
          if (err) {
            console.error(`❌ [EventBus] Broker NACK for event ${envelope.eventId}:`, err);
            return reject(err);
          }
          resolve(true);
        }
      );
    });
  }

  /**
   * Subscribes a consumer queue to routing keys on the topic exchange.
   *
   * @param {Object} params
   * @param {string} params.queueName - Durable consumer queue name
   * @param {string|string[]} params.routingKeys - Topic routing key pattern(s) e.g. ["cksfinbot.document.*"]
   * @param {Function} params.handler - async (envelope, messageMeta) => void
   * @param {Object} [params.options] - { prefetch: 10, maxRetries: 3 }
   */
  async subscribe({ queueName, routingKeys, handler, options = {} }) {
    if (!this.isConnected) {
      await this.connect();
    }

    const keys = Array.isArray(routingKeys) ? routingKeys : [routingKeys];
    const prefetch = options.prefetch || 10;
    const maxRetries = options.maxRetries || 3;

    if (this.mode === "memory") {
      // Memory listener setup
      keys.forEach((key) => {
        const listener = async (envelope) => {
          try {
            await handler(envelope, { queue: queueName, routingKey: key });
          } catch (err) {
            console.error(`❌ [EventBus Memory] Handler error in queue "${queueName}":`, err.message);
            this.deadLetterStore.push({
              envelope,
              queue: queueName,
              error: err.message,
              failedAt: new Date().toISOString(),
            });
          }
        };
        this.memoryEmitter.on(key, listener);
      });
      console.log(`📡 [EventBus Memory] Subscribed queue "${queueName}" to [${keys.join(", ")}]`);
      return;
    }

    // AMQP Channel & Queue setup
    const channel = await this.connection.createChannel();
    await channel.prefetch(prefetch);

    // Assert durable queue with Dead-Letter Exchange (DLX) forwarding on failure
    await channel.assertQueue(queueName, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": this.dlxExchange,
        "x-dead-letter-routing-key": `dlq.${queueName}`,
      },
    });

    for (const key of keys) {
      await channel.bindQueue(queueName, this.exchange, key);
    }

    channel.consume(queueName, async (msg) => {
      if (!msg) return;

      let envelope = null;
      try {
        envelope = JSON.parse(msg.content.toString("utf-8"));
      } catch (parseErr) {
        console.error(`❌ [EventBus] Poison message in queue "${queueName}". Routing to DLQ.`, parseErr.message);
        return channel.nack(msg, false, false); // NACK without requeue -> DLQ
      }

      try {
        await handler(envelope, {
          deliveryTag: msg.fields.deliveryTag,
          routingKey: msg.fields.routingKey,
          redelivered: msg.fields.redelivered,
          headers: msg.properties.headers,
        });
        channel.ack(msg);
      } catch (err) {
        const retryCount = (msg.properties.headers?.["x-retry-count"] || 0) + 1;
        console.error(
          `⚠️ [EventBus] Error processing event ${envelope?.eventId} in queue "${queueName}" (Attempt ${retryCount}/${maxRetries}):`,
          err.message
        );

        if (retryCount >= maxRetries) {
          console.error(`🛑 [EventBus] Max retries exceeded for event ${envelope?.eventId}. Discarding to DLQ.`);
          channel.nack(msg, false, false); // Route to DLQ
        } else {
          // Re-queue with exponential backoff delay if configured, or simple requeue
          channel.nack(msg, false, true); // Requeue
        }
      }
    });

    this.subscribeChannels.set(queueName, channel);
    console.log(`📡 [EventBus] Queue "${queueName}" bound to [${keys.join(", ")}]`);
  }

  /**
   * Gracefully shuts down channels and connections.
   */
  async close() {
    if (this.mode === "memory") {
      this.memoryEmitter.removeAllListeners();
      this.isConnected = false;
      return;
    }

    try {
      if (this.publishChannel) await this.publishChannel.close();
      for (const ch of this.subscribeChannels.values()) {
        await ch.close();
      }
      if (this.connection) await this.connection.close();
      this.isConnected = false;
      console.log("🔌 [EventBus] Closed all AMQP connections cleanly.");
    } catch (e) {
      console.warn("⚠️ [EventBus] Error closing connections:", e.message);
    }
  }
}

// Default Singleton Instance
export const defaultEventBus = new EventBus();

export default {
  EventBus,
  defaultEventBus,
  DEFAULT_EXCHANGE,
  DEAD_LETTER_EXCHANGE,
  DEAD_LETTER_QUEUE,
};

