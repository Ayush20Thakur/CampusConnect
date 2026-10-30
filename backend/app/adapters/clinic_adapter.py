"""
Clinic Adapter.
Validates clinic-specific booking context and orchestrates the shared
appointment workflow plus queue entry creation.
"""

from __future__ import annotations

import logging

from flask import g

from ..extensions import db
from ..models.service_type import ServiceCode, ServiceType
from ..models.appointment import Appointment
from ..services.appointment_service import create_appointment, AppointmentError
from ..services.queue_service import create_queue_entry
from ..services.notification_service import create_notification, NotificationType
from ..services.audit_service import record_audit_event, timed_trace_step

logger = logging.getLogger(__name__)


def book_clinic_appointment(
    user_id: int,
    slot_id: int,
    provider_id: int,
    *,
    request_id: str | None = None,
    notes: str | None = None,
    _simulate_slot_conflict: bool = False,
    _simulate_notification_failure: bool = False,
) -> Appointment:
    """
    Clinic booking workflow:
    1. Validate service type is CLINIC.
    2. Create appointment (shared service).
    3. Create queue entry (clinic-specific).
    4. Create notification.
    5. Record audit.
    All within one transaction; notification failure is isolated.
    """
    cid = getattr(g, "correlation_id", None)
    seq = 0

    with db.session.begin_nested():
        # Step 1: Validate service
        with timed_trace_step("ClinicAdapter", "validate_service_type", seq := seq + 1):
            svc = ServiceType.query.filter_by(
                code=ServiceCode.CLINIC, active=True
            ).first()
            if not svc:
                raise AppointmentError(
                    "Clinic service is not active.", "SERVICE_UNAVAILABLE", 503
                )
            service_type_id = svc.id

        # Step 2: Create appointment
        with timed_trace_step(
            "AppointmentService", "create_appointment", seq := seq + 1
        ):
            appointment = create_appointment(
                user_id,
                slot_id,
                service_type_id,
                provider_id,
                request_id=request_id,
                notes=notes,
                _simulate_slot_conflict=_simulate_slot_conflict,
            )

        # Step 3: Create queue entry (clinic-specific)
        with timed_trace_step(
            "ClinicQueueService", "create_queue_entry", seq := seq + 1
        ):
            queue_entry = create_queue_entry(appointment)

    # Step 4: Notification (outside nested transaction — may fail safely)
    with timed_trace_step(
        "NotificationService",
        "create_notification",
        seq := seq + 1,
        {"user_id": user_id},
    ):
        create_notification(
            user_id,
            "Clinic appointment confirmed",
            f"Your clinic appointment (ticket {queue_entry.ticket_number}) has been confirmed for "
            f"{appointment.slot.start_at.strftime('%A, %B %d at %H:%M UTC')}.",
            NotificationType.BOOKING_CONFIRMED,
            appointment_id=appointment.id,
            _simulate_failure=_simulate_notification_failure,
        )

    # Step 5: Audit
    record_audit_event(
        "CLINIC_APPOINTMENT_BOOKED",
        "SUCCESS",
        actor_user_id=user_id,
        entity_type="Appointment",
        entity_id=appointment.public_id,
        safe_metadata={"slot_id": slot_id, "ticket": queue_entry.ticket_number},
        correlation_id=cid,
    )
    return appointment
