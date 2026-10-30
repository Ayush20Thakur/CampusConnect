"""
Configuration classes for CampusConnect.
"""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


class BaseConfig:
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-secret-change-in-production")
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "Lax"
    SESSION_COOKIE_SECURE: bool = (
        os.getenv("SESSION_COOKIE_SECURE", "False").lower() == "true"
    )
    JSON_SORT_KEYS: bool = False

    # Business rules — configurable
    CANCELLATION_CUTOFF_HOURS: int = int(os.getenv("CANCELLATION_CUTOFF_HOURS", "2"))
    DEFAULT_CLINIC_DURATION_MINUTES: int = int(
        os.getenv("DEFAULT_CLINIC_DURATION_MINUTES", "30")
    )
    DEFAULT_ADVISING_DURATION_MINUTES: int = int(
        os.getenv("DEFAULT_ADVISING_DURATION_MINUTES", "45")
    )
    DEMO_MODE: bool = os.getenv("DEMO_MODE", "True").lower() == "true"


class DevelopmentConfig(BaseConfig):
    DEBUG: bool = True
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'instance' / 'campusconnect.db'}",
    )


class TestingConfig(BaseConfig):
    TESTING: bool = True
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///:memory:"
    WTF_CSRF_ENABLED: bool = False
    SECRET_KEY: str = "test-secret"


class ProductionConfig(BaseConfig):
    DEBUG: bool = False
    SQLALCHEMY_DATABASE_URI: str = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{BASE_DIR / 'instance' / 'campusconnect.db'}",
    )


_CONFIGS = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(name: str = "development") -> type[BaseConfig]:
    return _CONFIGS.get(name, DevelopmentConfig)
