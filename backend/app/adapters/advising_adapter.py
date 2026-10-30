"""
Advising Adapter.
Validates advising-specific booking context and orchestrates the shared
appointment workflow WITHOUT queue entry creation.
"""

from __future__ import annotations

import logging

from flask import g

from ..extensions import db
from ..models.service_type import ServiceCode, ServiceType
from ..models.appointment import Appointment
from ..services.appointment_service import create_appointment, AppointmentError
from ..services.notification_service import create_notification, NotificationType
from ..services.audit_service import record_audit_event, timed_trace_step

logger = logging.getLogger(__name__)


def book_advising_appointment(
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
    Advising booking workflow:
    1. Validate service type is ADVISING.
    2. Create appointment (shared service).
    3. NO queue entry — advising does not use the clinic queue.
    4. Create notification.
    5. Record audit.
    """
    cid = getattr(g, "correlation_id", None)
    seq = 0

    with db.session.begin_nested():
        with timed_trace_step(
            "AdvisingAdapter", "validate_service_type", seq := seq + 1
        ):
            svc = ServiceType.query.filter_by(
                code=ServiceCode.ADVISING, active=True
            ).first()
            if not svc:
                raise AppointmentError(
                    "Advising service is not active.", "SERVICE_UNAVAILABLE", 503
                )
            service_type_id = svc.id

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
        # NOTE: No queue entry created — this is the key SOA differentiation.

    # Notification (safe failure)
    with timed_trace_step(
        "NotificationService",
        "create_notification",
        seq := seq + 1,
        {"user_id": user_id},
    ):
        create_notification(
            user_id,
            "Advising appointment confirmed",
            f"Your advising appointment with {appointment.provider.display_name} has been confirmed for "
            f"{appointment.slot.start_at.strftime('%A, %B %d at %H:%M UTC')}.",
            NotificationType.BOOKING_CONFIRMED,
            appointment_id=appointment.id,
            _simulate_failure=_simulate_notification_failure,
        )

    record_audit_event(
        "ADVISING_APPOINTMENT_BOOKED",
        "SUCCESS",
        actor_user_id=user_id,
        entity_type="Appointment",
        entity_id=appointment.public_id,
        safe_metadata={"slot_id": slot_id, "provider_id": provider_id},
        correlation_id=cid,
    )
    return appointment
