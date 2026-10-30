"""
Audit & Request Trace Service.
Records significant state changes and request steps linked by correlation ID.
Sensitive values (passwords, cookies, PII) are never logged here.
"""

from __future__ import annotations

import json
import logging
import time
from contextlib import contextmanager
from typing import Any, Generator

from flask import g

from ..extensions import db
from ..models.audit_event import AuditEvent
from ..models.request_trace_step import RequestTraceStep

logger = logging.getLogger(__name__)


def record_audit_event(
    event_type: str,
    outcome: str,
    *,
    actor_user_id: int | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    safe_metadata: dict[str, Any] | None = None,
    correlation_id: str | None = None,
) -> AuditEvent:
    """Create and persist an audit event. Never include passwords or cookies."""
    cid = correlation_id or getattr(g, "correlation_id", None)
    event = AuditEvent(
        actor_user_id=actor_user_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        outcome=outcome,
        safe_metadata=json.dumps(safe_metadata or {}),
        correlation_id=cid,
    )
    db.session.add(event)
    # Flush so the event is visible in the same transaction; caller commits.
    try:
        db.session.flush()
    except Exception as exc:
        logger.warning("Audit flush failed (non-fatal): %s", exc)
    return event


def record_trace_step(
    service_name: str,
    operation: str,
    outcome: str,
    *,
    correlation_id: str | None = None,
    sequence: int = 0,
    duration_ms: int | None = None,
    safe_metadata: dict[str, Any] | None = None,
) -> RequestTraceStep:
    """Append a trace step for the current request."""
    cid = correlation_id or getattr(g, "correlation_id", None)
    step = RequestTraceStep(
        correlation_id=cid,
        sequence=sequence,
        service_name=service_name,
        operation=operation,
        outcome=outcome,
        duration_ms=duration_ms,
        safe_metadata=json.dumps(safe_metadata or {}),
    )
    try:
        db.session.add(step)
        db.session.flush()
    except Exception as exc:
        logger.warning("Trace flush failed (non-fatal): %s", exc)
    return step


@contextmanager
def timed_trace_step(
    service_name: str,
    operation: str,
    sequence: int = 0,
    safe_metadata: dict[str, Any] | None = None,
) -> Generator[dict, None, None]:
    """Context manager that records a trace step with measured duration."""
    ctx: dict = {"outcome": "OK", "extra_meta": {}}
    start = time.monotonic()
    try:
        yield ctx
    except Exception as exc:
        ctx["outcome"] = "ERROR"
        ctx["extra_meta"]["error"] = str(exc)
        raise
    finally:
        elapsed = int((time.monotonic() - start) * 1000)
        meta = {**(safe_metadata or {}), **ctx.get("extra_meta", {})}
        record_trace_step(
            service_name,
            operation,
            ctx["outcome"],
            sequence=sequence,
            duration_ms=elapsed,
            safe_metadata=meta,
        )
