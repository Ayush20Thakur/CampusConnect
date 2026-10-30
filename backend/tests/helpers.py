"""Test helper utilities."""


def login(client, email, password):
    """Helper to log in and return the response."""
    return client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
