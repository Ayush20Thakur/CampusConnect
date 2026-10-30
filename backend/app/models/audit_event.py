"""AuditEvent model."""

from __future__ import annotations
from datetime import datetime, timezone
from ..extensions import db
import json


class AuditEvent(db.Model):
    __tablename__ = "audit_events"

    id = db.Column(db.Integer, primary_key=True)
    actor_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    event_type = db.Column(db.String(80), nullable=False, index=True)
    entity_type = db.Column(db.String(80), nullable=True)
    entity_id = db.Column(db.String(80), nullable=True)
    outcome = db.Column(db.String(40), nullable=False)  # SUCCESS | FAILURE | SIMULATED
    safe_metadata = db.Column(db.Text, nullable=True)  # JSON string
    correlation_id = db.Column(db.String(64), nullable=True, index=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    actor = db.relationship("User", foreign_keys=[actor_user_id])

    def to_dict(self) -> dict:
        meta = {}
        if self.safe_metadata:
            try:
                meta = json.loads(self.safe_metadata)
            except Exception:
                meta = {}
        return {
            "id": self.id,
            "actor_user_id": self.actor_user_id,
            "actor_name": self.actor.full_name if self.actor else "System",
            "event_type": self.event_type,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "outcome": self.outcome,
            "safe_metadata": meta,
            "correlation_id": self.correlation_id,
            "created_at": self.created_at.isoformat(),
        }
