"""Auth API blueprint."""

from __future__ import annotations

from flask import Blueprint, request, g

from ..extensions import db
from ..models.user import User
from ..security.auth import login_user, logout_user, require_auth
from ..services.audit_service import record_audit_event
from .helpers import success_response, error_response

bp = Blueprint("auth", __name__)


@bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return error_response(
            "VALIDATION_ERROR", "Email and password are required.", 400
        )

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        record_audit_event(
            "LOGIN_FAILED",
            "FAILURE",
            safe_metadata={"email": email},
        )
        return error_response("INVALID_CREDENTIALS", "Invalid email or password.", 401)

    if not user.is_active:
        return error_response(
            "ACCOUNT_DISABLED", "This account has been disabled.", 403
        )

    login_user(user)
    record_audit_event(
        "LOGIN_SUCCESS",
        "SUCCESS",
        actor_user_id=user.id,
        entity_type="User",
        entity_id=user.id,
    )
    db.session.commit()
    return success_response(user.to_dict(), 200, "Login successful.")


@bp.post("/logout")
@require_auth
def logout():
    user = g.current_user
    logout_user()
    record_audit_event(
        "LOGOUT",
        "SUCCESS",
        actor_user_id=user.id,
        entity_type="User",
        entity_id=user.id,
    )
    db.session.commit()
    return success_response(message="Logged out successfully.")


@bp.get("/me")
@require_auth
def me():
    user = g.current_user
    return success_response(user.to_dict())
