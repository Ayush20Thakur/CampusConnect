"""Backend test configuration."""

import pytest
import sys
import os

# Ensure backend directory and project root are on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(backend_dir)
for p in [backend_dir, root_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app import create_app  # noqa: E402
from app.extensions import db as _db  # noqa: E402


@pytest.fixture(scope="session")
def app():
    """Create a test Flask application."""
    app = create_app("testing")
    with app.app_context():
        _db.create_all()
        from app.seed_demo_data import (
            seed_users,
            seed_service_types,
            seed_providers,
            seed_slots,
            seed_appointments_and_queue,
            seed_service_metadata,
        )

        users = seed_users()
        _db.session.flush()
        services = seed_service_types()
        _db.session.flush()
        providers = seed_providers(users, services)
        _db.session.flush()
        seed_slots(providers, services)
        _db.session.flush()
        seed_appointments_and_queue(users, providers, services)
        _db.session.flush()
        seed_service_metadata()
        _db.session.commit()
        yield app
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def db(app):
    return _db


def login(client, email, password):
    """Helper to log in and return the response."""
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
