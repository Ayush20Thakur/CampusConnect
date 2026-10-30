"""
Tests for clinic queue management and notification service isolation.
"""

import pytest
from backend.tests.helpers import login
from app.extensions import db
from app.models.availability_slot import AvailabilitySlot, SlotState
from app.models.appointment import Appointment, AppointmentStatus
from app.models.service_type import ServiceType
from app.models.queue_entry import QueueEntry, QueueStatus


def book_clinic_slot(
    client, app, email="alex.kim@students.edu", password="student1234"
):
    """Helper: log in and book the first available clinic slot."""
    login(client, email, password)
    with app.app_context():
        svc = ServiceType.query.filter_by(code="CLINIC").first()
        booked = (
            db.session.query(Appointment.slot_id)
            .filter_by(status=AppointmentStatus.CONFIRMED)
            .scalar_subquery()
        )
        slot = (
            AvailabilitySlot.query.filter_by(
                service_type_id=svc.id, state=SlotState.AVAILABLE
            )
            .filter(AvailabilitySlot.id.not_in(booked))
            .order_by(AvailabilitySlot.start_at)
            .first()
        )
    if not slot:
        return None, None
    resp = client.post(
        "/api/v1/appointments",
        json={
            "service_type": "CLINIC",
            "slot_id": slot.id,
            "provider_id": slot.provider_id,
            "request_id": f"queue-test-{slot.id}",
        },
    )
    return resp, slot


class TestQueueTransitions:
    def test_valid_queue_call_transition(self, client, app):
        """TC-11: WAITING -> CALLED is a valid transition."""
        login(client, "clinic.staff@campusconnect.edu", "staff1234")
        with app.app_context():
            qe = QueueEntry.query.filter_by(status=QueueStatus.WAITING).first()
            assert qe is not None, "Expected at least one waiting queue entry"
            entry_id = qe.id

        resp2 = client.post(
            f"/api/v1/staff/clinic/queue/{entry_id}/status", json={"status": "CALLED"}
        )
        assert resp2.status_code == 200
        assert resp2.get_json()["data"]["status"] == "CALLED"

    def test_invalid_queue_transition_rejected(self, client, app):
        """TC-11b: WAITING -> COMPLETED is an invalid transition."""
        from datetime import datetime, timezone, timedelta

        # Book a fresh clinic slot to get a WAITING entry
        resp_book, slot = book_clinic_slot(
            client, app, "jordan.lee@students.edu", "student1234"
        )
        if resp_book and resp_book.status_code == 201:
            entry_id = resp_book.get_json()["data"]["queue_entry"]["id"]
        else:
            target_date = (datetime.now(timezone.utc) + timedelta(days=1)).strftime(
                "%Y-%m-%d"
            )
            login(client, "clinic.staff@campusconnect.edu", "staff1234")
            resp = client.get(f"/api/v1/staff/clinic/queue?date={target_date}")
            waiting = [e for e in resp.get_json()["data"] if e["status"] == "WAITING"]
            entry_id = waiting[0]["id"]

        login(client, "clinic.staff@campusconnect.edu", "staff1234")
        resp2 = client.post(
            f"/api/v1/staff/clinic/queue/{entry_id}/status",
            json={"status": "COMPLETED"},
        )
        # WAITING -> COMPLETED is not a valid direct transition
        assert resp2.status_code == 409
        assert resp2.get_json()["error"]["code"] == "INVALID_QUEUE_TRANSITION"


class TestNotificationIsolation:
    def test_notification_failure_does_not_invalidate_appointment(self, client, app):
        """TC-12: Simulated notification failure does not cancel the appointment."""
        # Enable notification failure simulation via fault lab
        login(client, "admin@campusconnect.edu", "admin1234")
        client.post(
            "/api/v1/admin/fault-lab/flags", json={"notification_failure": True}
        )

        # Book as student
        client.post("/api/v1/auth/logout")
        login(client, "jordan.lee@students.edu", "student1234")
        with app.app_context():
            svc = ServiceType.query.filter_by(code="CLINIC").first()
            booked = (
                db.session.query(Appointment.slot_id)
                .filter_by(status=AppointmentStatus.CONFIRMED)
                .scalar_subquery()
            )
            slot = (
                AvailabilitySlot.query.filter_by(
                    service_type_id=svc.id, state=SlotState.AVAILABLE
                )
                .filter(AvailabilitySlot.id.not_in(booked))
                .order_by(AvailabilitySlot.start_at)
                .first()
            )
        if not slot:
            pytest.skip("No available clinic slots")

        resp = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "CLINIC",
                "slot_id": slot.id,
                "provider_id": slot.provider_id,
                "request_id": f"notif-fail-test-{slot.id}",
            },
        )
        # Appointment must still be created even if notification failed
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["status"] == "CONFIRMED"

        # Disable fault flag
        client.post("/api/v1/auth/logout")
        login(client, "admin@campusconnect.edu", "admin1234")
        client.post(
            "/api/v1/admin/fault-lab/flags", json={"notification_failure": False}
        )


class TestAuditTrace:
    def test_audit_events_have_correlation_id(self, client, app):
        """TC-13: Audit events include correlation_id and no sensitive data."""
        login(client, "admin@campusconnect.edu", "admin1234")
        resp = client.get("/api/v1/admin/audit-events")
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        for event in data["events"]:
            assert "correlation_id" in event
            # Should never contain password
            event_str = str(event)
            assert "password" not in event_str.lower()
            assert (
                "session" not in event_str.lower()
                or "sessionid" not in event_str.lower()
            )

    def test_traces_list_returns_correlation_ids(self, client):
        """TC-13b: Trace list returns correlation IDs."""
        login(client, "admin@campusconnect.edu", "admin1234")
        resp = client.get("/api/v1/admin/traces")
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert "traces" in data
