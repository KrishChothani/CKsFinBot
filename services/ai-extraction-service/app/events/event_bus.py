# app/events/event_bus.py
"""
Universal Event Bus Publisher & Envelope Factory for AI Extraction Service.
Guarantees compatibility with CKsFinBot AMQP 0-9-1 event backbone.
"""

import os
import json
import uuid
import datetime
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("ai-extraction-service.event_bus")

DEFAULT_EXCHANGE = "cksfinbot.events"
DEFAULT_RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672")

EVENT_TYPES = {
    "DOCUMENT_INGESTED": "DocumentIngestedEvent",
    "DOCUMENT_EXTRACTION_STARTED": "DocumentExtractionStartedEvent",
    "DOCUMENT_EXTRACTED": "DocumentExtractedEvent",
    "DOCUMENT_EXTRACTION_FAILED": "DocumentExtractionFailedEvent",
}

ROUTING_KEYS = {
    "DocumentIngestedEvent": "cksfinbot.document.ingested",
    "DocumentExtractionStartedEvent": "cksfinbot.extraction.started",
    "DocumentExtractedEvent": "cksfinbot.extraction.completed",
    "DocumentExtractionFailedEvent": "cksfinbot.extraction.failed",
}


def create_event_envelope(
    event_type: str,
    producer: str,
    tenant: Dict[str, Optional[str]],
    payload: Dict[str, Any],
    correlation_id: Optional[str] = None,
    causation_id: Optional[str] = None,
    event_version: int = 1
) -> Dict[str, Any]:
    """
    Constructs a standardized CKsFinBot event envelope matching @cksfinbot/event-contracts.
    """
    if not tenant or not tenant.get("firmId"):
        raise ValueError("Tenant must include at least 'firmId'")

    envelope = {
        "eventId": str(uuid.uuid4()),
        "eventType": event_type,
        "eventVersion": event_version,
        "occurredAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "producer": producer,
        "correlationId": correlation_id or str(uuid.uuid4()),
        "causationId": causation_id,
        "tenant": {
            "firmId": str(tenant.get("firmId")),
            "clientId": str(tenant.get("clientId")) if tenant.get("clientId") else None
        },
        "payload": payload
    }
    return envelope


def validate_event_envelope(envelope: Dict[str, Any]) -> bool:
    """
    Validates envelope conformance against required top-level fields.
    """
    required_keys = ["eventId", "eventType", "eventVersion", "occurredAt", "producer", "tenant", "payload"]
    for key in required_keys:
        if key not in envelope or envelope[key] is None:
            return False
    if not envelope["tenant"].get("firmId"):
        return False
    return True


class EventPublisher:
    """
    AMQP 0-9-1 Topic Exchange Publisher using pika.
    Gracefully falls back to mock/log mode if RabbitMQ broker is unreachable.
    """

    def __init__(self, rabbitmq_url: Optional[str] = None, exchange: str = DEFAULT_EXCHANGE):
        self.url = rabbitmq_url or DEFAULT_RABBITMQ_URL
        self.exchange = exchange
        self._connection = None
        self._channel = None
        self.is_connected = False

    def connect(self) -> bool:
        try:
            import pika
            params = pika.URLParameters(self.url)
            params.socket_timeout = 5.0
            self._connection = pika.BlockingConnection(params)
            self._channel = self._connection.channel()
            self._channel.confirm_delivery()
            self._channel.exchange_declare(
                exchange=self.exchange,
                exchange_type="topic",
                durable=True
            )
            self.is_connected = True
            logger.info("Connected to RabbitMQ topic exchange '%s'", self.exchange)
            return True
        except Exception as e:
            logger.warning("RabbitMQ broker unreachable (%s). Event publisher running in offline/log mode.", e)
            self.is_connected = False
            return False

    def publish(self, envelope: Dict[str, Any], routing_key: Optional[str] = None) -> bool:
        if not validate_event_envelope(envelope):
            raise ValueError(f"Malformed event envelope: {envelope}")

        key = routing_key or ROUTING_KEYS.get(envelope["eventType"])
        if not key:
            raise ValueError(f"Unknown routing key for eventType '{envelope.get('eventType')}'")

        if not self.is_connected:
            self.connect()

        if self.is_connected and self._channel:
            try:
                import pika
                body = json.dumps(envelope).encode("utf-8")
                self._channel.basic_publish(
                    exchange=self.exchange,
                    routing_key=key,
                    body=body,
                    properties=pika.BasicProperties(
                        content_type="application/json",
                        delivery_mode=2,  # Persistent message
                        correlation_id=envelope.get("correlationId"),
                        message_id=envelope.get("eventId"),
                    )
                )
                logger.info("Published event [%s] -> routingKey '%s'", envelope["eventType"], key)
                return True
            except Exception as pub_err:
                logger.error("Failed to publish event to RabbitMQ: %s", pub_err)
                self.is_connected = False
                return False
        else:
            logger.info("Mock publish [%s] -> routingKey '%s': %s", envelope["eventType"], key, envelope["eventId"])
            return True

    def close(self):
        try:
            if self._connection and self._connection.is_open:
                self._connection.close()
        except Exception:
            pass


publisher = EventPublisher()

