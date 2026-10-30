"""Admin API blueprint — overview, audit, traces, services, policies, health."""

from __future__ import annotations

from flask import Blueprint, request

from ..extensions import db
from ..models.user import UserRole
from ..models.audit_event import AuditEvent
from ..models.request_trace_step import RequestTraceStep
from ..models.service_metadata import ServiceMetadata
from ..security.auth import require_roles
from ..services.reporting_service import (
    get_overview,
    get_bookings_by_service_chart,
    get_status_distribution,
)
from .helpers import success_response

bp = Blueprint("admin", __name__)

# Service-specific policies — single source of truth
SERVICE_POLICIES = {
    "CLINIC": {
        "service_type": "CLINIC",
        "provider_type": "Medical Staff",
        "default_duration_minutes": 30,
        "cancellation_cutoff_hours": 2,
        "creates_queue_entry": True,
        "notifications": [
            "BOOKING_CONFIRMED",
            "BOOKING_CANCELLED",
            "QUEUE_STATUS_CHANGE",
        ],
        "allowed_roles": ["STUDENT"],
        "queue_enabled": True,
        "reschedule_allowed": True,
    },
    "ADVISING": {
        "service_type": "ADVISING",
        "provider_type": "Academic Adviser",
        "default_duration_minutes": 45,
        "cancellation_cutoff_hours": 4,
        "creates_queue_entry": False,
        "notifications": [
            "BOOKING_CONFIRMED",
            "BOOKING_CANCELLED",
            "BOOKING_RESCHEDULED",
        ],
        "allowed_roles": ["STUDENT"],
        "queue_enabled": False,
        "reschedule_allowed": True,
    },
}

# Static API contract definitions (reflects actual implemented routes)
API_CONTRACTS = [
    {
        "service": "Identity & Role Service",
        "method": "POST",
        "route": "/api/v1/auth/login",
        "purpose": "Authenticate user and start session",
        "request_schema": {"email": "string", "password": "string"},
        "response_example": {
            "success": True,
            "data": {"id": 1, "full_name": "...", "role": "STUDENT"},
        },
        "status_codes": [200, 400, 401, 403],
        "roles": ["PUBLIC"],
    },
    {
        "service": "Identity & Role Service",
        "method": "POST",
        "route": "/api/v1/auth/logout",
        "purpose": "Invalidate session",
        "request_schema": {},
        "response_example": {"success": True, "message": "Logged out successfully."},
        "status_codes": [200, 401],
        "roles": ["AUTHENTICATED"],
    },
    {
        "service": "Identity & Role Service",
        "method": "GET",
        "route": "/api/v1/auth/me",
        "purpose": "Get current authenticated user",
        "request_schema": {},
        "response_example": {"success": True, "data": {"id": 1, "role": "STUDENT"}},
        "status_codes": [200, 401],
        "roles": ["AUTHENTICATED"],
    },
    {
        "service": "Service Catalogue",
        "method": "GET",
        "route": "/api/v1/catalog/services",
        "purpose": "List all active service types",
        "request_schema": {},
        "response_example": {
            "success": True,
            "data": [{"code": "CLINIC", "display_name": "Campus Clinic"}],
        },
        "status_codes": [200],
        "roles": ["PUBLIC"],
    },
    {
        "service": "Service Catalogue",
        "method": "GET",
        "route": "/api/v1/catalog/providers",
        "purpose": "List providers, optionally filtered by service_type",
        "request_schema": {"service_type": "string (query param, optional)"},
        "response_example": {
            "success": True,
            "data": [{"id": 1, "display_name": "Dr. Smith"}],
        },
        "status_codes": [200],
        "roles": ["PUBLIC"],
    },
    {
        "service": "Availability & Scheduling",
        "method": "GET",
        "route": "/api/v1/availability",
        "purpose": "Get available slots for booking",
        "request_schema": {
            "service_type": "string",
            "provider_id": "int",
            "from": "ISO date",
            "to": "ISO date",
        },
        "response_example": {
            "success": True,
            "data": [{"id": 5, "start_at": "2025-11-01T09:00:00Z"}],
        },
        "status_codes": [200, 401],
        "roles": ["AUTHENTICATED"],
    },
    {
        "service": "Appointment Management",
        "method": "POST",
        "route": "/api/v1/appointments",
        "purpose": "Create an appointment (clinic or advising)",
        "request_schema": {
            "service_type": "CLINIC|ADVISING",
            "slot_id": "int",
            "provider_id": "int",
            "request_id": "string (optional)",
            "notes": "string (optional)",
        },
        "response_example": {
            "success": True,
            "data": {"id": "uuid", "status": "CONFIRMED"},
        },
        "status_codes": [201, 400, 401, 409],
        "roles": ["STUDENT", "ADMIN"],
    },
    {
        "service": "Appointment Management",
        "method": "GET",
        "route": "/api/v1/appointments/me",
        "purpose": "Get current user's appointments",
        "request_schema": {"status": "string (query param, optional)"},
        "response_example": {
            "success": True,
            "data": [{"id": "uuid", "status": "CONFIRMED"}],
        },
        "status_codes": [200, 401],
        "roles": ["AUTHENTICATED"],
    },
    {
        "service": "Appointment Management",
        "method": "POST",
        "route": "/api/v1/appointments/{id}/cancel",
        "purpose": "Cancel a confirmed appointment",
        "request_schema": {"reason": "string (optional)"},
        "response_example": {
            "success": True,
            "data": {"id": "uuid", "status": "CANCELLED"},
        },
        "status_codes": [200, 401, 403, 404, 409],
        "roles": ["STUDENT", "CLINIC_STAFF", "ADVISER", "ADMIN"],
    },
    {
        "service": "Appointment Management",
        "method": "POST",
        "route": "/api/v1/appointments/{id}/reschedule",
        "purpose": "Reschedule to a new slot",
        "request_schema": {"new_slot_id": "int"},
        "response_example": {
            "success": True,
            "data": {"id": "uuid", "status": "CONFIRMED"},
        },
        "status_codes": [200, 400, 401, 403, 404, 409],
        "roles": ["STUDENT", "ADMIN"],
    },
    {
        "service": "Clinic Queue",
        "method": "GET",
        "route": "/api/v1/clinic/queue/me",
        "purpose": "Get current student's queue entry",
        "request_schema": {},
        "response_example": {
            "success": True,
            "data": {"ticket_number": "Q001", "status": "WAITING", "ahead": 2},
        },
        "status_codes": [200, 401],
        "roles": ["STUDENT"],
    },
    {
        "service": "Clinic Queue",
        "method": "GET",
        "route": "/api/v1/staff/clinic/queue",
        "purpose": "Get full queue for a service date",
        "request_schema": {"date": "YYYY-MM-DD (query param, optional)"},
        "response_example": {
            "success": True,
            "data": [{"ticket_number": "Q001", "status": "WAITING"}],
        },
        "status_codes": [200, 401, 403],
        "roles": ["CLINIC_STAFF", "ADMIN"],
    },
    {
        "service": "Clinic Queue",
        "method": "POST",
        "route": "/api/v1/staff/clinic/queue/next",
        "purpose": "Call the next waiting patient",
        "request_schema": {"date": "YYYY-MM-DD (optional)"},
        "response_example": {
            "success": True,
            "data": {"ticket_number": "Q001", "status": "CALLED"},
        },
        "status_codes": [200, 401, 403],
        "roles": ["CLINIC_STAFF", "ADMIN"],
    },
    {
        "service": "Notification",
        "method": "GET",
        "route": "/api/v1/notifications/me",
        "purpose": "List user notifications",
        "request_schema": {},
        "response_example": {
            "success": True,
            "data": {"notifications": [], "unread_count": 0},
        },
        "status_codes": [200, 401],
        "roles": ["AUTHENTICATED"],
    },
    {
        "service": "Admin & Reporting",
        "method": "GET",
        "route": "/api/v1/admin/overview",
        "purpose": "KPI summary for admin dashboard",
        "request_schema": {},
        "response_example": {"success": True, "data": {"appointments_today": 5}},
        "status_codes": [200, 401, 403],
        "roles": ["ADMIN"],
    },
]


@bp.get("/overview")
@require_roles(UserRole.ADMIN)
def overview():
    data = get_overview()
    return success_response(data)


@bp.get("/charts/bookings")
@require_roles(UserRole.ADMIN)
def bookings_chart():
    days = request.args.get("days", 30, type=int)
    data = get_bookings_by_service_chart(days)
    return success_response(data)


@bp.get("/charts/status-distribution")
@require_roles(UserRole.ADMIN)
def status_distribution():
    data = get_status_distribution()
    return success_response(data)


@bp.get("/audit-events")
@require_roles(UserRole.ADMIN)
def audit_events():
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)
    events = AuditEvent.query.order_by(AuditEvent.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    return success_response(
        {
            "events": [e.to_dict() for e in events.items],
            "total": events.total,
            "page": page,
            "pages": events.pages,
        }
    )


@bp.get("/traces")
@require_roles(UserRole.ADMIN)
def traces():
    """List unique correlation IDs with their trace steps."""
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 50)
    cid_filter = request.args.get("correlation_id")

    if cid_filter:
        steps = (
            RequestTraceStep.query.filter_by(correlation_id=cid_filter)
            .order_by(RequestTraceStep.sequence)
            .all()
        )
        return success_response(
            {"steps": [s.to_dict() for s in steps], "correlation_id": cid_filter}
        )

    # List unique correlation IDs
    from ..extensions import db
    from sqlalchemy import func

    subq = (
        db.session.query(
            RequestTraceStep.correlation_id,
            func.count(RequestTraceStep.id).label("step_count"),
            func.min(RequestTraceStep.created_at).label("started_at"),
            func.max(RequestTraceStep.created_at).label("last_at"),
        )
        .group_by(RequestTraceStep.correlation_id)
        .order_by(func.min(RequestTraceStep.created_at).desc())
    )
    total = subq.count()
    rows = subq.offset((page - 1) * per_page).limit(per_page).all()
    return success_response(
        {
            "traces": [
                {
                    "correlation_id": r.correlation_id,
                    "step_count": r.step_count,
                    "started_at": r.started_at.isoformat() if r.started_at else None,
                    "last_at": r.last_at.isoformat() if r.last_at else None,
                }
                for r in rows
            ],
            "total": total,
            "page": page,
        }
    )


@bp.get("/services")
@require_roles(UserRole.ADMIN)
def service_registry():
    services = ServiceMetadata.query.filter_by(active=True).all()
    result = []
    for svc in services:
        d = svc.to_dict()
        # Local health check
        try:
            db.session.execute(db.text("SELECT 1"))
            d["health_status"] = "healthy"
        except Exception:
            d["health_status"] = "unhealthy"
        d["last_checked"] = __import__("datetime").datetime.utcnow().isoformat() + "Z"
        result.append(d)
    return success_response(result)


@bp.get("/policies")
@require_roles(UserRole.ADMIN)
def policies():
    return success_response(SERVICE_POLICIES)


@bp.get("/contracts")
@require_roles(UserRole.ADMIN)
def contracts():
    service_filter = request.args.get("service")
    contracts = API_CONTRACTS
    if service_filter:
        contracts = [
            c for c in contracts if service_filter.lower() in c["service"].lower()
        ]
    return success_response(contracts)


@bp.get("/health")
@require_roles(UserRole.ADMIN)
def admin_health():
    checks = {}
    services = [
        "Identity & Role",
        "Appointment Management",
        "Clinic Queue",
        "Notification",
        "Audit & Trace",
        "Availability",
    ]
    for svc in services:
        try:
            db.session.execute(db.text("SELECT 1"))
            checks[svc] = {
                "status": "healthy",
                "note": "Database reachable (single-process module)",
            }
        except Exception as e:
            checks[svc] = {"status": "unhealthy", "note": str(e)}
    return success_response(checks)
