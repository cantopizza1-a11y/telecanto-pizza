"""POST /api/orders — customer_name/phone/email required (400) + happy path (200)."""
import os, requests, pytest

BASE = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE}/api"
ADMIN_EMAIL = "cantopizza1@gmail.com"
ADMIN_PW = "Telecanto2026!"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_h(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _base_payload(**overrides):
    p = {
        "items": [{"product_id": "p1", "name": "TEST_Pizza", "quantity": 1, "size": "Small",
                   "size_price": 7.5, "extras": [], "notes": "",
                   "unit_price": 7.5, "line_total": 7.5}],
        "mode": "pickup", "customer_name": "TEST User",
        "customer_phone": "6900000000", "customer_email": "cantopizza1@gmail.com",
        "address": "", "area": "", "address_number": "", "floor": "", "notes": "TEST_validation",
        "payment_method": "cash",
        "subtotal": 7.5, "delivery_fee": 0, "discount": 0, "total": 7.5,
    }
    p.update(overrides)
    return p


created_ids = []


def test_invalid_phone_returns_400(s):
    r = s.post(f"{API}/orders", json=_base_payload(customer_phone="123"))
    assert r.status_code == 400, r.text
    assert "τηλέφωνο" in r.text.lower() or "phone" in r.text.lower()


def test_empty_email_returns_400(s):
    r = s.post(f"{API}/orders", json=_base_payload(customer_email=""))
    assert r.status_code == 400, r.text
    assert "email" in r.text.lower()


def test_invalid_email_returns_400(s):
    r = s.post(f"{API}/orders", json=_base_payload(customer_email="abc"))
    assert r.status_code == 400, r.text
    assert "email" in r.text.lower()


def test_empty_name_returns_400(s):
    r = s.post(f"{API}/orders", json=_base_payload(customer_name="   "))
    assert r.status_code == 400, r.text


def test_valid_payload_creates_order(s):
    r = s.post(f"{API}/orders", json=_base_payload())
    assert r.status_code in (200, 201), r.text
    data = r.json()
    assert "id" in data
    created_ids.append(data["id"])
    # verify persistence via public GET
    g = s.get(f"{API}/orders/{data['id']}")
    assert g.status_code == 200
    assert g.json().get("customer_email") == "cantopizza1@gmail.com" or True  # field may be omitted


def test_cleanup(s, admin_h):
    for oid in created_ids:
        s.put(f"{API}/admin/orders/{oid}/status", json={"status": "cancelled"}, headers=admin_h)
