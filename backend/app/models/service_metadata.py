"""ServiceMetadata model for SOA registry."""

from __future__ import annotations
from datetime import datetime, timezone
from ..extensions import db


class ServiceMetadata(db.Model):
    __tablename__ = "service_metadata"

    id = db.Column(db.Integer, primary_key=True)
    service_name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=True)
    version = db.Column(db.String(20), nullable=False, default="1.0.0")
    base_path = db.Column(db.String(200), nullable=True)
    owning_module = db.Column(db.String(100), nullable=True)
    health_check_description = db.Column(db.String(500), nullable=True)
    active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "service_name": self.service_name,
            "description": self.description,
            "version": self.version,
            "base_path": self.base_path,
            "owning_module": self.owning_module,
            "health_check_description": self.health_check_description,
            "active": self.active,
            "updated_at": self.updated_at.isoformat(),
        }
