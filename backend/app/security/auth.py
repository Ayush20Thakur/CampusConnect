"""Security / Identity & Role Service."""

from __future__ import annotations

import logging
from functools import wraps
from typing import Callable

from flask import session, jsonify, g

from ..extensions import db
from ..models.user import User, UserRole

logger = logging.getLogger(__name__)


def get_current_user() -> User | None:
    user_id = session.get("user_id")
    if not user_id:
        return None
    return db.session.get(User, user_id)


def login_user(user: User) -> None:
    session.permanent = True
    session["user_id"] = user.id
    session["user_role"] = user.role.value


def logout_user() -> None:
    session.clear()


def require_auth(f: Callable) -> Callable:
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user or not user.is_active:
            return jsonify(
                {
                    "success": False,
                    "error": {
                        "code": "UNAUTHORIZED",
                        "message": "Authentication required.",
                    },
                    "correlation_id": getattr(g, "correlation_id", None),
                }
            ), 401
        g.current_user = user
        return f(*args, **kwargs)

    return decorated


def require_roles(*roles: UserRole) -> Callable:
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            user: User = g.current_user
            if user.role not in roles:
                return jsonify(
                    {
                        "success": False,
                        "error": {
                            "code": "FORBIDDEN",
                            "message": "You do not have permission to access this resource.",
                        },
                        "correlation_id": getattr(g, "correlation_id", None),
                    }
                ), 403
            return f(*args, **kwargs)

        return decorated

    return decorator


# Role shorthand decorators
require_student = require_roles(
    UserRole.STUDENT, UserRole.CLINIC_STAFF, UserRole.ADVISER, UserRole.ADMIN
)
require_clinic_staff = require_roles(UserRole.CLINIC_STAFF, UserRole.ADMIN)
require_adviser = require_roles(UserRole.ADVISER, UserRole.ADMIN)
require_admin = require_roles(UserRole.ADMIN)
