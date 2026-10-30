"""Health check endpoint."""

from flask import Blueprint, jsonify, current_app

from ..extensions import db

bp = Blueprint("health", __name__)


@bp.get("/health")
def health():
    try:
        db.session.execute(db.text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    status = "ok" if db_ok else "degraded"
    return jsonify(
        {
            "status": status,
            "version": "1.0.0",
            "database": "ok" if db_ok else "unreachable",
            "demo_mode": current_app.config.get("DEMO_MODE", False),
        }
    ), 200
