"""
Appointment Management Service.
Core business logic for creating, cancelling, and rescheduling appointments.
Enforces ownership, state transitions, and conflict resolution.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError

from ..extensions import db
from ..models.appointment import Appointment, AppointmentStatus
from ..models.availability_slot import AvailabilitySlot
from .availability_service import is_slot_available, release_slot

logger = logging.getLogger(__name__)


class AppointmentError(Exception):
    def __init__(
        self, message: str, code: str = "APPOINTMENT_ERROR", status_code: int = 400
    ):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


def get_appointment_by_public_id(public_id: str) -> Appointment | None:
    return Appointment.query.filter_by(public_id=public_id).first()


def get_user_appointments(user_id: int, status: str | None = None) -> list[Appointment]:
    q = Appointment.query.filter_by(user_id=user_id)
    if status:
        q = q.filter_by(status=status)
    return q.order_by(Appointment.created_at.desc()).all()


def create_appointment(
    user_id: int,
    slot_id: int,
    service_type_id: int,
    provider_id: int,
    *,
    request_id: str | None = None,
    notes: str | None = None,
    _simulate_slot_conflict: bool = False,
) -> Appointment:
    """
    Create an appointment with idempotency and conflict detection.
    Uses a database-level unique constraint on slot_id as the final guard.
    """
    # Idempotency: check for existing booking with same request_id by same user
    if request_id:
        existing = Appointment.query.filter_by(
            user_id=user_id, request_id=request_id
        ).first()
        if existing:
            logger.info(
                "Idempotent replay: returning existing appointment %s",
                existing.public_id,
            )
            return existing

    if _simulate_slot_conflict:
        raise AppointmentError(
            "The selected slot is no longer available.", "SLOT_UNAVAILABLE", 409
        )

    # Re-check availability inside the same transaction
    if not is_slot_available(slot_id):
        raise AppointmentError(
            "The selected slot is no longer available.", "SLOT_UNAVAILABLE", 409
        )

    slot = db.session.get(AvailabilitySlot, slot_id)
    if not slot or slot.service_type_id != service_type_id:
        raise AppointmentError(
            "Slot does not match the requested service.", "SLOT_SERVICE_MISMATCH", 400
        )

    appointment = Appointment(
        user_id=user_id,
        provider_id=provider_id,
        service_type_id=service_type_id,
        slot_id=slot_id,
        request_id=request_id,
        notes=notes,
        status=AppointmentStatus.CONFIRMED,
    )
    try:
        with db.session.begin_nested():
            db.session.add(appointment)
            db.session.flush()
    except IntegrityError:
        raise AppointmentError(
            "The selected slot is no longer available.", "SLOT_UNAVAILABLE", 409
        )

    return appointment


def cancel_appointment(
    appointment_public_id: str,
    requesting_user_id: int,
    reason: str | None = None,
    *,
    allow_staff: bool = False,
) -> Appointment:
    """Cancel appointment and release the slot."""
    appt = get_appointment_by_public_id(appointment_public_id)
    if not appt:
        raise AppointmentError("Appointment not found.", "NOT_FOUND", 404)

    if not allow_staff and appt.user_id != requesting_user_id:
        raise AppointmentError(
            "You do not have permission to cancel this appointment.", "FORBIDDEN", 403
        )

    if appt.status != AppointmentStatus.CONFIRMED:
        raise AppointmentError(
            f"Cannot cancel an appointment with status {appt.status.value}.",
            "INVALID_STATUS_TRANSITION",
            409,
        )

    appt.status = AppointmentStatus.CANCELLED
    appt.cancellation_reason = reason
    appt.updated_at = datetime.now(timezone.utc)

    # Release the slot
    release_slot(appt.slot_id)
    db.session.flush()
    return appt


def reschedule_appointment(
    appointment_public_id: str,
    new_slot_id: int,
    requesting_user_id: int,
) -> Appointment:
    """
    Reschedule: reserve the new slot, release the old one.
    If the new slot is unavailable, preserve the original appointment.
    """
    appt = get_appointment_by_public_id(appointment_public_id)
    if not appt:
        raise AppointmentError("Appointment not found.", "NOT_FOUND", 404)
    if appt.user_id != requesting_user_id:
        raise AppointmentError(
            "You do not have permission to reschedule this appointment.",
            "FORBIDDEN",
            403,
        )
    if appt.status != AppointmentStatus.CONFIRMED:
        raise AppointmentError(
            f"Cannot reschedule an appointment with status {appt.status.value}.",
            "INVALID_STATUS_TRANSITION",
            409,
        )
    if new_slot_id == appt.slot_id:
        raise AppointmentError(
            "New slot is the same as the current slot.", "SAME_SLOT", 400
        )

    new_slot = db.session.get(AvailabilitySlot, new_slot_id)
    if not new_slot or new_slot.service_type_id != appt.service_type_id:
        raise AppointmentError(
            "New slot not found or does not match the service.", "SLOT_NOT_FOUND", 404
        )

    if not is_slot_available(new_slot_id):
        raise AppointmentError(
            "The requested new slot is not available.", "SLOT_UNAVAILABLE", 409
        )

    old_slot_id = appt.slot_id
    appt.slot_id = new_slot_id
    appt.provider_id = new_slot.provider_id
    appt.updated_at = datetime.now(timezone.utc)
    release_slot(old_slot_id)
    db.session.flush()
    return appt


def update_appointment_status(
    appointment_public_id: str,
    new_status: AppointmentStatus,
    requesting_user_id: int,
    *,
    allow_staff: bool = False,
    outcome_notes: str | None = None,
) -> Appointment:
    """Update appointment status (e.g., COMPLETED, NO_SHOW by staff) and save session outcome notes."""
    appt = get_appointment_by_public_id(appointment_public_id)
    if not appt:
        raise AppointmentError("Appointment not found.", "NOT_FOUND", 404)
    if not allow_staff and appt.user_id != requesting_user_id:
        raise AppointmentError("Forbidden.", "FORBIDDEN", 403)

    valid_transitions = {
        AppointmentStatus.CONFIRMED: [
            AppointmentStatus.COMPLETED,
            AppointmentStatus.NO_SHOW,
            AppointmentStatus.CANCELLED,
        ],
        AppointmentStatus.CANCELLED: [],
        AppointmentStatus.COMPLETED: [],
        AppointmentStatus.NO_SHOW: [],
    }
    if new_status not in valid_transitions.get(appt.status, []):
        raise AppointmentError(
            f"Cannot transition from {appt.status.value} to {new_status.value}.",
            "INVALID_STATUS_TRANSITION",
            409,
        )
    appt.status = new_status
    if outcome_notes is not None:
        appt.outcome_notes = outcome_notes
    appt.updated_at = datetime.now(timezone.utc)
    db.session.flush()
    return appt
