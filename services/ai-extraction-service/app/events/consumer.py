# app/events/consumer.py
"""
RabbitMQ Event Consumer for AI Extraction Service.
Consumes DocumentIngestedEvent from 'ai.document-ingested.q', executes
deterministic extraction pipelines, and emits DocumentExtractedEvent.
"""

import os
import json
import logging
import asyncio
from typing import Dict, Any, Optional
from app.events.event_bus import (
    create_event_envelope,
    publisher,
    EVENT_TYPES,
    ROUTING_KEYS,
)
from app.services.structured_extractor import extract_structured_document

logger = logging.getLogger("ai-extraction-service.consumer")

QUEUE_NAME = "ai.document-ingested.q"
BINDING_KEY = "cksfinbot.document.ingested"
EXCHANGE_NAME = "cksfinbot.events"


async def process_document_ingested_message(envelope: Dict[str, Any]):
    """
    Asynchronous handler triggered upon receiving DocumentIngestedEvent.
    """
    tenant = envelope.get("tenant", {})
    payload = envelope.get("payload", {})
    correlation_id = envelope.get("correlationId")
    causation_id = envelope.get("eventId")

    document_id = payload.get("documentId")
    s3_url = payload.get("s3Url")
    document_type_hint = payload.get("documentType", "Auto")

    if not document_id or not s3_url:
        logger.error("Missing required documentId or s3Url in DocumentIngestedEvent payload.")
        return

    logger.info("Processing DocumentIngestedEvent: docId=%s, firmId=%s, clientId=%s",
                document_id, tenant.get("firmId"), tenant.get("clientId"))

    # 1. Publish DocumentExtractionStartedEvent
    try:
        started_envelope = create_event_envelope(
            event_type=EVENT_TYPES["DOCUMENT_EXTRACTION_STARTED"],
            producer="ai-extraction-service",
            tenant=tenant,
            correlation_id=correlation_id,
            causation_id=causation_id,
            payload={
                "documentId": document_id,
                "s3Url": s3_url,
                "status": "Extraction_Started"
            }
        )
        publisher.publish(started_envelope)
    except Exception as start_err:
        logger.warning("Failed to publish DocumentExtractionStartedEvent: %s", start_err)

    # 2. Execute Structured Extraction Engine
    try:
        extraction_result = await extract_structured_document(
            document_id=document_id,
            s3_url=s3_url,
            document_type_hint=document_type_hint
        )

        # 3. Publish DocumentExtractedEvent on success
        extracted_envelope = create_event_envelope(
            event_type=EVENT_TYPES["DOCUMENT_EXTRACTED"],
            producer="ai-extraction-service",
            tenant=tenant,
            correlation_id=correlation_id,
            causation_id=causation_id,
            payload={
                "documentId": document_id,
                "documentType": extraction_result.get("documentType", "Purchase_Invoice"),
                "extractionConfidence": extraction_result.get("extractionConfidence", 0.9),
                "invoiceData": extraction_result.get("invoiceData"),
                "bankData": extraction_result.get("bankData"),
                "validationResults": extraction_result.get("validationResults"),
                "rawTextPreview": extraction_result.get("rawTextPreview", "")
            }
        )
        publisher.publish(extracted_envelope)
        logger.info("Successfully extracted and published DocumentExtractedEvent for docId=%s", document_id)

    except Exception as extract_err:
        logger.error("Extraction pipeline failed for docId=%s: %s", document_id, extract_err)
        # 4. Publish DocumentExtractionFailedEvent on error
        try:
            failed_envelope = create_event_envelope(
                event_type=EVENT_TYPES["DOCUMENT_EXTRACTION_FAILED"],
                producer="ai-extraction-service",
                tenant=tenant,
                correlation_id=correlation_id,
                causation_id=causation_id,
                payload={
                    "documentId": document_id,
                    "error": str(extract_err),
                    "status": "Failed"
                }
            )
            publisher.publish(failed_envelope)
        except Exception as fail_pub_err:
            logger.error("Failed to publish DocumentExtractionFailedEvent: %s", fail_pub_err)


def start_consumer(rabbitmq_url: Optional[str] = None):
    """
    Synchronous blocking consumer loop for worker processes or background threads.
    """
    import pika
    url = rabbitmq_url or os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")

    try:
        params = pika.URLParameters(url)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()

        channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="topic", durable=True)
        channel.queue_declare(queue=QUEUE_NAME, durable=True)
        channel.queue_bind(queue=QUEUE_NAME, exchange=EXCHANGE_NAME, routing_key=BINDING_KEY)

        channel.basic_qos(prefetch_count=2)

        def on_message(ch, method, properties, body):
            try:
                envelope = json.loads(body.decode("utf-8"))
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(process_document_ingested_message(envelope))
                loop.close()
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception as e:
                logger.error("Error processing message from %s: %s", QUEUE_NAME, e)
                # Requeue once or dead-letter
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        channel.basic_consume(queue=QUEUE_NAME, on_message_callback=on_message)
        logger.info("RabbitMQ Consumer listening on queue '%s'", QUEUE_NAME)
        channel.start_consuming()

    except Exception as conn_err:
        logger.warning("RabbitMQ Consumer could not connect (%s). Exiting consumer loop.", conn_err)

