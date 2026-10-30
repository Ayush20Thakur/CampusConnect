"""Availability API blueprint."""

from __future__ import annotations

from datetime import datetime

from flask import Blueprint, request, g

from ..extensions import db
from ..models.provider import Provider
from ..models.service_type import ServiceType
from ..models.availability_slot import AvailabilitySlot
from ..security.auth import require_auth
from ..security.auth import require_roles
from ..models.user import UserRole
from ..services.availability_service import (
    get_available_slots,
    create_slot,
    block_slot,
    unblock_slot,
    get_provider_slots,
    AvailabilityError,
)
from ..services.audit_service import record_audit_event
from .helpers import success_response, error_response

bp = Blueprint("availability", __name__)


@bp.get("/availability")
@require_auth
def list_availability():
    service_type_code = request.args.get("service_type")
    provider_id = request.args.get("provider_id", type=int)
    from_str = request.args.get("from")
    to_str = request.args.get("to")

    service_type_id = None
    if service_type_code:
        svc = ServiceType.query.filter_by(
            code=service_type_code.upper(), active=True
        ).first()
        if not svc:
            return error_response(
                "NOT_FOUND", f"Service type '{service_type_code}' not found.", 404
            )
        service_type_id = svc.id

    from_dt = datetime.fromisoformat(from_str) if from_str else None
    to_dt = datetime.fromisoformat(to_str) if to_str else None

    slots = get_available_slots(
        service_type_id=service_type_id,
        provider_id=provider_id,
        from_dt=from_dt,
        to_dt=to_dt,
    )
    return success_response([s.to_dict() for s in slots])


@bp.post("/admin/availability")
@require_roles(UserRole.CLINIC_STAFF, UserRole.ADVISER, UserRole.ADMIN)
def add_slot():
    user = g.current_user
    data = request.get_json(silent=True) or {}

    try:
        provider_id = int(data["provider_id"])
        start_at = datetime.fromisoformat(data["start_at"].replace("Z", "+00:00"))
        end_at = datetime.fromisoformat(data["end_at"].replace("Z", "+00:00"))
    except (KeyError, ValueError, TypeError) as e:
        return error_response(
            "VALIDATION_ERROR", f"Invalid or missing fields: {e}", 400
        )

    provider = db.session.get(Provider, provider_id)
    if not provider or not provider.is_active:
        return error_response("NOT_FOUND", "Provider not found or inactive.", 404)

    # Non-admin staff check
    if user.role == UserRole.ADVISER and provider.user_id != user.id:
        return error_response(
            "FORBIDDEN", "Advisers can only manage their own provider slots.", 403
        )
    elif user.role == UserRole.CLINIC_STAFF and (
        not provider.service_type or provider.service_type.code.value != "CLINIC"
    ):
        return error_response(
            "FORBIDDEN", "Clinic staff can only manage clinic provider slots.", 403
        )

    try:
        slot = create_slot(provider_id, provider.service_type_id, start_at, end_at)
        db.session.commit()
        record_audit_event(
            "SLOT_CREATED",
            "SUCCESS",
            actor_user_id=user.id,
            entity_type="AvailabilitySlot",
            entity_id=slot.id,
            safe_metadata={
                "provider_id": provider_id,
                "start_at": start_at.isoformat(),
            },
        )
        db.session.commit()
        return success_response(slot.to_dict(), 201)
    except AvailabilityError as e:
        return error_response(e.code, str(e), 409)


@bp.get("/staff/slots")
@require_roles(UserRole.CLINIC_STAFF, UserRole.ADVISER, UserRole.ADMIN)
def staff_slots():
    user = g.current_user
    provider_id = request.args.get("provider_id", type=int)

    if user.role in (UserRole.ADVISER, UserRole.CLINIC_STAFF) and not provider_id:
        p = Provider.query.filter_by(user_id=user.id).first()
        if p:
            provider_id = p.id
        elif user.role == UserRole.CLINIC_STAFF:
            # Fall back to first clinic provider
            clinic_p = (
                Provider.query.join(ServiceType)
                .filter(ServiceType.code == "CLINIC")
                .first()
            )
            if clinic_p:
                provider_id = clinic_p.id

    if not provider_id:
        return error_response(
            "VALIDATION_ERROR", "provider_id could not be resolved.", 400
        )

    from_str = request.args.get("from")
    to_str = request.args.get("to")
    from_dt = datetime.fromisoformat(from_str) if from_str else None
    to_dt = datetime.fromisoformat(to_str) if to_str else None

    slots = get_provider_slots(provider_id, from_dt=from_dt, to_dt=to_dt)
    return success_response([s.to_dict() for s in slots])


@bp.post("/admin/availability/<int:slot_id>/block")
@require_roles(UserRole.CLINIC_STAFF, UserRole.ADVISER, UserRole.ADMIN)
def block_slot_route(slot_id: int):
    user = g.current_user
    slot = db.session.get(AvailabilitySlot, slot_id)
    if not slot:
        return error_response("NOT_FOUND", "Slot not found.", 404)
    if user.role == UserRole.ADVISER and slot.provider.user_id != user.id:
        return error_response(
            "FORBIDDEN", "Advisers can only manage their own provider slots.", 403
        )
    try:
        slot = block_slot(slot_id)
        record_audit_event(
            "SLOT_BLOCKED",
            "SUCCESS",
            actor_user_id=user.id,
            entity_type="AvailabilitySlot",
            entity_id=slot_id,
        )
        db.session.commit()
        return success_response(slot.to_dict())
    except AvailabilityError as e:
        return error_response(e.code, str(e), 409)


@bp.post("/admin/availability/<int:slot_id>/unblock")
@require_roles(UserRole.CLINIC_STAFF, UserRole.ADVISER, UserRole.ADMIN)
def unblock_slot_route(slot_id: int):
    user = g.current_user
    slot = db.session.get(AvailabilitySlot, slot_id)
    if not slot:
        return error_response("NOT_FOUND", "Slot not found.", 404)
    if user.role == UserRole.ADVISER and slot.provider.user_id != user.id:
        return error_response(
            "FORBIDDEN", "Advisers can only manage their own provider slots.", 403
        )
    try:
        slot = unblock_slot(slot_id)
        record_audit_event(
            "SLOT_UNBLOCKED",
            "SUCCESS",
            actor_user_id=user.id,
            entity_type="AvailabilitySlot",
            entity_id=slot_id,
        )
        db.session.commit()
        return success_response(slot.to_dict())
    except AvailabilityError as e:
        return error_response(e.code, str(e), 409)
