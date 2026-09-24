"""Telecanto Pizza — Backend API tests"""
import os, uuid, pytest, requests

BASE = os.environ.get('REACT_APP_BACKEND_URL', 'https://pizza-delivery-volos.preview.emergentagent.com').rstrip('/')
API = f"{BASE}/api"
ADMIN_EMAIL = "cantopizza1@gmail.com"
ADMIN_PW = "Telecanto2026!"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_h(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def customer(s):
    email = f"test_cust_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "pass1234", "name": "Test Cust", "phone": "6900000000"})
    assert r.status_code == 200, r.text
    return {"email": email, "token": r.json()["token"], "user": r.json()["user"]}


# ---------- health ----------
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200 and r.json().get("ok") is True


# ---------- catalogue ----------
def test_categories_seeded(s):
    r = s.get(f"{API}/categories")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) and len(data) >= 10, f"expected >=10 categories, got {len(data)}"


def test_products_seeded(s):
    r = s.get(f"{API}/products")
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 40, f"expected ~55 products got {len(data)}"


def test_zones_public(s):
    r = s.get(f"{API}/zones")
    assert r.status_code == 200 and len(r.json()) >= 1


def test_settings_public(s):
    r = s.get(f"{API}/settings")
    assert r.status_code == 200
    assert "store_open" in r.json()


# ---------- auth ----------
def test_customer_register_and_me(s, customer):
    r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {customer['token']}"})
    assert r.status_code == 200
    assert r.json()["email"] == customer["email"]
    assert r.json()["role"] == "customer"


def test_admin_login(admin_token):
    assert admin_token


def test_admin_me_role(s, admin_h):
    r = s.get(f"{API}/auth/me", headers=admin_h)
    assert r.status_code == 200 and r.json()["role"] == "admin"


def test_login_wrong(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


# ---------- non-admin forbidden ----------
def test_non_admin_forbidden(s, customer):
    r = s.get(f"{API}/admin/orders", headers={"Authorization": f"Bearer {customer['token']}"})
    assert r.status_code == 403


def test_no_auth_admin(s):
    r = s.get(f"{API}/admin/orders")
    assert r.status_code == 401


# ---------- orders ----------
def _order_payload(mode="delivery", payment="cash"):
    return {
        "items": [{"product_id": "p1", "name": "TEST_Pizza", "quantity": 1,
                   "size": "Large", "size_price": 12.0, "extras": [],
                   "notes": "", "unit_price": 12.0, "line_total": 12.0}],
        "mode": mode, "customer_name": "TEST User", "customer_phone": "6900000000",
        "address": "Test 1", "area": "Volos", "address_number": "1", "floor": "1",
        "notes": "test", "payment_method": payment,
        "subtotal": 12.0, "delivery_fee": 1.5, "discount": 0, "total": 13.5,
    }


def test_guest_order(s):
    r = s.post(f"{API}/orders", json=_order_payload())
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "new" and d["user_id"] is None and "id" in d


def test_customer_order_loyalty(s, customer):
    h = {"Authorization": f"Bearer {customer['token']}"}
    before = s.get(f"{API}/auth/me", headers=h).json().get("loyalty_points", 0)
    r = s.post(f"{API}/orders", json=_order_payload(), headers=h)
    assert r.status_code == 200
    after = s.get(f"{API}/auth/me", headers=h).json().get("loyalty_points", 0)
    assert after > before, f"loyalty did not increase: {before}->{after}"
    # my orders
    m = s.get(f"{API}/orders/mine", headers=h)
    assert m.status_code == 200 and len(m.json()) >= 1


def test_admin_orders_and_status(s, admin_h):
    # create one
    s.post(f"{API}/orders", json=_order_payload())
    r = s.get(f"{API}/admin/orders", headers=admin_h)
    assert r.status_code == 200 and len(r.json()) >= 1
    oid = r.json()[0]["id"]
    up = s.put(f"{API}/admin/orders/{oid}/status", json={"status": "preparing"}, headers=admin_h)
    assert up.status_code == 200 and up.json()["status"] == "preparing"


def test_dashboard(s, admin_h):
    r = s.get(f"{API}/admin/dashboard", headers=admin_h)
    assert r.status_code == 200
    d = r.json()
    for k in ("orders_today", "sales_today", "delivery_orders", "pickup_orders", "avg_order", "popular", "chart"):
        assert k in d


# ---------- products / categories / zones admin CRUD ----------
def test_product_crud(s, admin_h):
    cats = s.get(f"{API}/categories").json()
    cid = cats[0]["id"]
    payload = {"id": str(uuid.uuid4()), "name": "TEST_Product", "description": "t",
               "image": "", "category_id": cid, "price": 9.9, "sizes": [], "extras": [],
               "toppings": [], "active": True, "popular": False, "order": 999,
               "created_at": "2026-01-01T00:00:00"}
    r = s.post(f"{API}/admin/products", json=payload, headers=admin_h)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    # get
    g = s.get(f"{API}/products/{pid}")
    assert g.status_code == 200 and g.json()["name"] == "TEST_Product"
    # update
    up = s.put(f"{API}/admin/products/{pid}", json={"price": 11.5}, headers=admin_h)
    assert up.status_code == 200 and up.json()["price"] == 11.5
    # delete
    d = s.delete(f"{API}/admin/products/{pid}", headers=admin_h)
    assert d.status_code == 200
    g2 = s.get(f"{API}/products/{pid}")
    assert g2.status_code == 404


def test_zone_crud(s, admin_h):
    r = s.post(f"{API}/admin/zones", json={"name": "TEST_Zone", "fee": 2, "min_order": 5, "active": True}, headers=admin_h)
    assert r.status_code == 200
    zid = r.json()["id"]
    up = s.put(f"{API}/admin/zones/{zid}", json={"fee": 3}, headers=admin_h)
    assert up.status_code == 200 and up.json()["fee"] == 3
    d = s.delete(f"{API}/admin/zones/{zid}", headers=admin_h)
    assert d.status_code == 200


def test_category_crud(s, admin_h):
    payload = {"id": str(uuid.uuid4()), "name": "TEST_Cat", "slug": f"test-{uuid.uuid4().hex[:6]}",
               "image": "", "order": 999, "active": True}
    r = s.post(f"{API}/admin/categories", json=payload, headers=admin_h)
    assert r.status_code == 200
    cid = r.json()["id"]
    up = s.put(f"{API}/admin/categories/{cid}", json={"name": "TEST_Cat2"}, headers=admin_h)
    assert up.status_code == 200 and up.json()["name"] == "TEST_Cat2"
    d = s.delete(f"{API}/admin/categories/{cid}", headers=admin_h)
    assert d.status_code == 200


# ---------- store closed ----------
def test_store_closed_blocks_order(s, admin_h):
    try:
        r = s.put(f"{API}/admin/settings", json={"store_open": False}, headers=admin_h)
        assert r.status_code == 200 and r.json()["store_open"] is False
        blocked = s.post(f"{API}/orders", json=_order_payload())
        assert blocked.status_code == 400
    finally:
        s.put(f"{API}/admin/settings", json={"store_open": True}, headers=admin_h)
    # verify restored
    assert s.get(f"{API}/settings").json()["store_open"] is True
