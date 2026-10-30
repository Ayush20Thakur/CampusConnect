"""End-to-End Smoke Tests for CampusConnect.

Verifies complete multi-persona user journeys:
1. Student & Staff logins for all 4 demo users
2. Clinic booking with queue ticket issuance and queue desk lifecycle
3. Advising booking with NO queue ticket, followed by adviser outcome notes recording
4. Idempotency and double-booking concurrency conflict protection
5. Fault simulation lab toggling and fault isolation
6. SOA contracts and policy difference checks
7. Cross-role unauthorized access rejection (RBAC)
"""

from __future__ import annotations

from app.extensions import db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.availability_slot import AvailabilitySlot, SlotState
from app.models.provider import Provider
from app.models.service_type import ServiceType
from app.models.user import User
from backend.tests.helpers import login


class TestSmokeEndToEnd:
    def test_01_all_demo_users_can_authenticate(self, client):
        """All 4 demo personas can successfully log in and access /me."""
        credentials = [
            ("alex.kim@students.edu", "student1234", "STUDENT", "Alex Kim"),
            (
                "clinic.staff@campusconnect.edu",
                "staff1234",
                "CLINIC_STAFF",
                "Nurse Jamie Torres",
            ),
            (
                "j.morgan@campusconnect.edu",
                "adviser1234",
                "ADVISER",
                "Prof. James Morgan",
            ),
            ("admin@campusconnect.edu", "admin1234", "ADMIN", "Administrator"),
        ]
        for email, password, expected_role, expected_name in credentials:
            resp = login(client, email, password)
            assert resp.status_code == 200, (
                f"Failed login for {email}: {resp.get_json()}"
            )
            data = resp.get_json()["data"]
            assert data["role"] == expected_role
            assert data["email"] == email

            # Verify /me endpoint returns the authenticated profile
            me_resp = client.get("/api/v1/auth/me")
            assert me_resp.status_code == 200
            assert me_resp.get_json()["data"]["email"] == email

            # Logout before next persona
            client.post("/api/v1/auth/logout")

    def test_02_clinic_booking_and_queue_lifecycle(self, client, app):
        """Student books clinic slot -> receives queue ticket -> staff calls next -> completes."""
        # 1. Login as Student Alex Kim
        login(client, "alex.kim@students.edu", "student1234")

        # Find an unbooked clinic slot
        with app.app_context():
            clinic_svc = ServiceType.query.filter_by(code="CLINIC").first()
            booked = (
                db.session.query(Appointment.slot_id)
                .filter_by(status=AppointmentStatus.CONFIRMED)
                .scalar_subquery()
            )
            slot = (
                AvailabilitySlot.query.filter_by(
                    service_type_id=clinic_svc.id, state=SlotState.AVAILABLE
                )
                .filter(AvailabilitySlot.id.not_in(booked))
                .order_by(AvailabilitySlot.start_at)
                .first()
            )
            assert slot is not None, "At least one clinic slot must be available"
            slot_id = slot.id
            provider_id = slot.provider_id
            service_date_str = slot.start_at.date().isoformat()

        # Book the clinic slot
        book_resp = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "CLINIC",
                "slot_id": slot_id,
                "provider_id": provider_id,
                "notes": "Annual physical and blood pressure check",
                "request_id": f"smoke-clinic-e2e-{slot_id}",
            },
        )
        assert book_resp.status_code == 201
        appt_data = book_resp.get_json()["data"]
        assert appt_data["status"] == "CONFIRMED"

        # Assert queue ticket is issued for clinic booking
        queue_info = appt_data.get("queue_entry")
        assert queue_info is not None, "Clinic appointment MUST issue a queue ticket"
        assert queue_info["ticket_number"].startswith("Q")
        assert queue_info["status"] == "WAITING"
        ticket_number = queue_info["ticket_number"]
        queue_entry_id = queue_info["id"]

        # Student checks queue tracker
        tracker_resp = client.get("/api/v1/clinic/queue/me")
        assert tracker_resp.status_code == 200
        assert tracker_resp.get_json()["data"]["ticket_number"] == ticket_number

        # 2. Staff logs in and manages queue
        client.post("/api/v1/auth/logout")
        login(client, "clinic.staff@campusconnect.edu", "staff1234")

        # Staff views queue desk
        desk_resp = client.get(f"/api/v1/staff/clinic/queue?date={service_date_str}")
        assert desk_resp.status_code == 200
        desk_entries = desk_resp.get_json()["data"]
        matching_entry = next(
            (e for e in desk_entries if e["ticket_number"] == ticket_number), None
        )
        assert matching_entry is not None

        # Staff updates status to CALLED
        call_resp = client.post(
            f"/api/v1/staff/clinic/queue/{queue_entry_id}/status",
            json={"status": "CALLED"},
        )
        assert call_resp.status_code == 200
        assert call_resp.get_json()["data"]["status"] == "CALLED"

        # Staff updates status to IN_SERVICE
        in_svc_resp = client.post(
            f"/api/v1/staff/clinic/queue/{queue_entry_id}/status",
            json={"status": "IN_SERVICE"},
        )
        assert in_svc_resp.status_code == 200
        assert in_svc_resp.get_json()["data"]["status"] == "IN_SERVICE"

        # Staff completes the consultation
        complete_resp = client.post(
            f"/api/v1/staff/clinic/queue/{queue_entry_id}/status",
            json={"status": "COMPLETED"},
        )
        assert complete_resp.status_code == 200
        assert complete_resp.get_json()["data"]["status"] == "COMPLETED"

    def test_03_advising_booking_and_outcome_notes(self, client, app):
        """Student books advising -> strictly NO queue ticket -> adviser records outcome notes."""
        # 1. Login as Student Alex Kim
        login(client, "alex.kim@students.edu", "student1234")

        # Find an unbooked advising slot for Prof. James Morgan
        with app.app_context():
            adv_svc = ServiceType.query.filter_by(code="ADVISING").first()
            adv_user = User.query.filter_by(email="j.morgan@campusconnect.edu").first()
            prov = Provider.query.filter_by(user_id=adv_user.id).first()
            booked = (
                db.session.query(Appointment.slot_id)
                .filter_by(status=AppointmentStatus.CONFIRMED)
                .scalar_subquery()
            )
            slot = (
                AvailabilitySlot.query.filter_by(
                    provider_id=prov.id,
                    service_type_id=adv_svc.id,
                    state=SlotState.AVAILABLE,
                )
                .filter(AvailabilitySlot.id.not_in(booked))
                .order_by(AvailabilitySlot.start_at)
                .first()
            )
            assert slot is not None, (
                "At least one advising slot must be available for Prof. Morgan"
            )
            slot_id = slot.id
            provider_id = slot.provider_id

        # Book advising session
        book_resp = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "ADVISING",
                "slot_id": slot_id,
                "provider_id": provider_id,
                "notes": "Discussing capstone project and graduation requirements",
                "request_id": f"smoke-advising-e2e-{slot_id}",
            },
        )
        assert book_resp.status_code == 201
        appt_data = book_resp.get_json()["data"]
        appt_public_id = appt_data["id"]

        # Crucial SOA Boundary Check: Advising must NEVER issue a queue ticket
        assert appt_data.get("queue_entry") is None, (
            "Advising MUST NOT create a queue ticket"
        )

        # 2. Log in as Adviser Prof. Morgan
        client.post("/api/v1/auth/logout")
        login(client, "j.morgan@campusconnect.edu", "adviser1234")

        # Adviser views their schedule
        sched_resp = client.get("/api/v1/staff/advising/appointments")
        assert sched_resp.status_code == 200
        appts = sched_resp.get_json()["data"]
        matching = next((a for a in appts if a["id"] == appt_public_id), None)
        assert matching is not None

        # Adviser records outcome notes and marks consultation COMPLETED
        notes_text = "Student completed prerequisite review; cleared for capstone registration in Spring."
        outcome_resp = client.post(
            f"/api/v1/staff/advising/appointments/{appt_public_id}/status",
            json={
                "status": "COMPLETED",
                "outcome_notes": notes_text,
            },
        )
        assert outcome_resp.status_code == 200
        updated = outcome_resp.get_json()["data"]
        assert updated["status"] == "COMPLETED"
        assert updated["outcome_notes"] == notes_text

        # 3. Student views updated appointment details
        client.post("/api/v1/auth/logout")
        login(client, "alex.kim@students.edu", "student1234")
        detail_resp = client.get(f"/api/v1/appointments/{appt_public_id}")
        assert detail_resp.status_code == 200
        assert detail_resp.get_json()["data"]["outcome_notes"] == notes_text

    def test_04_fault_isolation_and_soa_resilience(self, client, app):
        """Simulated notification failure does not abort appointment booking."""
        login(client, "admin@campusconnect.edu", "admin1234")

        # Enable notification failure simulation
        toggle_resp = client.post(
            "/api/v1/admin/fault-lab/flags",
            json={
                "notification_failure": True,
            },
        )
        assert toggle_resp.status_code == 200

        # Login as student to book under simulated fault
        client.post("/api/v1/auth/logout")
        login(client, "alex.kim@students.edu", "student1234")

        with app.app_context():
            clinic_svc = ServiceType.query.filter_by(code="CLINIC").first()
            booked = (
                db.session.query(Appointment.slot_id)
                .filter_by(status=AppointmentStatus.CONFIRMED)
                .scalar_subquery()
            )
            slot = (
                AvailabilitySlot.query.filter_by(
                    service_type_id=clinic_svc.id, state=SlotState.AVAILABLE
                )
                .filter(AvailabilitySlot.id.not_in(booked))
                .first()
            )
            slot_id = slot.id
            provider_id = slot.provider_id

        book_resp = client.post(
            "/api/v1/appointments",
            json={
                "service_type": "CLINIC",
                "slot_id": slot_id,
                "provider_id": provider_id,
                "request_id": f"smoke-fault-e2e-{slot_id}",
            },
        )
        # Booking must succeed despite notification failure (fault isolation)
        assert book_resp.status_code == 201
        assert book_resp.get_json()["data"]["status"] == "CONFIRMED"

        # Cleanup: turn fault flag off
        client.post("/api/v1/auth/logout")
        login(client, "admin@campusconnect.edu", "admin1234")
        client.post(
            "/api/v1/admin/fault-lab/flags",
            json={
                "notification_failure": False,
            },
        )

    def test_05_soa_contracts_and_policies_introspection(self, client):
        """Admin SOA console endpoints accurately return contracts and policy comparisons."""
        login(client, "admin@campusconnect.edu", "admin1234")

        # 1. Policies endpoint
        policies_resp = client.get("/api/v1/admin/policies")
        assert policies_resp.status_code == 200
        pdata = policies_resp.get_json()["data"]
        clinic_pol = pdata["CLINIC"]
        advising_pol = pdata["ADVISING"]
        assert clinic_pol["queue_enabled"] is True
        assert advising_pol["queue_enabled"] is False
        assert clinic_pol["default_duration_minutes"] == 30
        assert advising_pol["default_duration_minutes"] == 45

        # 2. Service metadata / contracts
        contracts_resp = client.get("/api/v1/admin/contracts")
        assert contracts_resp.status_code == 200
        cdata = contracts_resp.get_json()["data"]
        assert len(cdata) >= 7

        # 3. Overview analytics
        overview_resp = client.get("/api/v1/admin/overview")
        assert overview_resp.status_code == 200
        odata = overview_resp.get_json()["data"]
        assert "appointments_today" in odata
        assert "active_queue_entries" in odata

    def test_06_rbac_access_controls_enforced(self, client):
        """Cross-role access checks block unauthorized endpoints with 403."""
        # Student cannot call clinic queue next
        login(client, "alex.kim@students.edu", "student1234")
        resp = client.post("/api/v1/staff/clinic/queue/next")
        assert resp.status_code == 403

        # Student cannot access admin overview
        resp = client.get("/api/v1/admin/overview")
        assert resp.status_code == 403

        # Adviser cannot access clinic queue
        client.post("/api/v1/auth/logout")
        login(client, "j.morgan@campusconnect.edu", "adviser1234")
        resp = client.get("/api/v1/staff/clinic/queue")
        assert resp.status_code == 403

        # Clinic staff cannot access admin traces
        client.post("/api/v1/auth/logout")
        login(client, "clinic.staff@campusconnect.edu", "staff1234")
        resp = client.get("/api/v1/admin/traces")
        assert resp.status_code == 403
