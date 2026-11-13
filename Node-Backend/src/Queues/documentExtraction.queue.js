/** @format */

import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import axios from "axios";
import { Document } from "../Models/document.model.js";

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
let redisAvailable = false;
let extractionQueue = null;
let extractionWorker = null;
let dlqQueue = null;

// Test Redis connection
try {
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    connectTimeout: 2000,
    retryStrategy: () => null, // Don't hang if local Redis is offline
  });

  connection.on("connect", () => {
    redisAvailable = true;
    console.log("BullMQ: Redis Connected successfully for Async Queue.");
  });

  connection.on("error", () => {
    redisAvailable = false;
  });

  extractionQueue = new Queue("document-extraction", { connection });
  dlqQueue = new Queue("document-extraction-dlq", { connection });
} catch (e) {
  redisAvailable = false;
}

/**
 * Executes the actual document extraction call to Python service.
 */
async function processExtractionJob(jobData) {
  const { documentId, firmId, clientId, s3Url, fileName } = jobData;
  const pythonServiceUrl = process.env.PYTHON_SERVICE_URL || "http://localhost:8000/api/v1";

  console.log(`[Queue Worker] Processing extraction job for document: ${fileName} (${documentId})`);

  // Update document status
  await Document.findByIdAndUpdate(documentId, {
    status: "Processing",
    extractionAttempts: 1,
  });

  // Call Python structured extraction engine
  const res = await axios.post(
    `${pythonServiceUrl}/extract-structured`,
    {
      documentId,
      s3Url,
      documentTypeHint: "Auto",
      webhookUrl: `${process.env.BACKEND_URL || "http://localhost:8080"}/api/v1/documents/${documentId}/extraction/webhook`,
    },
    { timeout: 60000 }
  );

  return res.data;
}

/**
 * Resilient In-Memory Async Queue fallback when Redis is offline in local dev.
 */
const inMemoryQueue = [];
let isProcessingInMemory = false;

async function processNextInMemory() {
  if (isProcessingInMemory || inMemoryQueue.length === 0) return;
  isProcessingInMemory = true;
  const job = inMemoryQueue.shift();

  try {
    await processExtractionJob(job);
  } catch (err) {
    console.error(`[In-Memory Queue] Extraction error for doc ${job.documentId}:`, err.message);
    if (job.attempts < 3) {
      job.attempts += 1;
      setTimeout(() => {
        inMemoryQueue.push(job);
        processNextInMemory();
      }, job.attempts * 2000);
    } else {
      console.error(`[In-Memory Queue DLQ] Job failed permanently for doc ${job.documentId}`);
      await Document.findByIdAndUpdate(job.documentId, {
        status: "Rejected",
        errorMessage: `Extraction failed after 3 attempts: ${err.message}`,
      });
    }
  } finally {
    isProcessingInMemory = false;
    if (inMemoryQueue.length > 0) {
      setTimeout(processNextInMemory, 100);
    }
  }
}

/**
 * Enqueues a document extraction task.
 */
export async function enqueueExtractionJob({
  documentId,
  firmId,
  clientId,
  s3Url,
  fileName,
}) {
  const payload = {
    documentId: String(documentId),
    firmId: String(firmId),
    clientId: String(clientId),
    s3Url,
    fileName,
    attempts: 1,
    enqueuedAt: new Date(),
  };

  if (redisAvailable && extractionQueue) {
    try {
      const job = await extractionQueue.add("extract-job", payload, {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      return { queueType: "bullmq", jobId: job.id };
    } catch (e) {
      console.warn("BullMQ enqueue failed, routing to local async worker:", e.message);
    }
  }

  // Fallback to local async queue
  inMemoryQueue.push(payload);
  setTimeout(processNextInMemory, 50);
  return { queueType: "in-memory", jobId: `local-${Date.now()}` };
}

export default {
  enqueueExtractionJob,
};

