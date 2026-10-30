"""Notifications API blueprint."""

from flask import Blueprint, g

from ..extensions import db
from ..security.auth import require_auth
from ..services.notification_service import (
    get_user_notifications,
    mark_notification_read,
    mark_all_read,
    unread_count,
)
from .helpers import success_response, error_response

bp = Blueprint("notifications", __name__)


@bp.get("/notifications/me")
@require_auth
def my_notifications():
    user = g.current_user
    notifs = get_user_notifications(user.id)
    return success_response(
        {
            "notifications": [n.to_dict() for n in notifs],
            "unread_count": unread_count(user.id),
        }
    )


@bp.post("/notifications/<int:notification_id>/read")
@require_auth
def mark_read(notification_id: int):
    user = g.current_user
    notif = mark_notification_read(notification_id, user.id)
    if not notif:
        return error_response("NOT_FOUND", "Notification not found.", 404)
    db.session.commit()
    return success_response(notif.to_dict())


@bp.post("/notifications/read-all")
@require_auth
def read_all():
    user = g.current_user
    count = mark_all_read(user.id)
    db.session.commit()
    return success_response({"marked_read": count})
