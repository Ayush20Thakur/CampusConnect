"""
Idempotent seed script for CampusConnect demo data.
Run with: flask seed-demo
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone

import click
from flask.cli import with_appcontext

from .extensions import db
from .models.user import User, UserRole
from .models.service_type import ServiceType, ServiceCode
from .models.provider import Provider
from .models.availability_slot import AvailabilitySlot, SlotState
from .models.appointment import Appointment, AppointmentStatus
from .models.queue_entry import QueueEntry, QueueStatus
from .models.notification import Notification, NotificationType
from .models.audit_event import AuditEvent
from .models.request_trace_step import RequestTraceStep
from .models.service_metadata import ServiceMetadata

logger = logging.getLogger(__name__)


def _get_or_create_user(email: str, **kwargs) -> User:
    user = User.query.filter_by(email=email).first()
    if user:
        return user
    user = User(email=email, **{k: v for k, v in kwargs.items() if k != "password"})
    user.set_password(kwargs.get("password", "demo1234"))
    db.session.add(user)
    db.session.flush()
    return user


def seed_users() -> dict[str, User]:
    users = {
        "admin": _get_or_create_user(
            "admin@campusconnect.edu",
            full_name="Alex Rivera",
            role=UserRole.ADMIN,
            password="admin1234",
        ),
        "clinic_staff": _get_or_create_user(
            "clinic.staff@campusconnect.edu",
            full_name="Dr. Sarah Chen",
            role=UserRole.CLINIC_STAFF,
            password="staff1234",
        ),
        "adviser1": _get_or_create_user(
            "j.morgan@campusconnect.edu",
            full_name="Prof. James Morgan",
            role=UserRole.ADVISER,
            password="adviser1234",
        ),
        "adviser2": _get_or_create_user(
            "m.patel@campusconnect.edu",
            full_name="Dr. Meena Patel",
            role=UserRole.ADVISER,
            password="adviser1234",
        ),
        "student1": _get_or_create_user(
            "alex.kim@students.edu",
            full_name="Alex Kim",
            role=UserRole.STUDENT,
            password="student1234",
        ),
        "student2": _get_or_create_user(
            "priya.sharma@students.edu",
            full_name="Priya Sharma",
            role=UserRole.STUDENT,
            password="student1234",
        ),
        "student3": _get_or_create_user(
            "jordan.lee@students.edu",
            full_name="Jordan Lee",
            role=UserRole.STUDENT,
            password="student1234",
        ),
    }
    logger.info("Seeded %d users.", len(users))
    return users


def seed_service_types() -> dict[str, ServiceType]:
    def _get_or_create(code: ServiceCode, **kwargs) -> ServiceType:
        svc = ServiceType.query.filter_by(code=code).first()
        if svc:
            return svc
        svc = ServiceType(code=code, **kwargs)
        db.session.add(svc)
        db.session.flush()
        return svc

    services = {
        "clinic": _get_or_create(
            ServiceCode.CLINIC,
            display_name="Campus Clinic",
            description="General medical consultations, health checks, and wellness services for students.",
            default_duration_minutes=30,
            cancellation_cutoff_hours=2,
            creates_queue_entry=True,
            allowed_roles="STUDENT,ADMIN",
        ),
        "advising": _get_or_create(
            ServiceCode.ADVISING,
            display_name="Academic Advising",
            description="One-on-one sessions with academic advisers for course planning, degree audits, and academic support.",
            default_duration_minutes=45,
            cancellation_cutoff_hours=4,
            creates_queue_entry=False,
            allowed_roles="STUDENT,ADMIN",
        ),
    }
    return services


def seed_providers(users: dict, services: dict) -> dict[str, Provider]:
    def _get_or_create(display_name: str, **kwargs) -> Provider:
        p = Provider.query.filter_by(display_name=display_name).first()
        if p:
            return p
        p = Provider(display_name=display_name, **kwargs)
        db.session.add(p)
        db.session.flush()
        return p

    providers = {
        "clinic_dr_chen": _get_or_create(
            "Dr. Sarah Chen",
            user_id=users["clinic_staff"].id,
            service_type_id=services["clinic"].id,
            location_label="Wellness Center, Room 101",
        ),
        "clinic_nurse": _get_or_create(
            "Nurse Jamie Torres",
            service_type_id=services["clinic"].id,
            location_label="Wellness Center, Room 103",
        ),
        "adviser_morgan": _get_or_create(
            "Prof. James Morgan",
            user_id=users["adviser1"].id,
            service_type_id=services["advising"].id,
            location_label="Arts Building, Office 214",
        ),
        "adviser_patel": _get_or_create(
            "Dr. Meena Patel",
            user_id=users["adviser2"].id,
            service_type_id=services["advising"].id,
            location_label="Science Hall, Office 307",
        ),
    }
    return providers


def seed_slots(providers: dict, services: dict) -> list[AvailabilitySlot]:
    """Create future slots over the next 14 days."""
    slots = []
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    base = now.replace(hour=8, minute=0, second=0, microsecond=0) + timedelta(days=1)

    clinic_provider_ids = [
        providers["clinic_dr_chen"].id,
        providers["clinic_nurse"].id,
    ]
    advising_provider_ids = [
        providers["adviser_morgan"].id,
        providers["adviser_patel"].id,
    ]

    for day_offset in range(0, 14):
        day = base + timedelta(days=day_offset)
        if day.weekday() >= 5:  # Skip weekends
            continue

        # Clinic slots: every 30 min from 09:00 to 12:00, two providers
        for provider_id in clinic_provider_ids:
            for hour in range(9, 12):
                for minute in [0, 30]:
                    start = day.replace(hour=hour, minute=minute)
                    end = start + timedelta(minutes=30)
                    existing = AvailabilitySlot.query.filter_by(
                        provider_id=provider_id, start_at=start
                    ).first()
                    if not existing:
                        slot = AvailabilitySlot(
                            provider_id=provider_id,
                            service_type_id=services["clinic"].id,
                            start_at=start,
                            end_at=end,
                            state=SlotState.AVAILABLE,
                        )
                        db.session.add(slot)
                        slots.append(slot)

        # Advising slots: every 45 min from 10:00 to 15:00
        for provider_id in advising_provider_ids:
            for start_hour, start_minute in [
                (10, 0),
                (10, 45),
                (11, 30),
                (13, 0),
                (13, 45),
                (14, 30),
            ]:
                start = day.replace(hour=start_hour, minute=start_minute)
                end = start + timedelta(minutes=45)
                existing = AvailabilitySlot.query.filter_by(
                    provider_id=provider_id, start_at=start
                ).first()
                if not existing:
                    slot = AvailabilitySlot(
                        provider_id=provider_id,
                        service_type_id=services["advising"].id,
                        start_at=start,
                        end_at=end,
                        state=SlotState.AVAILABLE,
                    )
                    db.session.add(slot)
                    slots.append(slot)

    db.session.flush()
    logger.info("Seeded %d slots.", len(slots))
    return slots


def seed_appointments_and_queue(users: dict, providers: dict, services: dict) -> None:
    """Create a mix of confirmed, completed, and cancelled appointments."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Helper: find first available slot for provider
    def first_available_slot(
        provider_id: int, service_type_id: int
    ) -> AvailabilitySlot | None:
        booked_ids = (
            db.session.query(Appointment.slot_id)
            .filter(Appointment.status == AppointmentStatus.CONFIRMED)
            .scalar_subquery()
        )
        return (
            AvailabilitySlot.query.filter_by(
                provider_id=provider_id,
                service_type_id=service_type_id,
                state=SlotState.AVAILABLE,
            )
            .filter(AvailabilitySlot.id.not_in(booked_ids))
            .filter(AvailabilitySlot.start_at > now)
            .order_by(AvailabilitySlot.start_at)
            .first()
        )

    student1 = users["student1"]
    student2 = users["student2"]

    # Confirmed clinic appointment for student1
    clinic_slot = first_available_slot(
        providers["clinic_dr_chen"].id, services["clinic"].id
    )
    if (
        clinic_slot
        and not Appointment.query.filter_by(
            user_id=student1.id, slot_id=clinic_slot.id
        ).first()
    ):
        appt = Appointment(
            user_id=student1.id,
            provider_id=providers["clinic_dr_chen"].id,
            service_type_id=services["clinic"].id,
            slot_id=clinic_slot.id,
            status=AppointmentStatus.CONFIRMED,
            request_id="seed-clinic-1",
        )
        db.session.add(appt)
        db.session.flush()
        # Queue entry
        service_date = clinic_slot.start_at.date()
        last_q = (
            QueueEntry.query.filter_by(service_date=service_date)
            .order_by(QueueEntry.sequence.desc())
            .first()
        )
        seq = (last_q.sequence + 1) if last_q else 1
        qe = QueueEntry(
            appointment_id=appt.id,
            service_date=service_date,
            ticket_number=f"Q{seq:03d}",
            status=QueueStatus.WAITING,
            sequence=seq,
        )
        db.session.add(qe)
        # Notification
        n = Notification(
            user_id=student1.id,
            title="Clinic appointment confirmed",
            message=f"Your clinic appointment (ticket Q{seq:03d}) is confirmed.",
            type=NotificationType.BOOKING_CONFIRMED,
            appointment_id=appt.id,
        )
        db.session.add(n)

    # Confirmed advising appointment for student1
    adv_slot = first_available_slot(
        providers["adviser_morgan"].id, services["advising"].id
    )
    if (
        adv_slot
        and not Appointment.query.filter_by(
            user_id=student1.id, slot_id=adv_slot.id
        ).first()
    ):
        appt2 = Appointment(
            user_id=student1.id,
            provider_id=providers["adviser_morgan"].id,
            service_type_id=services["advising"].id,
            slot_id=adv_slot.id,
            status=AppointmentStatus.CONFIRMED,
            request_id="seed-advising-1",
        )
        db.session.add(appt2)
        db.session.flush()
        n2 = Notification(
            user_id=student1.id,
            title="Advising appointment confirmed",
            message="Your advising session with Prof. James Morgan is confirmed.",
            type=NotificationType.BOOKING_CONFIRMED,
            appointment_id=appt2.id,
        )
        db.session.add(n2)

    # A cancelled appointment for student2
    cancel_slot = first_available_slot(
        providers["clinic_nurse"].id, services["clinic"].id
    )
    if (
        cancel_slot
        and not Appointment.query.filter_by(
            user_id=student2.id, slot_id=cancel_slot.id
        ).first()
    ):
        appt3 = Appointment(
            user_id=student2.id,
            provider_id=providers["clinic_nurse"].id,
            service_type_id=services["clinic"].id,
            slot_id=cancel_slot.id,
            status=AppointmentStatus.CANCELLED,
            cancellation_reason="Change of plans",
            request_id="seed-clinic-cancelled-1",
        )
        db.session.add(appt3)

    db.session.flush()


def seed_audit_and_trace() -> None:
    """Seed some audit events and trace steps."""
    import uuid

    cid = str(uuid.uuid4())
    events = [
        AuditEvent(
            event_type="LOGIN_SUCCESS",
            outcome="SUCCESS",
            entity_type="User",
            entity_id="1",
            safe_metadata=json.dumps({"email": "alex.kim@students.edu"}),
            correlation_id=cid,
        ),
        AuditEvent(
            event_type="CLINIC_APPOINTMENT_BOOKED",
            outcome="SUCCESS",
            entity_type="Appointment",
            entity_id="seed-clinic-1",
            safe_metadata=json.dumps({"slot_id": 1, "ticket": "Q001"}),
            correlation_id=cid,
        ),
        AuditEvent(
            event_type="ADVISING_APPOINTMENT_BOOKED",
            outcome="SUCCESS",
            entity_type="Appointment",
            entity_id="seed-advising-1",
            safe_metadata=json.dumps({"provider_id": 3}),
            correlation_id=str(uuid.uuid4()),
        ),
    ]
    for e in events:
        if not AuditEvent.query.filter_by(
            event_type=e.event_type, correlation_id=e.correlation_id
        ).first():
            db.session.add(e)

    steps = [
        RequestTraceStep(
            correlation_id=cid,
            sequence=1,
            service_name="ClinicAdapter",
            operation="validate_service_type",
            outcome="OK",
            duration_ms=2,
            safe_metadata=json.dumps({"service": "CLINIC"}),
        ),
        RequestTraceStep(
            correlation_id=cid,
            sequence=2,
            service_name="AppointmentService",
            operation="create_appointment",
            outcome="OK",
            duration_ms=15,
            safe_metadata=json.dumps({"slot_id": 1}),
        ),
        RequestTraceStep(
            correlation_id=cid,
            sequence=3,
            service_name="ClinicQueueService",
            operation="create_queue_entry",
            outcome="OK",
            duration_ms=5,
            safe_metadata=json.dumps({"ticket": "Q001"}),
        ),
        RequestTraceStep(
            correlation_id=cid,
            sequence=4,
            service_name="NotificationService",
            operation="create_notification",
            outcome="OK",
            duration_ms=3,
            safe_metadata=json.dumps({}),
        ),
    ]
    for s in steps:
        if not RequestTraceStep.query.filter_by(
            correlation_id=s.correlation_id, sequence=s.sequence
        ).first():
            db.session.add(s)

    db.session.flush()


def seed_service_metadata() -> None:
    """Seed the SOA service registry."""
    registry = [
        {
            "service_name": "Identity & Role Service",
            "description": "Handles login, logout, session management, current user retrieval, and role-based access control.",
            "version": "1.0.0",
            "base_path": "/api/v1/auth",
            "owning_module": "backend.app.security.auth",
            "health_check_description": "Session store and User table reachable.",
        },
        {
            "service_name": "Service Catalogue",
            "description": "Lists bookable service types (Clinic, Advising) and their providers.",
            "version": "1.0.0",
            "base_path": "/api/v1/catalog",
            "owning_module": "backend.app.api.catalog",
            "health_check_description": "ServiceType and Provider tables reachable.",
        },
        {
            "service_name": "Availability & Scheduling",
            "description": "Manages availability slots, overlap detection, and slot reservation.",
            "version": "1.0.0",
            "base_path": "/api/v1/availability",
            "owning_module": "backend.app.services.availability_service",
            "health_check_description": "AvailabilitySlot table reachable.",
        },
        {
            "service_name": "Appointment Management",
            "description": "Core booking logic: create, cancel, reschedule appointments with idempotency and conflict resolution.",
            "version": "1.0.0",
            "base_path": "/api/v1/appointments",
            "owning_module": "backend.app.services.appointment_service",
            "health_check_description": "Appointment table reachable.",
        },
        {
            "service_name": "Clinic Queue Service",
            "description": "Manages clinic queue entries. Creates queue tickets for confirmed CLINIC appointments only.",
            "version": "1.0.0",
            "base_path": "/api/v1/clinic/queue",
            "owning_module": "backend.app.services.queue_service",
            "health_check_description": "QueueEntry table reachable.",
        },
        {
            "service_name": "Notification Service",
            "description": "Creates and manages in-app notifications. Failures are isolated and never roll back confirmed appointments.",
            "version": "1.0.0",
            "base_path": "/api/v1/notifications",
            "owning_module": "backend.app.services.notification_service",
            "health_check_description": "Notification table reachable.",
        },
        {
            "service_name": "Audit & Request Trace",
            "description": "Records significant state changes and request trace steps linked by correlation ID. No sensitive data.",
            "version": "1.0.0",
            "base_path": "/api/v1/admin/audit-events",
            "owning_module": "backend.app.services.audit_service",
            "health_check_description": "AuditEvent and RequestTraceStep tables reachable.",
        },
        {
            "service_name": "Clinic Adapter",
            "description": "Orchestrates clinic-specific booking: validates service type, calls Appointment Service, creates queue entry.",
            "version": "1.0.0",
            "base_path": "/api/v1/appointments",
            "owning_module": "backend.app.adapters.clinic_adapter",
            "health_check_description": "Depends on AppointmentService and ClinicQueueService.",
        },
        {
            "service_name": "Advising Adapter",
            "description": "Orchestrates advising-specific booking: validates service type, calls Appointment Service without queue entry.",
            "version": "1.0.0",
            "base_path": "/api/v1/appointments",
            "owning_module": "backend.app.adapters.advising_adapter",
            "health_check_description": "Depends on AppointmentService only.",
        },
        {
            "service_name": "Reporting Service",
            "description": "Provides role-protected aggregate counts and chart datasets for the admin dashboard.",
            "version": "1.0.0",
            "base_path": "/api/v1/admin/overview",
            "owning_module": "backend.app.services.reporting_service",
            "health_check_description": "Appointment and ServiceType tables reachable.",
        },
    ]

    for entry in registry:
        existing = ServiceMetadata.query.filter_by(
            service_name=entry["service_name"]
        ).first()
        if not existing:
            svc = ServiceMetadata(**entry)
            db.session.add(svc)

    db.session.flush()


@click.command("seed-demo")
@with_appcontext
def seed_command():
    """Idempotent demo data seed command."""
    click.echo("[*] Seeding CampusConnect demo data...")
    db.create_all()

    # Safe schema migration for SQLite
    try:
        db.session.execute(
            db.text("ALTER TABLE appointments ADD COLUMN outcome_notes TEXT")
        )
        db.session.commit()
    except Exception:
        db.session.rollback()

    users = seed_users()
    db.session.flush()

    services = seed_service_types()
    db.session.flush()

    providers = seed_providers(users, services)
    db.session.flush()

    seed_slots(providers, services)
    db.session.flush()

    seed_appointments_and_queue(users, providers, services)
    db.session.flush()

    seed_audit_and_trace()
    seed_service_metadata()

    db.session.commit()
    click.echo("[SUCCESS] Demo data seeded successfully!")
    click.echo("")
    click.echo("Demo accounts:")
    click.echo("  Admin:         admin@campusconnect.edu         / admin1234")
    click.echo("  Clinic Staff:  clinic.staff@campusconnect.edu  / staff1234")
    click.echo("  Adviser:       j.morgan@campusconnect.edu      / adviser1234")
    click.echo("  Student:       alex.kim@students.edu           / student1234")
