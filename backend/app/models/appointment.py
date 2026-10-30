"""Appointment model."""

from __future__ import annotations
import enum
import uuid
from datetime import datetime, timezone
from ..extensions import db


class AppointmentStatus(str, enum.Enum):
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"


class Appointment(db.Model):
    __tablename__ = "appointments"

    id = db.Column(db.Integer, primary_key=True)
    public_id = db.Column(
        db.String(36), nullable=False, unique=True, default=lambda: str(uuid.uuid4())
    )
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    provider_id = db.Column(db.Integer, db.ForeignKey("providers.id"), nullable=False)
    service_type_id = db.Column(
        db.Integer, db.ForeignKey("service_types.id"), nullable=False
    )
    slot_id = db.Column(
        db.Integer, db.ForeignKey("availability_slots.id"), nullable=False
    )
    status = db.Column(
        db.Enum(AppointmentStatus), nullable=False, default=AppointmentStatus.CONFIRMED
    )
    # Idempotency key scoped per user
    request_id = db.Column(db.String(64), nullable=True, index=True)
    notes = db.Column(db.Text, nullable=True)
    outcome_notes = db.Column(db.Text, nullable=True)
    cancellation_reason = db.Column(db.String(500), nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Unique constraint: only one CONFIRMED booking per slot
    __table_args__ = (
        db.Index(
            "uq_confirmed_appointment_slot",
            "slot_id",
            unique=True,
            sqlite_where=(db.column("status") == "CONFIRMED"),
        ),
    )

    user = db.relationship("User", back_populates="appointments")
    provider = db.relationship("Provider", back_populates="appointments")
    service_type = db.relationship("ServiceType", back_populates="appointments")
    slot = db.relationship("AvailabilitySlot", back_populates="appointments")
    queue_entry = db.relationship(
        "QueueEntry", back_populates="appointment", uselist=False
    )
    notifications = db.relationship(
        "Notification", back_populates="appointment", lazy="dynamic"
    )

    def to_dict(self) -> dict:
        result = {
            "id": self.public_id,
            "internal_id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else None,
            "provider_id": self.provider_id,
            "provider_name": self.provider.display_name if self.provider else None,
            "service_type_id": self.service_type_id,
            "service_type_code": self.service_type.code.value
            if self.service_type
            else None,
            "service_type_name": self.service_type.display_name
            if self.service_type
            else None,
            "slot_id": self.slot_id,
            "start_at": self.slot.start_at.isoformat() + "Z" if self.slot else None,
            "end_at": self.slot.end_at.isoformat() + "Z" if self.slot else None,
            "status": self.status.value,
            "notes": self.notes,
            "outcome_notes": self.outcome_notes,
            "cancellation_reason": self.cancellation_reason,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        if self.queue_entry:
            result["queue_entry"] = self.queue_entry.to_dict()
        return result
