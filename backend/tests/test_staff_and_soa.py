"""
Tests for Staff Operations and SOA Capabilities:
- Adviser managing appointment outcomes and notes
- Staff schedule retrieval and slot management (create, block, unblock)
- SOA policy contrast and API contracts registry
"""

from datetime import datetime, timezone, timedelta
from backend.tests.helpers import login
from app.extensions import db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.availability_slot import AvailabilitySlot, SlotState
from app.models.provider import Provider
from app.models.user import User


class TestAdviserOutcomeNotes:
    def test_adviser_records_session_outcome_notes(self, client, app):
        """TC-14: Adviser completes an appointment and records persistent outcome notes."""
        # 1. Book a dedicated advising appointment as student Alex Kim
        login(client, "alex.kim@students.edu", "student1234")
        with app.app_context():
            adv = User.query.filter_by(email="j.morgan@campusconnect.edu").first()
            prov = Provider.query.filter_by(user_id=adv.id).first()
            # Find an unbooked slot
            booked_slots = (
                db.session.query(Appointment.slot_id)
                .filter(Appointment.status == AppointmentStatus.CONFIRMED)
                .scalar_subquery()
            )
            slot = (
                AvailabilitySlot.query.filter_by(
                    provider_id=prov.id, state=SlotState.AVAILABLE
                )
                .filter(AvailabilitySlot.id.not_in(booked_slots))
                .first()
            )
            slot_id = slot.id
            prov_id = prov.id

        resp_book = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "ADVISING",
                "slot_id": slot_id,
                "provider_id": prov_id,
                "request_id": f"outcome-test-req-{slot_id}",
            },
        )
        assert resp_book.status_code == 201
        appt_public_id = resp_book.get_json()["data"]["id"]

        # 2. Log in as adviser Prof. James Morgan
        client.post("/api/v1/auth/logout")
        login(client, "j.morgan@campusconnect.edu", "adviser1234")

        outcome_text = (
            "Student completed degree audit. Approved elective CS420 for Spring term."
        )

        # 3. Mark completed with outcome notes
        resp_status = client.post(
            f"/api/v1/staff/advising/appointments/{appt_public_id}/status",
            json={
                "status": "COMPLETED",
                "outcome_notes": outcome_text,
            },
        )
        assert resp_status.status_code == 200
        data = resp_status.get_json()["data"]
        assert data["status"] == "COMPLETED"
        assert data["outcome_notes"] == outcome_text

        # 4. Verify persistence via student GET /appointments/<id>
        client.post("/api/v1/auth/logout")
        login(client, "alex.kim@students.edu", "student1234")
        resp_get = client.get(f"/api/v1/appointments/{appt_public_id}")
        assert resp_get.status_code == 200
        data_student = resp_get.get_json()["data"]
        assert data_student["outcome_notes"] == outcome_text


class TestStaffAvailabilityManagement:
    def test_staff_retrieves_schedule(self, client):
        """TC-16: Staff can retrieve all slots for their provider."""
        login(client, "j.morgan@campusconnect.edu", "adviser1234")
        resp = client.get("/api/v1/staff/slots")
        assert resp.status_code == 200
        slots = resp.get_json()["data"]
        assert isinstance(slots, list)
        assert len(slots) > 0

    def test_staff_creates_blocks_and_unblocks_slot(self, client, app):
        """TC-17: Staff adds a new slot, blocks it, and unblocks it."""
        login(client, "j.morgan@campusconnect.edu", "adviser1234")

        # Resolve provider ID
        with app.app_context():
            adv = User.query.filter_by(email="j.morgan@campusconnect.edu").first()
            prov = Provider.query.filter_by(user_id=adv.id).first()
            provider_id = prov.id

        # Unique future slot time (30 days ahead)
        future_start = (datetime.now(timezone.utc) + timedelta(days=30)).replace(
            hour=10, minute=0, second=0, microsecond=0
        )
        future_end = future_start + timedelta(minutes=45)

        # 1. Create slot
        resp_create = client.post(
            "/api/v1/admin/availability",
            json={
                "provider_id": provider_id,
                "start_at": future_start.isoformat(),
                "end_at": future_end.isoformat(),
            },
        )
        assert resp_create.status_code == 201
        slot = resp_create.get_json()["data"]
        slot_id = slot["id"]
        assert slot["state"] == "AVAILABLE"

        # 2. Block slot
        resp_block = client.post(f"/api/v1/admin/availability/{slot_id}/block")
        assert resp_block.status_code == 200
        assert resp_block.get_json()["data"]["state"] == "BLOCKED"

        # 3. Verify it does not appear in public student availability
        client.post("/api/v1/auth/logout")
        login(client, "alex.kim@students.edu", "student1234")
        resp_avail = client.get(f"/api/v1/availability?provider_id={provider_id}")
        avail_slot_ids = [s["id"] for s in resp_avail.get_json()["data"]]
        assert slot_id not in avail_slot_ids

        # 4. Unblock slot as adviser
        client.post("/api/v1/auth/logout")
        login(client, "j.morgan@campusconnect.edu", "adviser1234")
        resp_unblock = client.post(f"/api/v1/admin/availability/{slot_id}/unblock")
        assert resp_unblock.status_code == 200
        assert resp_unblock.get_json()["data"]["state"] == "AVAILABLE"


class TestSOAPoliciesAndContracts:
    def test_admin_policies_show_clinic_vs_advising_differentiation(self, client):
        """TC-18: Policies endpoint highlights queue ticket rule differences."""
        login(client, "admin@campusconnect.edu", "admin1234")
        resp = client.get("/api/v1/admin/policies")
        assert resp.status_code == 200
        policies = resp.get_json()["data"]

        # Clinic generates queue ticket, Advising does not
        assert policies["CLINIC"]["creates_queue_entry"] is True
        assert policies["ADVISING"]["creates_queue_entry"] is False
        assert policies["CLINIC"]["cancellation_cutoff_hours"] == 2
        assert policies["ADVISING"]["cancellation_cutoff_hours"] == 4

    def test_admin_contracts_returns_api_registry(self, client):
        """TC-19: Contracts endpoint returns typed API endpoints with schemas."""
        login(client, "admin@campusconnect.edu", "admin1234")
        resp = client.get("/api/v1/admin/contracts")
        assert resp.status_code == 200
        contracts = resp.get_json()["data"]
        assert len(contracts) >= 8

        routes = [c["route"] for c in contracts]
        assert "/api/v1/appointments" in routes
        assert "/api/v1/availability" in routes
        assert "/api/v1/clinic/queue/me" in routes
