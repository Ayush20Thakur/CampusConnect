"""Catalog API blueprint — service types and providers."""

from flask import Blueprint, request

from ..models.service_type import ServiceType
from ..models.provider import Provider
from .helpers import success_response

bp = Blueprint("catalog", __name__)


@bp.get("/services")
def list_services():
    services = ServiceType.query.filter_by(active=True).all()
    return success_response([s.to_dict() for s in services])


@bp.get("/providers")
def list_providers():
    service_type_code = request.args.get("service_type")
    query = Provider.query.filter_by(is_active=True)
    if service_type_code:
        query = query.join(Provider.service_type).filter_by(
            code=service_type_code.upper()
        )
    providers = query.all()
    return success_response([p.to_dict() for p in providers])
