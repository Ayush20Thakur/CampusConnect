"""
Reporting Service.
Provides role-protected aggregate counts and chart datasets for admin.
"""

from __future__ import annotations

from datetime import datetime, timezone, timedelta

from sqlalchemy import func

from ..extensions import db
from ..models.appointment import Appointment, AppointmentStatus
from ..models.queue_entry import QueueEntry, QueueStatus
from ..models.service_type import ServiceType


def get_overview() -> dict:
    """Admin dashboard KPI data."""
    today = datetime.now(timezone.utc).date()
    today_start = datetime.combine(today, datetime.min.time())
    today_end = datetime.combine(today, datetime.max.time())

    appointments_today = Appointment.query.filter(
        Appointment.created_at >= today_start,
        Appointment.created_at <= today_end,
        Appointment.status == AppointmentStatus.CONFIRMED,
    ).count()

    upcoming = Appointment.query.filter_by(status=AppointmentStatus.CONFIRMED).count()
    cancellations = Appointment.query.filter_by(
        status=AppointmentStatus.CANCELLED
    ).count()

    active_queue = QueueEntry.query.filter(
        QueueEntry.status.in_(
            [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_SERVICE]
        )
    ).count()

    return {
        "appointments_today": appointments_today,
        "upcoming_bookings": upcoming,
        "cancellations": cancellations,
        "active_queue_entries": active_queue,
    }


def get_bookings_by_service_chart(days: int = 30) -> list[dict]:
    """Bookings per service type over the last N days."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.session.query(
            func.date(Appointment.created_at).label("date"),
            ServiceType.code,
            func.count(Appointment.id).label("count"),
        )
        .join(ServiceType, Appointment.service_type_id == ServiceType.id)
        .filter(Appointment.created_at >= since)
        .group_by(func.date(Appointment.created_at), ServiceType.code)
        .order_by(func.date(Appointment.created_at))
        .all()
    )
    return [
        {"date": str(r.date), "service": r.code.value, "count": r.count} for r in rows
    ]


def get_status_distribution() -> list[dict]:
    """Appointment status distribution."""
    rows = (
        db.session.query(Appointment.status, func.count(Appointment.id).label("count"))
        .group_by(Appointment.status)
        .all()
    )
    return [{"status": r.status.value, "count": r.count} for r in rows]
