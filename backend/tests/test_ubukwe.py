"""
UbukweHub Backend API Tests
Tests: auth (login/MFA), inventory, events, staff, transactions, admin RBAC
"""
import pytest
import requests
import os
import pyotp

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://ubukwe-weddings.preview.emergentagent.com').rstrip('/')

STAFF_EMAIL = "jeanpaul@ubukwe.rw"
STAFF_PASS = "Staff@2025!"
ADMIN_EMAIL = "benishimwe31@gmail.com"
ADMIN_PASS = "Admin@2025!"
TOTP_SECRET = "Z2JPZ3UXAACQZ2KLP2SWYRO6ACF4UVJ2"

@pytest.fixture(scope="module")
def staff_token():
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": STAFF_EMAIL, "password": STAFF_PASS})
    assert resp.status_code == 200, f"Staff login failed: {resp.text}"
    data = resp.json()
    assert "token" in data, f"No token in staff login response: {data}"
    return data["token"]

@pytest.fixture(scope="module")
def admin_token():
    # Admin has MFA, login first to get user_id
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    data = resp.json()
    if data.get("mfa_required"):
        user_id = data["user_id"]
        totp_code = pyotp.TOTP(TOTP_SECRET).now()
        mfa_resp = requests.post(f"{BASE_URL}/api/auth/verify-mfa", json={
            "user_id": user_id, "code": totp_code, "method": "totp"
        })
        assert mfa_resp.status_code == 200, f"Admin MFA failed: {mfa_resp.text}"
        return mfa_resp.json()["token"]
    return data.get("token")

@pytest.fixture(scope="module")
def staff_headers(staff_token):
    return {"Authorization": f"Bearer {staff_token}"}

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# Auth Tests
class TestAuth:
    """Authentication endpoint tests"""

    def test_staff_login_success(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": STAFF_EMAIL, "password": STAFF_PASS})
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["email"] == STAFF_EMAIL

    def test_admin_login_triggers_mfa(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("mfa_required") is True
        assert "user_id" in data
        assert "mfa_methods" in data

    def test_admin_mfa_totp(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        data = resp.json()
        user_id = data["user_id"]
        code = pyotp.TOTP(TOTP_SECRET).now()
        mfa = requests.post(f"{BASE_URL}/api/auth/verify-mfa", json={"user_id": user_id, "code": code, "method": "totp"})
        assert mfa.status_code == 200
        assert "token" in mfa.json()

    def test_admin_email_otp_flow(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
        data = resp.json()
        user_id = data["user_id"]
        # Send email OTP
        otp_resp = requests.post(f"{BASE_URL}/api/auth/send-email-otp", json={"user_id": user_id})
        assert otp_resp.status_code == 200
        otp_code = otp_resp.json().get("otp_code")
        assert otp_code is not None
        # Verify email OTP
        mfa = requests.post(f"{BASE_URL}/api/auth/verify-mfa", json={"user_id": user_id, "code": otp_code, "method": "email_otp"})
        assert mfa.status_code == 200

    def test_invalid_login(self):
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "wrong@example.com", "password": "wrong"})
        assert resp.status_code == 401

    def test_get_me(self, staff_headers):
        resp = requests.get(f"{BASE_URL}/api/auth/me", headers=staff_headers)
        assert resp.status_code == 200
        assert "email" in resp.json()


# Inventory Tests
class TestInventory:
    """Inventory CRUD and stats"""

    def test_get_inventory_stats(self, staff_headers):
        resp = requests.get(f"{BASE_URL}/api/inventory/stats", headers=staff_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "available" in data
        assert "rented" in data
        assert "maintenance" in data
        assert data["total"] >= 12  # 12 seeded items

    def test_list_inventory(self, staff_headers):
        resp = requests.get(f"{BASE_URL}/api/inventory", headers=staff_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert len(data["items"]) >= 12

    def test_inventory_requires_auth(self):
        resp = requests.get(f"{BASE_URL}/api/inventory")
        assert resp.status_code in [401, 403]

    def test_create_inventory_item(self, staff_headers):
        payload = {
            "name": "TEST_Wedding Chair",
            "category": "furniture",
            "quantity": 10,
            "condition": "excellent",
            "rent_price": 5000,
            "description": "Test chair"
        }
        resp = requests.post(f"{BASE_URL}/api/inventory", headers=staff_headers, json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Wedding Chair"
        assert "item_id" in data
        return data["item_id"]


# Events Tests
class TestEvents:
    """Events endpoint tests"""

    def test_get_events(self, staff_headers):
        resp = requests.get(f"{BASE_URL}/api/events", headers=staff_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "events" in data or isinstance(data, list)

    def test_create_event(self, staff_headers):
        payload = {
            "name": "TEST_Wedding Event",
            "client_name": "Test Client",
            "event_date": "2025-12-01",
            "venue": "Kigali Convention Centre",
            "guest_count": 200,
            "budget": 5000000
        }
        resp = requests.post(f"{BASE_URL}/api/events", headers=staff_headers, json=payload)
        assert resp.status_code in [200, 201]


# Staff Tests
class TestStaff:
    """Staff endpoint tests"""

    def test_get_staff(self, staff_headers):
        resp = requests.get(f"{BASE_URL}/api/staff", headers=staff_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "staff" in data or isinstance(data, list)


# Transactions Tests
class TestTransactions:
    """Transaction endpoint tests"""

    def test_get_transactions(self, staff_headers):
        resp = requests.get(f"{BASE_URL}/api/transactions", headers=staff_headers)
        assert resp.status_code == 200

    def test_create_transaction(self, staff_headers):
        # First get an inventory item
        inv_resp = requests.get(f"{BASE_URL}/api/inventory", headers=staff_headers)
        items = inv_resp.json().get("items", [])
        if not items:
            pytest.skip("No inventory items to transact")
        item = items[0]
        payload = {
            "item_id": item["item_id"],
            "type": "rent",
            "quantity": 1,
            "client_name": "TEST_Client",
            "notes": "Test transaction"
        }
        resp = requests.post(f"{BASE_URL}/api/transactions", headers=staff_headers, json=payload)
        assert resp.status_code in [200, 201], f"Transaction failed: {resp.text}"


# Vendors Tests
class TestVendors:
    """Vendor endpoint tests"""

    def test_get_vendors(self, staff_headers):
        resp = requests.get(f"{BASE_URL}/api/vendors", headers=staff_headers)
        assert resp.status_code == 200


# Admin RBAC Tests
class TestAdminRBAC:
    """Admin RBAC - staff cannot access admin endpoints"""

    def test_staff_cannot_access_audit_logs(self, staff_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=staff_headers)
        assert resp.status_code == 403, f"Expected 403 but got {resp.status_code}"

    def test_staff_cannot_access_admin_users(self, staff_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers=staff_headers)
        assert resp.status_code == 403

    def test_admin_can_access_audit_logs(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=admin_headers)
        assert resp.status_code == 200
        assert "logs" in resp.json()

    def test_admin_can_access_users(self, admin_headers):
        resp = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        assert "users" in resp.json()
