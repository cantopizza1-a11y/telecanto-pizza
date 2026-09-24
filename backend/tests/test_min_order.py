"""POST /api/orders — min_order enforcement + GET/PUT /api/settings min_order."""
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


def _payload(qty=1, unit=7.5, delivery_fee=0, mode="pickup"):
    line = round(unit * qty, 2)
    return {
        "items": [{"product_id": "p1", "name": "TEST_Margarita", "quantity": qty, "size": "Small",
                   "size_price": unit, "extras": [], "notes": "",
                   "unit_price": unit, "line_total": line}],
        "mode": mode, "customer_name": "TEST User",
        "customer_phone": "6900000000", "customer_email": "cantopizza1@gmail.com",
        "address": "" if mode == "pickup" else "Test 1", "area": "",
        "address_number": "" if mode == "pickup" else "1",
        "floor": "", "notes": "TEST_minorder",
        "payment_method": "cash",
        "subtotal": line, "delivery_fee": delivery_fee, "discount": 0,
        "total": line + delivery_fee,
    }


created = []


def test_settings_has_min_order_8(s):
    r = s.get(f"{API}/settings")
    assert r.status_code == 200
    data = r.json()
    assert "min_order" in data
    assert float(data["min_order"]) == 8.0, data


def test_order_below_min_returns_400(s):
    r = s.post(f"{API}/orders", json=_payload(qty=1, unit=7.5))
    assert r.status_code == 400, r.text
    assert "ελάχιστη παραγγελία" in r.text.lower() or "ελάχιστη" in r.text


def test_order_at_min_ok(s):
    r = s.post(f"{API}/orders", json=_payload(qty=1, unit=8.0))
    assert r.status_code in (200, 201), r.text
    created.append(r.json()["id"])


def test_delivery_fee_does_not_count(s):
    # subtotal 7.5, delivery_fee 0.5 -> total 8.0 but should still be < min_order
    r = s.post(f"{API}/orders", json=_payload(qty=1, unit=7.5, delivery_fee=0.5, mode="pickup"))
    assert r.status_code == 400, r.text
    assert "ελάχιστη" in r.text


def test_admin_can_change_min_order(s, admin_h):
    # Lower min_order to 5
    r = s.put(f"{API}/admin/settings", json={"min_order": 5}, headers=admin_h)
    assert r.status_code in (200, 201), r.text
    g = s.get(f"{API}/settings")
    assert float(g.json()["min_order"]) == 5.0
    # 7.5 order now succeeds
    r2 = s.post(f"{API}/orders", json=_payload(qty=1, unit=7.5))
    assert r2.status_code in (200, 201), r2.text
    created.append(r2.json()["id"])
    # Restore to 8
    r3 = s.put(f"{API}/admin/settings", json={"min_order": 8}, headers=admin_h)
    assert r3.status_code in (200, 201), r3.text
    g2 = s.get(f"{API}/settings")
    assert float(g2.json()["min_order"]) == 8.0


def test_cleanup(s, admin_h):
    for oid in created:
        s.put(f"{API}/admin/orders/{oid}/status", json={"status": "cancelled"}, headers=admin_h)
    # ensure min_order = 8 at the end
    s.put(f"{API}/admin/settings", json={"min_order": 8}, headers=admin_h)
