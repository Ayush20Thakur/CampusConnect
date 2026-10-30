"""Queue API blueprint."""

from __future__ import annotations

from datetime import date, datetime, timezone

from flask import Blueprint, request, g

from ..extensions import db
from ..models.user import UserRole
from ..models.queue_entry import QueueStatus
from ..security.auth import require_auth, require_roles
from ..services.queue_service import (
    get_queue_entry_for_user,
    get_queue_for_date,
    call_next,
    transition_queue_status,
    count_ahead,
    QueueError,
)
from ..services.notification_service import create_notification, NotificationType
from ..services.audit_service import record_audit_event
from .helpers import success_response, error_response

bp = Blueprint("queue", __name__)


@bp.get("/clinic/queue/me")
@require_auth
def my_queue_entry():
    user = g.current_user
    entry = get_queue_entry_for_user(user.id)
    if not entry:
        return success_response(None)

    data = entry.to_dict()
    data["ahead"] = count_ahead(entry.id)
    return success_response(data)


@bp.get("/staff/clinic/queue")
@require_roles(UserRole.CLINIC_STAFF, UserRole.ADMIN)
def staff_queue():
    date_str = request.args.get("date")
    if date_str:
        try:
            service_date = date.fromisoformat(date_str)
        except ValueError:
            return error_response(
                "VALIDATION_ERROR", "Invalid date format. Use YYYY-MM-DD.", 400
            )
    else:
        service_date = datetime.now(timezone.utc).date()

    entries = get_queue_for_date(service_date)
    result = []
    for e in entries:
        d = e.to_dict()
        d["patient_name"] = (
            e.appointment.user.full_name
            if e.appointment and e.appointment.user
            else "Unknown"
        )
        result.append(d)
    return success_response(result)


@bp.post("/staff/clinic/queue/next")
@require_roles(UserRole.CLINIC_STAFF, UserRole.ADMIN)
def queue_call_next():
    user = g.current_user
    data = request.get_json(silent=True) or {}
    date_str = data.get("date")
    service_date = (
        date.fromisoformat(date_str) if date_str else datetime.now(timezone.utc).date()
    )

    entry = call_next(service_date)
    if not entry:
        return success_response(None, message="No waiting entries in the queue.")

    # Notify the patient
    if entry.appointment and entry.appointment.user_id:
        create_notification(
            entry.appointment.user_id,
            "You're being called!",
            f"Your clinic ticket {entry.ticket_number} has been called. Please proceed to the clinic.",
            NotificationType.QUEUE_STATUS_CHANGE,
            appointment_id=entry.appointment_id,
        )

    record_audit_event(
        "QUEUE_CALLED_NEXT",
        "SUCCESS",
        actor_user_id=user.id,
        entity_type="QueueEntry",
        entity_id=entry.id,
        safe_metadata={"ticket": entry.ticket_number},
    )
    db.session.commit()
    return success_response(entry.to_dict())


@bp.post("/staff/clinic/queue/<int:entry_id>/status")
@require_roles(UserRole.CLINIC_STAFF, UserRole.ADMIN)
def update_queue_status(entry_id: int):
    user = g.current_user
    data = request.get_json(silent=True) or {}
    new_status_str = (data.get("status") or "").upper()

    try:
        new_status = QueueStatus(new_status_str)
    except ValueError:
        return error_response(
            "VALIDATION_ERROR", f"Invalid queue status: {new_status_str}", 400
        )

    try:
        entry = transition_queue_status(entry_id, new_status)
        record_audit_event(
            "QUEUE_STATUS_UPDATED",
            "SUCCESS",
            actor_user_id=user.id,
            entity_type="QueueEntry",
            entity_id=entry_id,
            safe_metadata={"new_status": new_status_str, "ticket": entry.ticket_number},
        )
        db.session.commit()
        return success_response(entry.to_dict())
    except QueueError as e:
        db.session.rollback()
        return error_response(e.code, str(e), e.status_code)
