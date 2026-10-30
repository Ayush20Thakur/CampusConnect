"""Notification model."""

from __future__ import annotations
import enum
from datetime import datetime, timezone
from ..extensions import db


class NotificationType(str, enum.Enum):
    BOOKING_CONFIRMED = "BOOKING_CONFIRMED"
    BOOKING_CANCELLED = "BOOKING_CANCELLED"
    BOOKING_RESCHEDULED = "BOOKING_RESCHEDULED"
    QUEUE_STATUS_CHANGE = "QUEUE_STATUS_CHANGE"
    SYSTEM = "SYSTEM"


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False, index=True
    )
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(
        db.Enum(NotificationType), nullable=False, default=NotificationType.SYSTEM
    )
    read_at = db.Column(db.DateTime, nullable=True)
    appointment_id = db.Column(
        db.Integer, db.ForeignKey("appointments.id"), nullable=True
    )
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    user = db.relationship("User", back_populates="notifications")
    appointment = db.relationship("Appointment", back_populates="notifications")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.type.value,
            "read": self.read_at is not None,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "appointment_id": self.appointment.public_id if self.appointment else None,
            "created_at": self.created_at.isoformat(),
        }
