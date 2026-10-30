"""
Clinic Queue Service.
Manages queue entries for CLINIC appointments only.
Enforces valid queue status transitions.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone

from ..extensions import db
from ..models.queue_entry import QueueEntry, QueueStatus
from ..models.appointment import Appointment, AppointmentStatus
from ..models.service_type import ServiceCode

logger = logging.getLogger(__name__)


class QueueError(Exception):
    def __init__(self, message: str, code: str = "QUEUE_ERROR", status_code: int = 400):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


def _next_ticket(service_date: date) -> str:
    """Generate the next sequential ticket number for the day."""
    last = (
        QueueEntry.query.filter_by(service_date=service_date)
        .order_by(QueueEntry.sequence.desc())
        .first()
    )
    seq = (last.sequence + 1) if last else 1
    return f"Q{seq:03d}"


def create_queue_entry(appointment: Appointment) -> QueueEntry:
    """Create a queue entry for a confirmed CLINIC appointment."""
    # Enforce clinic-only rule
    if appointment.service_type.code != ServiceCode.CLINIC:
        raise QueueError(
            "Queue entries are only created for CLINIC appointments.",
            "INVALID_SERVICE_TYPE",
            400,
        )
    # One queue entry per appointment
    existing = QueueEntry.query.filter_by(appointment_id=appointment.id).first()
    if existing:
        return existing

    service_date = appointment.slot.start_at.date()
    last = (
        QueueEntry.query.filter_by(service_date=service_date)
        .order_by(QueueEntry.sequence.desc())
        .first()
    )
    seq = (last.sequence + 1) if last else 1
    ticket = f"Q{seq:03d}"

    entry = QueueEntry(
        appointment_id=appointment.id,
        service_date=service_date,
        ticket_number=ticket,
        status=QueueStatus.WAITING,
        sequence=seq,
    )
    db.session.add(entry)
    db.session.flush()
    return entry


def get_queue_for_date(service_date: date) -> list[QueueEntry]:
    return (
        QueueEntry.query.filter_by(service_date=service_date)
        .order_by(QueueEntry.sequence)
        .all()
    )


def get_queue_entry_for_user(user_id: int) -> QueueEntry | None:
    """Get the most recent queue entry for a student's clinic appointment."""
    appt = (
        Appointment.query.filter_by(user_id=user_id, status=AppointmentStatus.CONFIRMED)
        .join(Appointment.service_type)
        .filter_by(code=ServiceCode.CLINIC)
        .order_by(Appointment.created_at.desc())
        .first()
    )
    if not appt:
        return None
    return QueueEntry.query.filter_by(appointment_id=appt.id).first()


def transition_queue_status(entry_id: int, new_status: QueueStatus) -> QueueEntry:
    """Perform a validated queue status transition."""
    entry = db.session.get(QueueEntry, entry_id)
    if not entry:
        raise QueueError("Queue entry not found.", "NOT_FOUND", 404)
    if not entry.can_transition_to(new_status):
        raise QueueError(
            f"Cannot transition queue from {entry.status.value} to {new_status.value}.",
            "INVALID_QUEUE_TRANSITION",
            409,
        )
    entry.status = new_status
    entry.updated_at = datetime.now(timezone.utc)
    db.session.flush()
    return entry


def call_next(service_date: date) -> QueueEntry | None:
    """Call the next WAITING entry in the queue."""
    # Complete any IN_SERVICE first is not automatic — staff must complete manually
    # Just call the next WAITING
    next_entry = (
        QueueEntry.query.filter_by(
            service_date=service_date, status=QueueStatus.WAITING
        )
        .order_by(QueueEntry.sequence)
        .first()
    )
    if not next_entry:
        return None
    return transition_queue_status(next_entry.id, QueueStatus.CALLED)


def count_ahead(entry_id: int) -> int:
    """Count how many WAITING entries are ahead of this one."""
    entry = db.session.get(QueueEntry, entry_id)
    if not entry or entry.status != QueueStatus.WAITING:
        return 0
    return QueueEntry.query.filter(
        QueueEntry.service_date == entry.service_date,
        QueueEntry.status == QueueStatus.WAITING,
        QueueEntry.sequence < entry.sequence,
    ).count()
