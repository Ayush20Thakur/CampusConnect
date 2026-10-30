"""AvailabilitySlot model."""

from __future__ import annotations
import enum
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from ..extensions import db

if TYPE_CHECKING:
    from .appointment import Appointment


class SlotState(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BLOCKED = "BLOCKED"


class AvailabilitySlot(db.Model):
    __tablename__ = "availability_slots"

    id = db.Column(db.Integer, primary_key=True)
    provider_id = db.Column(
        db.Integer, db.ForeignKey("providers.id"), nullable=False, index=True
    )
    service_type_id = db.Column(
        db.Integer, db.ForeignKey("service_types.id"), nullable=False, index=True
    )
    start_at = db.Column(db.DateTime, nullable=False, index=True)
    end_at = db.Column(db.DateTime, nullable=False)
    state = db.Column(db.Enum(SlotState), nullable=False, default=SlotState.AVAILABLE)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    provider = db.relationship("Provider", back_populates="slots")
    service_type = db.relationship("ServiceType", back_populates="slots")
    appointments = db.relationship("Appointment", back_populates="slot")

    @property
    def appointment(self) -> Appointment | None:
        for a in self.appointments:
            status_val = a.status.value if hasattr(a.status, "value") else str(a.status)
            if status_val == "CONFIRMED":
                return a
        return None

    def to_dict(self) -> dict:
        appt = self.appointment
        is_booked = appt is not None
        return {
            "id": self.id,
            "provider_id": self.provider_id,
            "provider_name": self.provider.display_name if self.provider else None,
            "service_type_id": self.service_type_id,
            "service_type_code": self.service_type.code.value
            if self.service_type
            else None,
            "start_at": self.start_at.isoformat() + "Z",
            "end_at": self.end_at.isoformat() + "Z",
            "state": self.state.value,
            "is_booked": is_booked,
            "appointment_id": appt.public_id if is_booked else None,
        }
