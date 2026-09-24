"""Store new-order email + price breakdown (subtotal + delivery/pickup line + total)"""
import os, time, uuid, requests, pytest

BASE = os.environ.get('REACT_APP_BACKEND_URL', 'https://pizza-delivery-volos.preview.emergentagent.com').rstrip('/')
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


@pytest.fixture(scope="module")
def zone1(s):
    zs = s.get(f"{API}/zones").json()
    z = next((z for z in zs if z["name"].startswith("Ζώνη 1")), zs[0])
    return z


def _payload(mode, area, delivery_fee, subtotal=7.5):
    return {
        "items": [{"product_id": "p1", "name": "TEST_Pizza", "quantity": 1, "size": "Small",
                   "size_price": subtotal, "extras": [], "notes": "",
                   "unit_price": subtotal, "line_total": subtotal}],
        "mode": mode, "customer_name": "TEST User", "customer_phone": "6900000000",
        "customer_email": "cantopizza1@gmail.com",
        "address": "Test 1" if mode == "delivery" else "", "area": area if mode == "delivery" else "",
        "address_number": "1", "floor": "", "notes": "TEST_price_breakdown",
        "payment_method": "cash",
        "subtotal": subtotal, "delivery_fee": delivery_fee, "discount": 0,
        "total": round(subtotal + delivery_fee, 2),
    }


def _wait_store_notification(s, admin_h, oid, timeout=25):
    end = time.time() + timeout
    while time.time() < end:
        r = s.get(f"{API}/admin/orders/{oid}/notifications", headers=admin_h)
        if r.status_code == 200:
            for n in r.json():
                if n.get("event") == "store_new_order":
                    return n
        time.sleep(2)
    return None


def _cancel(s, admin_h, oid):
    try:
        s.put(f"{API}/admin/orders/{oid}/status", json={"status": "cancelled"}, headers=admin_h)
    except Exception:
        pass


def test_delivery_order_totals_and_store_email(s, admin_h, zone1):
    payload = _payload("delivery", zone1["name"], zone1["fee"])
    r = s.post(f"{API}/orders", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    oid = d["id"]
    try:
        # Server should override delivery_fee with zone fee
        assert d["subtotal"] == pytest.approx(7.5)
        assert d["delivery_fee"] == pytest.approx(zone1["fee"])
        assert d["total"] == pytest.approx(round(7.5 + zone1["fee"], 2))
        # Store notification
        n = _wait_store_notification(s, admin_h, oid)
        assert n is not None, "store_new_order notification not found within timeout"
        assert n["ok"] is True, f"store email failed: {n}"
        assert (n["to"] or "").lower() == ADMIN_EMAIL.lower()
    finally:
        _cancel(s, admin_h, oid)


def test_pickup_order_totals_and_store_email(s, admin_h):
    payload = _payload("pickup", "", 0.0)
    r = s.post(f"{API}/orders", json=payload)
    assert r.status_code == 200, r.text
    d = r.json()
    oid = d["id"]
    try:
        assert d["subtotal"] == pytest.approx(7.5)
        assert d["delivery_fee"] == pytest.approx(0.0)
        assert d["total"] == pytest.approx(7.5)
        n = _wait_store_notification(s, admin_h, oid)
        assert n is not None
        assert n["ok"] is True
    finally:
        _cancel(s, admin_h, oid)


def test_public_get_order_exposes_breakdown_fields(s, admin_h, zone1):
    payload = _payload("delivery", zone1["name"], zone1["fee"])
    r = s.post(f"{API}/orders", json=payload)
    oid = r.json()["id"]
    try:
        pg = s.get(f"{API}/orders/{oid}")
        assert pg.status_code == 200
        pd = pg.json()
        for k in ("subtotal", "delivery_fee", "total", "mode"):
            assert k in pd, f"missing {k} in public order"
        assert pd["subtotal"] == pytest.approx(7.5)
        assert pd["delivery_fee"] == pytest.approx(zone1["fee"])
        assert pd["total"] == pytest.approx(round(7.5 + zone1["fee"], 2))
    finally:
        _cancel(s, admin_h, oid)
