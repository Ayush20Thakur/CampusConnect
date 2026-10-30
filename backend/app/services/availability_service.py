"""
Availability & Scheduling Service.
Manages provider slots, availability queries, and conflict detection.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone


from ..extensions import db
from ..models.availability_slot import AvailabilitySlot, SlotState
from ..models.appointment import Appointment, AppointmentStatus
from ..models.provider import Provider

logger = logging.getLogger(__name__)


class AvailabilityError(Exception):
    """Raised for slot/availability constraint violations."""

    def __init__(self, message: str, code: str = "AVAILABILITY_ERROR"):
        super().__init__(message)
        self.code = code


def get_available_slots(
    service_type_id: int | None = None,
    provider_id: int | None = None,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
) -> list[AvailabilitySlot]:
    """Return available (not blocked, not booked) slots matching filters."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    query = AvailabilitySlot.query.filter(
        AvailabilitySlot.state == SlotState.AVAILABLE,
        AvailabilitySlot.start_at > now,
    )
    if service_type_id:
        query = query.filter(AvailabilitySlot.service_type_id == service_type_id)
    if provider_id:
        query = query.filter(AvailabilitySlot.provider_id == provider_id)
    if from_dt:
        query = query.filter(AvailabilitySlot.start_at >= from_dt.replace(tzinfo=None))
    if to_dt:
        query = query.filter(AvailabilitySlot.start_at <= to_dt.replace(tzinfo=None))

    # Exclude slots that have a confirmed appointment
    booked_slot_ids = (
        db.session.query(Appointment.slot_id)
        .filter(Appointment.status == AppointmentStatus.CONFIRMED)
        .scalar_subquery()
    )
    query = query.filter(AvailabilitySlot.id.not_in(booked_slot_ids))

    # Join active providers
    query = query.join(Provider).filter(Provider.is_active.is_(True))

    return query.order_by(AvailabilitySlot.start_at).all()


def get_slot_by_id(slot_id: int) -> AvailabilitySlot | None:
    return db.session.get(AvailabilitySlot, slot_id)


def create_slot(
    provider_id: int,
    service_type_id: int,
    start_at: datetime,
    end_at: datetime,
) -> AvailabilitySlot:
    """Create a new availability slot, checking for overlaps."""
    if start_at >= end_at:
        raise AvailabilityError("start_at must be before end_at", "INVALID_TIME_RANGE")
    if start_at.replace(tzinfo=None) <= datetime.now(timezone.utc).replace(tzinfo=None):
        raise AvailabilityError("Slot must be in the future", "SLOT_IN_PAST")

    # Overlap check for same provider
    overlap = AvailabilitySlot.query.filter(
        AvailabilitySlot.provider_id == provider_id,
        AvailabilitySlot.state == SlotState.AVAILABLE,
        AvailabilitySlot.start_at < end_at.replace(tzinfo=None),
        AvailabilitySlot.end_at > start_at.replace(tzinfo=None),
    ).first()
    if overlap:
        raise AvailabilityError(
            "Provider already has an overlapping slot", "SLOT_OVERLAP"
        )

    slot = AvailabilitySlot(
        provider_id=provider_id,
        service_type_id=service_type_id,
        start_at=start_at.replace(tzinfo=None),
        end_at=end_at.replace(tzinfo=None),
        state=SlotState.AVAILABLE,
    )
    db.session.add(slot)
    db.session.flush()
    return slot


def block_slot(slot_id: int) -> AvailabilitySlot:
    slot = get_slot_by_id(slot_id)
    if not slot:
        raise AvailabilityError("Slot not found", "SLOT_NOT_FOUND")
    # Check no confirmed appointment exists
    if slot.appointment and slot.appointment.status == AppointmentStatus.CONFIRMED:
        raise AvailabilityError(
            "Cannot block a slot with a confirmed appointment", "SLOT_HAS_BOOKING"
        )
    slot.state = SlotState.BLOCKED
    db.session.flush()
    return slot


def unblock_slot(slot_id: int) -> AvailabilitySlot:
    """Unblock a previously blocked slot."""
    slot = get_slot_by_id(slot_id)
    if not slot:
        raise AvailabilityError("Slot not found", "SLOT_NOT_FOUND")
    slot.state = SlotState.AVAILABLE
    db.session.flush()
    return slot


def get_provider_slots(
    provider_id: int,
    from_dt: datetime | None = None,
    to_dt: datetime | None = None,
) -> list[AvailabilitySlot]:
    """Return all slots (available, blocked, booked) for a provider."""
    query = AvailabilitySlot.query.filter(AvailabilitySlot.provider_id == provider_id)
    if from_dt:
        query = query.filter(AvailabilitySlot.start_at >= from_dt.replace(tzinfo=None))
    if to_dt:
        query = query.filter(AvailabilitySlot.start_at <= to_dt.replace(tzinfo=None))
    return query.order_by(AvailabilitySlot.start_at).all()


def release_slot(slot_id: int) -> AvailabilitySlot:
    """Mark a slot as available again (e.g., after cancellation)."""
    slot = get_slot_by_id(slot_id)
    if slot:
        slot.state = SlotState.AVAILABLE
        db.session.flush()
    return slot


def is_slot_available(slot_id: int) -> bool:
    """Atomically check if a slot is available for booking."""
    slot = AvailabilitySlot.query.filter_by(
        id=slot_id, state=SlotState.AVAILABLE
    ).first()
    if not slot:
        return False
    # Check no confirmed appointment
    existing = Appointment.query.filter_by(
        slot_id=slot_id, status=AppointmentStatus.CONFIRMED
    ).first()
    return existing is None
