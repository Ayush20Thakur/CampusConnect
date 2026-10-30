"""
Notification Service.
Creates, lists, and marks notification records. Failures are isolated
and never roll back committed appointments.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..extensions import db
from ..models.notification import Notification, NotificationType

logger = logging.getLogger(__name__)


def create_notification(
    user_id: int,
    title: str,
    message: str,
    notification_type: NotificationType = NotificationType.SYSTEM,
    appointment_id: int | None = None,
    *,
    _simulate_failure: bool = False,
) -> Notification | None:
    """
    Create a notification record.
    Returns None on failure — callers must NOT roll back on None.
    """
    if _simulate_failure:
        logger.warning("SIMULATED notification failure for user %s", user_id)
        return None
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            appointment_id=appointment_id,
        )
        db.session.add(notif)
        db.session.flush()
        return notif
    except Exception as exc:
        logger.error("Notification creation failed (non-fatal): %s", exc)
        return None


def get_user_notifications(user_id: int, *, limit: int = 50) -> list[Notification]:
    return (
        Notification.query.filter_by(user_id=user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )


def mark_notification_read(notification_id: int, user_id: int) -> Notification | None:
    notif = Notification.query.filter_by(id=notification_id, user_id=user_id).first()
    if notif and not notif.read_at:
        notif.read_at = datetime.now(timezone.utc)
        db.session.flush()
    return notif


def mark_all_read(user_id: int) -> int:
    now = datetime.now(timezone.utc)
    count = (
        Notification.query.filter_by(user_id=user_id)
        .filter(Notification.read_at.is_(None))
        .update({"read_at": now})
    )
    db.session.flush()
    return count


def unread_count(user_id: int) -> int:
    return (
        Notification.query.filter_by(user_id=user_id)
        .filter(Notification.read_at.is_(None))
        .count()
    )
