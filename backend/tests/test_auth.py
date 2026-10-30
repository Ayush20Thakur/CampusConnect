"""
Tests for authentication and authorization.
Covers: login success, invalid credentials, role enforcement.
"""

from backend.tests.helpers import login


class TestAuth:
    def test_login_success(self, client):
        """TC-01: Login with valid credentials returns user data."""
        resp = login(client, "alex.kim@students.edu", "student1234")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["success"] is True
        assert data["data"]["role"] == "STUDENT"
        assert data["data"]["email"] == "alex.kim@students.edu"

    def test_login_wrong_password(self, client):
        """TC-01b: Login with wrong password returns 401."""
        resp = login(client, "alex.kim@students.edu", "wrongpassword")
        assert resp.status_code == 401
        data = resp.get_json()
        assert data["success"] is False
        assert data["error"]["code"] == "INVALID_CREDENTIALS"

    def test_login_unknown_email(self, client):
        """TC-01c: Login with unknown email returns 401."""
        resp = login(client, "nobody@example.com", "password")
        assert resp.status_code == 401

    def test_login_missing_fields(self, client):
        """TC-01d: Login without fields returns 400."""
        resp = client.post("/api/v1/auth/login", json={})
        assert resp.status_code == 400

    def test_me_authenticated(self, client):
        """TC-01e: /me returns user when authenticated."""
        login(client, "alex.kim@students.edu", "student1234")
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 200

    def test_me_unauthenticated(self, client):
        """TC-01f: /me returns 401 when not logged in."""
        # Fresh client
        from app import create_app

        fresh = create_app("testing").test_client()
        resp = fresh.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_logout(self, client):
        """TC-01g: Logout invalidates session."""
        login(client, "alex.kim@students.edu", "student1234")
        resp = client.post("/api/v1/auth/logout")
        assert resp.status_code == 200
        # After logout, /me should be 401
        resp2 = client.get("/api/v1/auth/me")
        assert resp2.status_code == 401


class TestRolePermissions:
    def test_student_cannot_access_staff_queue(self, client):
        """TC-02: Student cannot access clinic staff queue endpoint."""
        login(client, "alex.kim@students.edu", "student1234")
        resp = client.get("/api/v1/staff/clinic/queue")
        assert resp.status_code == 403

    def test_student_cannot_access_admin(self, client):
        """TC-02b: Student cannot access admin overview."""
        login(client, "alex.kim@students.edu", "student1234")
        resp = client.get("/api/v1/admin/overview")
        assert resp.status_code == 403

    def test_clinic_staff_can_access_queue(self, client):
        """TC-02c: Clinic staff can access queue endpoint."""
        login(client, "clinic.staff@campusconnect.edu", "staff1234")
        resp = client.get("/api/v1/staff/clinic/queue")
        assert resp.status_code == 200

    def test_admin_can_access_admin(self, client):
        """TC-02d: Admin can access admin overview."""
        login(client, "admin@campusconnect.edu", "admin1234")
        resp = client.get("/api/v1/admin/overview")
        assert resp.status_code == 200

    def test_adviser_cannot_access_clinic_queue(self, client):
        """TC-02e: Adviser cannot access clinic staff queue."""
        login(client, "j.morgan@campusconnect.edu", "adviser1234")
        resp = client.get("/api/v1/staff/clinic/queue")
        assert resp.status_code == 403

    def test_unauthenticated_cannot_access_appointments(self, client):
        """TC-02f: Unauthenticated access returns 401."""
        from app import create_app

        fresh = create_app("testing").test_client()
        resp = fresh.get("/api/v1/appointments/me")
        assert resp.status_code == 401
