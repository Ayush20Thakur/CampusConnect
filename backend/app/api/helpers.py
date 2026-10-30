"""Shared API helpers — consistent response format."""

from __future__ import annotations

from typing import Any

from flask import jsonify, g


def success_response(
    data: Any = None, status_code: int = 200, message: str | None = None
) -> tuple:
    body: dict = {"success": True, "correlation_id": getattr(g, "correlation_id", None)}
    if data is not None:
        body["data"] = data
    if message:
        body["message"] = message
    return jsonify(body), status_code


def error_response(code: str, message: str, status_code: int = 400) -> tuple:
    return jsonify(
        {
            "success": False,
            "error": {"code": code, "message": message},
            "correlation_id": getattr(g, "correlation_id", None),
        }
    ), status_code
