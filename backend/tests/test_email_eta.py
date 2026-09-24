"""Tests for ETA/email notification feature on order status transitions."""
import os, time, requests, pytest, uuid

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://pizza-delivery-volos.preview.emergentagent.com"
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "cantopizza1@gmail.com"
ADMIN_PASSWORD = "Telecanto2026!"
CUSTOMER_EMAIL = "cantopizza1@gmail.com"  # per instructions, use store's own address


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    body = r.json()
    return body.get("access_token") or body.get("token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


def _get_a_pizza():
    r = requests.get(f"{API}/products", timeout=15)
    assert r.status_code == 200
    products = r.json()
    for p in products:
        if p.get("sizes"):
            sz = p["sizes"][0]
            return {
                "product_id": p["id"], "name": p["name"], "quantity": 1,
                "size": sz.get("label") or sz.get("name") or "",
                "extras": [], "choices": [], "notes": "",
                "unit_price": float(sz["price"]), "line_total": float(sz["price"]),
            }
    for p in products:
        if p.get("price"):
            return {
                "product_id": p["id"], "name": p["name"], "quantity": 1, "size": "",
                "extras": [], "choices": [], "notes": "",
                "unit_price": float(p["price"]), "line_total": float(p["price"]),
            }
    pytest.skip("No products available")


def _create_pickup_order(email=CUSTOMER_EMAIL):
    item = _get_a_pizza()
    payload = {
        "items": [item], "mode": "pickup", "coupon_code": "",
        "customer_name": "TEST_Buyer", "customer_phone": "6900000000",
        "customer_email": email,
        "payment_method": "cash",
        "subtotal": item["line_total"], "delivery_fee": 0, "discount": 0, "total": item["line_total"],
    }
    r = requests.post(f"{API}/orders", json=payload, timeout=20)
    assert r.status_code in (200, 201), f"order create failed {r.status_code} {r.text}"
    return r.json()


# ----- checkout validation (customer-facing API accepts empty email; frontend enforces) -----
def test_order_persists_customer_email():
    o = _create_pickup_order()
    assert o.get("customer_email") == CUSTOMER_EMAIL
    assert o.get("status") == "new"


# ----- confirm without eta -----
def test_confirm_without_eta_returns_400(admin_headers):
    o = _create_pickup_order()
    r = requests.put(f"{API}/admin/orders/{o['id']}/status", json={"status": "confirmed"}, headers=admin_headers, timeout=15)
    assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
    # cleanup
    requests.put(f"{API}/admin/orders/{o['id']}/status", json={"status": "cancelled"}, headers=admin_headers, timeout=15)


# ----- confirm with eta=20 -----
def test_confirm_with_eta_and_notification(admin_headers):
    o = _create_pickup_order()
    oid = o["id"]
    r = requests.put(f"{API}/admin/orders/{oid}/status", json={"status": "confirmed", "eta_minutes": 20}, headers=admin_headers, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "confirmed"
    assert body.get("eta_minutes") == 20
    assert body.get("eta_at"), "eta_at missing"

    # Poll notifications for up to ~15s (SMTP background)
    entry = None
    for _ in range(15):
        time.sleep(1)
        nr = requests.get(f"{API}/admin/orders/{oid}/notifications", headers=admin_headers, timeout=15)
        assert nr.status_code == 200
        rows = nr.json()
        entry = next((x for x in rows if x.get("event") == "confirmed"), None)
        if entry:
            break
    assert entry is not None, "No 'confirmed' notification log entry within 15s"
    assert entry.get("ok") is True, f"Notification failed: {entry}"
    assert entry.get("to") == CUSTOMER_EMAIL

    # cleanup
    requests.put(f"{API}/admin/orders/{oid}/status", json={"status": "cancelled"}, headers=admin_headers, timeout=15)


# ----- ready email fires for pickup -----
def test_ready_pickup_sends_email(admin_headers):
    o = _create_pickup_order()
    oid = o["id"]
    r = requests.put(f"{API}/admin/orders/{oid}/status", json={"status": "confirmed", "eta_minutes": 15}, headers=admin_headers, timeout=20)
    assert r.status_code == 200
    time.sleep(2)
    r2 = requests.put(f"{API}/admin/orders/{oid}/status", json={"status": "ready"}, headers=admin_headers, timeout=20)
    assert r2.status_code == 200
    entry = None
    for _ in range(15):
        time.sleep(1)
        nr = requests.get(f"{API}/admin/orders/{oid}/notifications", headers=admin_headers, timeout=15)
        rows = nr.json()
        entry = next((x for x in rows if x.get("event") == "ready"), None)
        if entry: break
    assert entry is not None, "No 'ready' notification log entry"
    assert entry.get("ok") is True

    # completed should NOT create a new notification
    prev_count = len(nr.json())
    r3 = requests.put(f"{API}/admin/orders/{oid}/status", json={"status": "completed"}, headers=admin_headers, timeout=20)
    assert r3.status_code == 200
    time.sleep(3)
    nr2 = requests.get(f"{API}/admin/orders/{oid}/notifications", headers=admin_headers, timeout=15)
    completed_entries = [x for x in nr2.json() if x.get("event") == "completed"]
    assert completed_entries == [], "'completed' should not produce email"


# ----- customer-facing order page returns eta -----
def test_customer_order_endpoint_shows_eta(admin_headers):
    o = _create_pickup_order()
    oid = o["id"]
    requests.put(f"{API}/admin/orders/{oid}/status", json={"status": "confirmed", "eta_minutes": 25}, headers=admin_headers, timeout=20)
    # public endpoint - try common patterns
    r = requests.get(f"{API}/orders/{oid}", timeout=15)
    assert r.status_code == 200, f"public order fetch: {r.status_code} {r.text}"
    body = r.json()
    assert body.get("eta_minutes") == 25
    requests.put(f"{API}/admin/orders/{oid}/status", json={"status": "cancelled"}, headers=admin_headers, timeout=15)


# ----- delivery regression: create order with address+zone -----
def test_delivery_order_creation():
    item = _get_a_pizza()
    payload = {
        "items": [item], "mode": "delivery", "coupon_code": "",
        "customer_name": "TEST_Delivery", "customer_phone": "6900000001",
        "customer_email": CUSTOMER_EMAIL,
        "address": "Αναλήψεως 174", "area": "Βόλος", "address_number": "174", "floor": "1",
        "payment_method": "cash",
        "subtotal": item["line_total"], "delivery_fee": 2.0, "discount": 0, "total": item["line_total"] + 2.0,
    }
    r = requests.post(f"{API}/orders", json=payload, timeout=20)
    assert r.status_code in (200, 201), r.text
    body = r.json()
    assert body["mode"] == "delivery"
    assert body.get("delivery_fee") == 2.0
