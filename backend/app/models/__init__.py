"""CampusConnect data models."""

from .user import User
from .service_type import ServiceType
from .provider import Provider
from .availability_slot import AvailabilitySlot
from .appointment import Appointment
from .queue_entry import QueueEntry
from .notification import Notification
from .audit_event import AuditEvent
from .request_trace_step import RequestTraceStep
from .service_metadata import ServiceMetadata

__all__ = [
    "User",
    "ServiceType",
    "Provider",
    "AvailabilitySlot",
    "Appointment",
    "QueueEntry",
    "Notification",
    "AuditEvent",
    "RequestTraceStep",
    "ServiceMetadata",
]
