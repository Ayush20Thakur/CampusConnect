"""Appointments API blueprint."""

from __future__ import annotations

import logging
from flask import Blueprint, request, g

from ..extensions import db
from ..models.user import UserRole
from ..models.service_type import ServiceCode
from ..security.auth import require_auth, require_roles
from ..services.appointment_service import (
    get_appointment_by_public_id,
    get_user_appointments,
    cancel_appointment,
    reschedule_appointment,
    update_appointment_status,
    AppointmentError,
    AppointmentStatus,
)
from ..adapters.clinic_adapter import book_clinic_appointment
from ..adapters.advising_adapter import book_advising_appointment
from ..services.audit_service import record_audit_event
from ..services.notification_service import create_notification, NotificationType
from .helpers import success_response, error_response

logger = logging.getLogger(__name__)

bp = Blueprint("appointments", __name__)

# Demo fault lab state — in-memory, admin-only toggle
_fault_flags: dict[str, bool] = {
    "slot_conflict": False,
    "notification_failure": False,
    "duplicate_replay": False,
}


@bp.post("/appointments")
@require_auth
def create_appointment():
    user = g.current_user
    data = request.get_json(silent=True) or {}

    service_type_code = (data.get("service_type") or "").upper()
    slot_id = data.get("slot_id")
    provider_id = data.get("provider_id")
    request_id = data.get("request_id")
    notes = data.get("notes")

    if not service_type_code or not slot_id or not provider_id:
        return error_response(
            "VALIDATION_ERROR",
            "service_type, slot_id, and provider_id are required.",
            400,
        )

    try:
        slot_id = int(slot_id)
        provider_id = int(provider_id)
    except (TypeError, ValueError):
        return error_response(
            "VALIDATION_ERROR", "slot_id and provider_id must be integers.", 400
        )

    simulate_conflict = _fault_flags.get("slot_conflict", False)
    simulate_notif_fail = _fault_flags.get("notification_failure", False)

    try:
        if service_type_code == ServiceCode.CLINIC.value:
            appointment = book_clinic_appointment(
                user.id,
                slot_id,
                provider_id,
                request_id=request_id,
                notes=notes,
                _simulate_slot_conflict=simulate_conflict,
                _simulate_notification_failure=simulate_notif_fail,
            )
        elif service_type_code == ServiceCode.ADVISING.value:
            appointment = book_advising_appointment(
                user.id,
                slot_id,
                provider_id,
                request_id=request_id,
                notes=notes,
                _simulate_slot_conflict=simulate_conflict,
                _simulate_notification_failure=simulate_notif_fail,
            )
        else:
            return error_response(
                "INVALID_SERVICE_TYPE",
                f"Unknown service type: {service_type_code}",
                400,
            )

        db.session.commit()
        return success_response(appointment.to_dict(), 201)

    except AppointmentError as e:
        db.session.rollback()
        return error_response(e.code, str(e), e.status_code)
    except Exception as e:
        logger.exception("Error in create_appointment: %s", e)
        db.session.rollback()
        return error_response(
            "INTERNAL_ERROR", "An unexpected error occurred. Please try again.", 500
        )


@bp.get("/appointments/me")
@require_auth
def my_appointments():
    user = g.current_user
    status_filter = request.args.get("status")
    appointments = get_user_appointments(user.id, status=status_filter)
    return success_response([a.to_dict() for a in appointments])


@bp.get("/appointments/<public_id>")
@require_auth
def get_appointment(public_id: str):
    user = g.current_user
    appt = get_appointment_by_public_id(public_id)
    if not appt:
        return error_response("NOT_FOUND", "Appointment not found.", 404)

    # Ownership check — staff can view all
    if user.role == UserRole.STUDENT and appt.user_id != user.id:
        return error_response(
            "FORBIDDEN", "You do not have permission to view this appointment.", 403
        )

    return success_response(appt.to_dict())


@bp.post("/appointments/<public_id>/cancel")
@require_auth
def cancel(public_id: str):
    user = g.current_user
    data = request.get_json(silent=True) or {}
    reason = data.get("reason")
    allow_staff = user.role in (UserRole.CLINIC_STAFF, UserRole.ADVISER, UserRole.ADMIN)

    try:
        appt = cancel_appointment(public_id, user.id, reason, allow_staff=allow_staff)
        create_notification(
            appt.user_id,
            "Appointment cancelled",
            f"Your appointment scheduled for {appt.slot.start_at.strftime('%B %d at %H:%M UTC')} has been cancelled.",
            NotificationType.BOOKING_CANCELLED,
            appointment_id=appt.id,
        )
        record_audit_event(
            "APPOINTMENT_CANCELLED",
            "SUCCESS",
            actor_user_id=user.id,
            entity_type="Appointment",
            entity_id=appt.public_id,
            safe_metadata={"reason": reason},
        )
        db.session.commit()
        return success_response(appt.to_dict(), message="Appointment cancelled.")
    except AppointmentError as e:
        db.session.rollback()
        return error_response(e.code, str(e), e.status_code)


@bp.post("/appointments/<public_id>/reschedule")
@require_auth
def reschedule(public_id: str):
    user = g.current_user
    data = request.get_json(silent=True) or {}
    new_slot_id = data.get("new_slot_id")

    if not new_slot_id:
        return error_response("VALIDATION_ERROR", "new_slot_id is required.", 400)

    try:
        new_slot_id = int(new_slot_id)
    except (TypeError, ValueError):
        return error_response(
            "VALIDATION_ERROR", "new_slot_id must be an integer.", 400
        )

    try:
        appt = reschedule_appointment(public_id, new_slot_id, user.id)
        create_notification(
            appt.user_id,
            "Appointment rescheduled",
            f"Your appointment has been rescheduled to {appt.slot.start_at.strftime('%B %d at %H:%M UTC')}.",
            NotificationType.BOOKING_RESCHEDULED,
            appointment_id=appt.id,
        )
        record_audit_event(
            "APPOINTMENT_RESCHEDULED",
            "SUCCESS",
            actor_user_id=user.id,
            entity_type="Appointment",
            entity_id=appt.public_id,
            safe_metadata={"new_slot_id": new_slot_id},
        )
        db.session.commit()
        return success_response(appt.to_dict(), message="Appointment rescheduled.")
    except AppointmentError as e:
        db.session.rollback()
        return error_response(e.code, str(e), e.status_code)


# Staff endpoints
@bp.get("/staff/advising/appointments")
@require_roles(UserRole.ADVISER, UserRole.ADMIN)
def staff_advising_appointments():
    from ..models.appointment import Appointment
    from ..models.service_type import ServiceCode

    user = g.current_user
    query = Appointment.query.join(Appointment.service_type).filter_by(
        code=ServiceCode.ADVISING
    )
    if user.role == UserRole.ADVISER:
        # Only show appointments with their provider
        from ..models.provider import Provider

        my_provider = Provider.query.filter_by(user_id=user.id).first()
        if my_provider:
            query = query.filter(Appointment.provider_id == my_provider.id)
        else:
            return success_response([])

    appointments = query.order_by(Appointment.created_at.desc()).limit(100).all()
    return success_response([a.to_dict() for a in appointments])


@bp.post("/staff/advising/appointments/<public_id>/status")
@require_roles(UserRole.ADVISER, UserRole.ADMIN)
def update_advising_status(public_id: str):
    user = g.current_user
    data = request.get_json(silent=True) or {}
    new_status_str = (data.get("status") or "").upper()
    outcome_notes = data.get("outcome_notes")

    try:
        new_status = AppointmentStatus(new_status_str)
    except ValueError:
        return error_response(
            "VALIDATION_ERROR", f"Invalid status: {new_status_str}", 400
        )

    try:
        appt = update_appointment_status(
            public_id,
            new_status,
            user.id,
            allow_staff=True,
            outcome_notes=outcome_notes,
        )
        record_audit_event(
            "APPOINTMENT_STATUS_UPDATED",
            "SUCCESS",
            actor_user_id=user.id,
            entity_type="Appointment",
            entity_id=appt.public_id,
            safe_metadata={
                "new_status": new_status_str,
                "has_outcome_notes": bool(outcome_notes),
            },
        )
        db.session.commit()
        return success_response(appt.to_dict())
    except AppointmentError as e:
        db.session.rollback()
        return error_response(e.code, str(e), e.status_code)


# Fault lab endpoints (admin only)
@bp.get("/admin/fault-lab/flags")
@require_roles(UserRole.ADMIN)
def get_fault_flags():
    return success_response(_fault_flags)


@bp.post("/admin/fault-lab/flags")
@require_roles(UserRole.ADMIN)
def set_fault_flags():
    data = request.get_json(silent=True) or {}
    for key in _fault_flags:
        if key in data:
            _fault_flags[key] = bool(data[key])
    record_audit_event(
        "FAULT_LAB_CONFIGURED",
        "SIMULATED",
        actor_user_id=g.current_user.id,
        safe_metadata={"flags": _fault_flags},
    )
    db.session.commit()
    return success_response(_fault_flags)
