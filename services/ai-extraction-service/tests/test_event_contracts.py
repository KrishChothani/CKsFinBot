# tests/test_event_contracts.py
"""
Unit tests for AI Document Extraction Service Event Envelope & Messaging.
"""

import unittest
import uuid
from app.events.event_bus import (
    create_event_envelope,
    validate_event_envelope,
    EVENT_TYPES,
    ROUTING_KEYS,
    publisher,
)


class TestEventContracts(unittest.TestCase):

    def test_create_valid_envelope(self):
        firm_id = str(uuid.uuid4())
        client_id = str(uuid.uuid4())
        payload = {
            "documentId": str(uuid.uuid4()),
            "s3Url": "https://s3.aws.com/doc.pdf",
            "documentType": "Purchase_Invoice",
        }

        envelope = create_event_envelope(
            event_type=EVENT_TYPES["DOCUMENT_EXTRACTED"],
            producer="ai-extraction-service",
            tenant={"firmId": firm_id, "clientId": client_id},
            payload=payload,
            correlation_id="test-trace-123"
        )

        self.assertTrue(validate_event_envelope(envelope))
        self.assertEqual(envelope["eventType"], "DocumentExtractedEvent")
        self.assertEqual(envelope["producer"], "ai-extraction-service")
        self.assertEqual(envelope["tenant"]["firmId"], firm_id)
        self.assertEqual(envelope["tenant"]["clientId"], client_id)
        self.assertEqual(envelope["correlationId"], "test-trace-123")
        self.assertEqual(envelope["eventVersion"], 1)

    def test_envelope_validation_rejects_missing_tenant(self):
        with self.assertRaises(ValueError):
            create_event_envelope(
                event_type=EVENT_TYPES["DOCUMENT_EXTRACTED"],
                producer="ai-extraction-service",
                tenant={},  # Missing firmId
                payload={"docId": "123"}
            )

    def test_routing_keys_match_contracts(self):
        self.assertEqual(ROUTING_KEYS["DocumentExtractionStartedEvent"], "cksfinbot.extraction.started")
        self.assertEqual(ROUTING_KEYS["DocumentExtractedEvent"], "cksfinbot.extraction.completed")
        self.assertEqual(ROUTING_KEYS["DocumentExtractionFailedEvent"], "cksfinbot.extraction.failed")

    def test_offline_publisher_handles_fallback(self):
        envelope = create_event_envelope(
            event_type=EVENT_TYPES["DOCUMENT_EXTRACTION_STARTED"],
            producer="ai-extraction-service",
            tenant={"firmId": "firm-001"},
            payload={"documentId": "doc-001"}
        )
        # Should gracefully return True in mock/offline mode without crashing
        result = publisher.publish(envelope)
        self.assertTrue(result)


if __name__ == "__main__":
    unittest.main()

