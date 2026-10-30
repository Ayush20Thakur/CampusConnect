"""RequestTraceStep model."""

from __future__ import annotations
from datetime import datetime, timezone
from ..extensions import db
import json


class RequestTraceStep(db.Model):
    __tablename__ = "request_trace_steps"

    id = db.Column(db.Integer, primary_key=True)
    correlation_id = db.Column(db.String(64), nullable=False, index=True)
    sequence = db.Column(db.Integer, nullable=False)
    service_name = db.Column(db.String(80), nullable=False)
    operation = db.Column(db.String(120), nullable=False)
    outcome = db.Column(db.String(40), nullable=False)  # OK | ERROR | SKIPPED
    duration_ms = db.Column(db.Integer, nullable=True)
    safe_metadata = db.Column(db.Text, nullable=True)  # JSON string
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def to_dict(self) -> dict:
        meta = {}
        if self.safe_metadata:
            try:
                meta = json.loads(self.safe_metadata)
            except Exception:
                meta = {}
        return {
            "id": self.id,
            "correlation_id": self.correlation_id,
            "sequence": self.sequence,
            "service_name": self.service_name,
            "operation": self.operation,
            "outcome": self.outcome,
            "duration_ms": self.duration_ms,
            "safe_metadata": meta,
            "created_at": self.created_at.isoformat(),
        }
