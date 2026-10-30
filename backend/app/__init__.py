"""
CampusConnect Backend — Application factory.
"""

from __future__ import annotations

import logging
import os
import uuid

from flask import Flask, g, request

from .config import get_config
from .extensions import db, migrate


def create_app(config_name: str | None = None) -> Flask:
    """Application factory."""
    app = Flask(__name__, instance_relative_config=True)

    # Load configuration
    cfg = get_config(config_name or os.getenv("FLASK_ENV", "development"))
    app.config.from_object(cfg)

    # Ensure instance folder exists
    os.makedirs(app.instance_path, exist_ok=True)

    # Initialise extensions
    db.init_app(app)
    migrate.init_app(app, db)

    # Configure structured logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )

    # Inject correlation ID per request
    @app.before_request
    def inject_correlation_id() -> None:
        g.correlation_id = request.headers.get("X-Correlation-ID") or str(uuid.uuid4())

    @app.after_request
    def add_correlation_header(response):  # type: ignore[no-untyped-def]
        correlation_id = getattr(g, "correlation_id", str(uuid.uuid4()))
        response.headers["X-Correlation-ID"] = correlation_id
        return response

    # Register blueprints
    _register_blueprints(app)

    # Register CLI commands
    _register_commands(app)

    return app


def _register_blueprints(app: Flask) -> None:
    from .api.auth import bp as auth_bp
    from .api.catalog import bp as catalog_bp
    from .api.availability import bp as availability_bp
    from .api.appointments import bp as appointments_bp
    from .api.queue import bp as queue_bp
    from .api.notifications import bp as notifications_bp
    from .api.admin import bp as admin_bp
    from .api.health import bp as health_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(catalog_bp, url_prefix="/api/v1/catalog")
    app.register_blueprint(availability_bp, url_prefix="/api/v1")
    app.register_blueprint(appointments_bp, url_prefix="/api/v1")
    app.register_blueprint(queue_bp, url_prefix="/api/v1")
    app.register_blueprint(notifications_bp, url_prefix="/api/v1")
    app.register_blueprint(admin_bp, url_prefix="/api/v1/admin")
    app.register_blueprint(health_bp, url_prefix="/api")


def _register_commands(app: Flask) -> None:
    from .seed_demo_data import seed_command

    app.cli.add_command(seed_command)
