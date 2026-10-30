"""ServiceType model."""

from __future__ import annotations
import enum
from datetime import datetime, timezone
from ..extensions import db


class ServiceCode(str, enum.Enum):
    CLINIC = "CLINIC"
    ADVISING = "ADVISING"


class ServiceType(db.Model):
    __tablename__ = "service_types"

    id = db.Column(db.Integer, primary_key=True)
    code = db.Column(db.Enum(ServiceCode), nullable=False, unique=True)
    display_name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    active = db.Column(db.Boolean, nullable=False, default=True)
    # Policy fields stored as JSON-compatible columns
    default_duration_minutes = db.Column(db.Integer, nullable=False, default=30)
    cancellation_cutoff_hours = db.Column(db.Integer, nullable=False, default=2)
    creates_queue_entry = db.Column(db.Boolean, nullable=False, default=False)
    allowed_roles = db.Column(db.String(200), nullable=False, default="STUDENT")
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    providers = db.relationship(
        "Provider", back_populates="service_type", lazy="dynamic"
    )
    slots = db.relationship(
        "AvailabilitySlot", back_populates="service_type", lazy="dynamic"
    )
    appointments = db.relationship(
        "Appointment", back_populates="service_type", lazy="dynamic"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "code": self.code.value,
            "display_name": self.display_name,
            "description": self.description,
            "active": self.active,
            "default_duration_minutes": self.default_duration_minutes,
            "cancellation_cutoff_hours": self.cancellation_cutoff_hours,
            "creates_queue_entry": self.creates_queue_entry,
            "allowed_roles": self.allowed_roles.split(","),
        }
