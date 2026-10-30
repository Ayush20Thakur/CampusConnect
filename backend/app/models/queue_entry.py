"""QueueEntry model."""

from __future__ import annotations
import enum
from datetime import datetime, timezone
from ..extensions import db


class QueueStatus(str, enum.Enum):
    WAITING = "WAITING"
    CALLED = "CALLED"
    IN_SERVICE = "IN_SERVICE"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"


# Valid transitions map
VALID_TRANSITIONS: dict[QueueStatus, list[QueueStatus]] = {
    QueueStatus.WAITING: [QueueStatus.CALLED, QueueStatus.SKIPPED],
    QueueStatus.CALLED: [
        QueueStatus.IN_SERVICE,
        QueueStatus.SKIPPED,
        QueueStatus.WAITING,
    ],
    QueueStatus.IN_SERVICE: [QueueStatus.COMPLETED],
    QueueStatus.COMPLETED: [],
    QueueStatus.SKIPPED: [QueueStatus.WAITING],
}


class QueueEntry(db.Model):
    __tablename__ = "queue_entries"

    id = db.Column(db.Integer, primary_key=True)
    appointment_id = db.Column(
        db.Integer, db.ForeignKey("appointments.id"), nullable=False, unique=True
    )
    service_date = db.Column(db.Date, nullable=False, index=True)
    ticket_number = db.Column(db.String(20), nullable=False)
    status = db.Column(
        db.Enum(QueueStatus), nullable=False, default=QueueStatus.WAITING
    )
    sequence = db.Column(db.Integer, nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Unique ticket per service date
    __table_args__ = (
        db.UniqueConstraint(
            "service_date", "ticket_number", name="uq_queue_ticket_date"
        ),
    )

    appointment = db.relationship("Appointment", back_populates="queue_entry")

    def can_transition_to(self, new_status: QueueStatus) -> bool:
        return new_status in VALID_TRANSITIONS.get(self.status, [])

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "appointment_id": self.appointment_id,
            "service_date": self.service_date.isoformat(),
            "ticket_number": self.ticket_number,
            "status": self.status.value,
            "sequence": self.sequence,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
