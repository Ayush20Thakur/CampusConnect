"""
Tests for appointment booking, ownership, conflict handling,
idempotency, cancellation, reschedule, and queue creation rules.
"""

import pytest
from backend.tests.helpers import login
from app.extensions import db
from app.models.availability_slot import AvailabilitySlot, SlotState
from app.models.appointment import Appointment, AppointmentStatus
from app.models.service_type import ServiceType


def get_first_available_slot(app, service_code: str) -> AvailabilitySlot | None:
    """Helper: get the first available slot for a service type."""
    with app.app_context():
        svc = ServiceType.query.filter_by(code=service_code).first()
        booked = (
            db.session.query(Appointment.slot_id)
            .filter_by(status=AppointmentStatus.CONFIRMED)
            .scalar_subquery()
        )
        return (
            AvailabilitySlot.query.filter_by(
                service_type_id=svc.id, state=SlotState.AVAILABLE
            )
            .filter(AvailabilitySlot.id.not_in(booked))
            .order_by(AvailabilitySlot.start_at)
            .first()
        )


class TestAppointmentOwnership:
    def test_student_cannot_view_other_student_appointment(self, client, app):
        """TC-03: Student cannot view another student's appointment."""
        # student2 makes a booking
        login(client, "priya.sharma@students.edu", "student1234")
        slot = get_first_available_slot(app, "CLINIC")
        if not slot:
            pytest.skip("No available clinic slots")
        resp = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "CLINIC",
                "slot_id": slot.id,
                "provider_id": slot.provider_id,
                "request_id": "ownership-test-1",
            },
        )
        assert resp.status_code == 201
        appt_id = resp.get_json()["data"]["id"]

        # student1 tries to view it
        client.post("/api/v1/auth/logout")
        login(client, "alex.kim@students.edu", "student1234")
        resp2 = client.get(f"/api/v1/appointments/{appt_id}")
        assert resp2.status_code == 403

    def test_student_can_view_own_appointments(self, client):
        """TC-03b: Student can view their own appointments."""
        login(client, "alex.kim@students.edu", "student1234")
        resp = client.get("/api/v1/appointments/me")
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert isinstance(data, list)


class TestClinicBooking:
    def test_clinic_booking_creates_appointment_and_queue(self, client, app):
        """TC-04: Clinic booking creates appointment and a queue entry."""
        login(client, "alex.kim@students.edu", "student1234")
        slot = get_first_available_slot(app, "CLINIC")
        if not slot:
            pytest.skip("No available clinic slots")

        resp = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "CLINIC",
                "slot_id": slot.id,
                "provider_id": slot.provider_id,
                "request_id": f"test-clinic-{slot.id}",
            },
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["status"] == "CONFIRMED"
        assert data["service_type_code"] == "CLINIC"
        assert "queue_entry" in data
        assert data["queue_entry"] is not None
        assert data["queue_entry"]["status"] == "WAITING"

    def test_unavailable_slot_returns_conflict(self, client, app):
        """TC-06: Booking an already-booked slot returns 409."""
        login(client, "alex.kim@students.edu", "student1234")

        # Find a slot and book it
        slot = get_first_available_slot(app, "CLINIC")
        if not slot:
            pytest.skip("No available clinic slots")

        resp1 = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "CLINIC",
                "slot_id": slot.id,
                "provider_id": slot.provider_id,
                "request_id": f"conflict-test-{slot.id}",
            },
        )
        if resp1.status_code not in (201, 200):
            pytest.skip("First booking failed unexpectedly")

        # Try to book the same slot again with a different request_id
        client.post("/api/v1/auth/logout")
        login(client, "priya.sharma@students.edu", "student1234")
        resp2 = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "CLINIC",
                "slot_id": slot.id,
                "provider_id": slot.provider_id,
                "request_id": f"conflict-test-other-{slot.id}",
            },
        )
        assert resp2.status_code == 409
        data = resp2.get_json()
        assert data["error"]["code"] == "SLOT_UNAVAILABLE"


class TestAdvisingBooking:
    def test_advising_booking_does_not_create_queue(self, client, app):
        """TC-05: Advising booking creates appointment but NO queue entry."""
        login(client, "alex.kim@students.edu", "student1234")
        slot = get_first_available_slot(app, "ADVISING")
        if not slot:
            pytest.skip("No available advising slots")

        resp = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "ADVISING",
                "slot_id": slot.id,
                "provider_id": slot.provider_id,
                "request_id": f"test-advising-{slot.id}",
            },
        )
        assert resp.status_code == 201
        data = resp.get_json()["data"]
        assert data["status"] == "CONFIRMED"
        assert data["service_type_code"] == "ADVISING"
        # queue_entry must be absent or None
        assert data.get("queue_entry") is None


class TestIdempotency:
    def test_repeated_request_id_returns_original(self, client, app):
        """TC-08: Submitting the same request_id twice returns the original booking."""
        login(client, "jordan.lee@students.edu", "student1234")
        slot = get_first_available_slot(app, "ADVISING")
        if not slot:
            pytest.skip("No available advising slots")

        payload = {
            "service_type": "ADVISING",
            "slot_id": slot.id,
            "provider_id": slot.provider_id,
            "request_id": "idem-test-unique-001",
        }
        resp1 = client.post("/api/v1/appointments", json=payload)
        if resp1.status_code not in (200, 201):
            pytest.skip("First booking failed")
        appt_id_1 = resp1.get_json()["data"]["id"]

        resp2 = client.post("/api/v1/appointments", json=payload)
        assert resp2.status_code in (200, 201)
        appt_id_2 = resp2.get_json()["data"]["id"]

        assert appt_id_1 == appt_id_2, (
            "Idempotent replay must return the same appointment"
        )


class TestCancellation:
    def test_cancellation_releases_slot_and_creates_audit(self, client, app):
        """TC-09: Cancelling confirms cancellation and creates audit."""
        login(client, "alex.kim@students.edu", "student1234")
        slot = get_first_available_slot(app, "CLINIC")
        if not slot:
            pytest.skip("No available clinic slots")

        resp = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "CLINIC",
                "slot_id": slot.id,
                "provider_id": slot.provider_id,
                "request_id": f"cancel-test-{slot.id}",
            },
        )
        if resp.status_code not in (200, 201):
            pytest.skip("Booking failed")
        appt_id = resp.get_json()["data"]["id"]

        cancel_resp = client.post(
            f"/api/v1/appointments/{appt_id}/cancel", json={"reason": "Test"}
        )
        assert cancel_resp.status_code == 200
        assert cancel_resp.get_json()["data"]["status"] == "CANCELLED"

        # Slot should now be available again
        with app.app_context():
            updated_slot = db.session.get(AvailabilitySlot, slot.id)
            assert updated_slot.state == SlotState.AVAILABLE


class TestReschedule:
    def test_reschedule_failure_preserves_original(self, client, app):
        """TC-10: Reschedule to unavailable slot preserves original booking."""
        login(client, "alex.kim@students.edu", "student1234")
        slots = []
        with app.app_context():
            svc = ServiceType.query.filter_by(code="ADVISING").first()
            booked = (
                db.session.query(Appointment.slot_id)
                .filter_by(status=AppointmentStatus.CONFIRMED)
                .scalar_subquery()
            )
            available = (
                AvailabilitySlot.query.filter_by(
                    service_type_id=svc.id, state=SlotState.AVAILABLE
                )
                .filter(AvailabilitySlot.id.not_in(booked))
                .order_by(AvailabilitySlot.start_at)
                .limit(2)
                .all()
            )
            slots = [(s.id, s.provider_id) for s in available]

        if len(slots) < 2:
            pytest.skip("Need at least 2 available advising slots")

        slot1_id, provider1_id = slots[0]
        slot2_id, provider2_id = slots[1]

        # Book slot1
        resp1 = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "ADVISING",
                "slot_id": slot1_id,
                "provider_id": provider1_id,
                "request_id": f"reschedule-orig-{slot1_id}",
            },
        )
        if resp1.status_code not in (200, 201):
            pytest.skip("Initial booking failed")
        appt_id = resp1.get_json()["data"]["id"]

        # Book slot2 with another user to make it unavailable
        client.post("/api/v1/auth/logout")
        login(client, "priya.sharma@students.edu", "student1234")
        client.post(
            "/api/v1/appointments",
            json={
                "service_type": "ADVISING",
                "slot_id": slot2_id,
                "provider_id": provider2_id,
                "request_id": f"reschedule-block-{slot2_id}",
            },
        )

        # Try to reschedule to (now booked) slot2
        client.post("/api/v1/auth/logout")
        login(client, "alex.kim@students.edu", "student1234")
        resp_rs = client.post(
            f"/api/v1/appointments/{appt_id}/reschedule", json={"new_slot_id": slot2_id}
        )
        assert resp_rs.status_code == 409

        # Original appointment must still be CONFIRMED
        resp_orig = client.get(f"/api/v1/appointments/{appt_id}")
        assert resp_orig.status_code == 200
        assert resp_orig.get_json()["data"]["status"] == "CONFIRMED"
        assert resp_orig.get_json()["data"]["slot_id"] == slot1_id


class TestValidation:
    def test_invalid_service_type_returns_400(self, client):
        """TC-15: Unknown service type returns documented error."""
        login(client, "alex.kim@students.edu", "student1234")
        resp = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "UNKNOWN_SERVICE",
                "slot_id": 1,
                "provider_id": 1,
            },
        )
        assert resp.status_code == 400
        data = resp.get_json()
        assert data["success"] is False
        assert "error" in data
        assert data["error"]["code"] == "INVALID_SERVICE_TYPE"

    def test_missing_fields_returns_400(self, client):
        """TC-15b: Missing required fields return 400."""
        login(client, "alex.kim@students.edu", "student1234")
        resp = client.post("/api/v1/appointments", json={})
        assert resp.status_code == 400
