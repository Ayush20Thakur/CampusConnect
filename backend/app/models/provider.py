"""Provider model."""

from __future__ import annotations
from datetime import datetime, timezone
from ..extensions import db


class Provider(db.Model):
    __tablename__ = "providers"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    display_name = db.Column(db.String(120), nullable=False)
    service_type_id = db.Column(
        db.Integer, db.ForeignKey("service_types.id"), nullable=False
    )
    location_label = db.Column(db.String(200), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    user = db.relationship("User", back_populates="provider")
    service_type = db.relationship("ServiceType", back_populates="providers")
    slots = db.relationship(
        "AvailabilitySlot", back_populates="provider", lazy="dynamic"
    )
    appointments = db.relationship(
        "Appointment", back_populates="provider", lazy="dynamic"
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "display_name": self.display_name,
            "service_type_id": self.service_type_id,
            "service_type_code": self.service_type.code.value
            if self.service_type
            else None,
            "service_type_name": self.service_type.display_name
            if self.service_type
            else None,
            "location_label": self.location_label,
            "is_active": self.is_active,
        }
