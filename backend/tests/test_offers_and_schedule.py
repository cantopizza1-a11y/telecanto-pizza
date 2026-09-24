"""Telecanto Pizza — Phase 2 tests: offers, coupons, scheduled orders, static files."""
import os, uuid, pytest, requests
from datetime import datetime, timezone, timedelta

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
def products(s):
    r = s.get(f"{API}/products")
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def cats(s):
    return s.get(f"{API}/categories").json()


def _item(p, qty=1):
    price = float(p.get("price") or (p["sizes"][0]["price"] if p.get("sizes") else 10.0))
    return {"product_id": p["id"], "name": p["name"], "quantity": qty,
            "size": None, "size_price": None, "extras": [],
            "notes": "", "unit_price": price, "line_total": price * qty}


# ---------- admin offer CRUD ----------
def test_create_percent_with_code(s, admin_h):
    body = {"title": "TEST_PERCENT", "description": "", "type": "percent",
            "value": 20, "product_ids": [], "category_ids": [],
            "combo_items": [], "code": "test20", "min_order": 0,
            "mode": "all", "active": True, "image": ""}
    r = s.post(f"{API}/admin/offers", json=body, headers=admin_h)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["type"] == "percent" and d["value"] == 20
    assert d["code"] == "TEST20", "code should be upper-cased"
    # cleanup
    s.delete(f"{API}/admin/offers/{d['id']}", headers=admin_h)


def test_create_bogo_with_categories(s, admin_h, cats):
    body = {"title": "TEST_BOGO", "type": "bogo", "value": 0,
            "product_ids": [], "category_ids": [cats[0]["id"]],
            "combo_items": [], "code": "", "min_order": 0,
            "mode": "all", "active": True}
    r = s.post(f"{API}/admin/offers", json=body, headers=admin_h)
    assert r.status_code == 200
    d = r.json()
    assert d["type"] == "bogo" and cats[0]["id"] in d["category_ids"]
    s.delete(f"{API}/admin/offers/{d['id']}", headers=admin_h)


def test_create_fixed_with_min_order(s, admin_h):
    body = {"title": "TEST_FIXED", "type": "fixed", "value": 5,
            "product_ids": [], "category_ids": [], "combo_items": [],
            "code": "", "min_order": 20, "mode": "all", "active": True}
    r = s.post(f"{API}/admin/offers", json=body, headers=admin_h)
    assert r.status_code == 200
    d = r.json()
    assert d["min_order"] == 20
    s.delete(f"{API}/admin/offers/{d['id']}", headers=admin_h)


def test_create_combo(s, admin_h, products):
    p1, p2 = products[0], products[1]
    body = {"title": "TEST_COMBO", "type": "combo", "value": 12,
            "product_ids": [], "category_ids": [],
            "combo_items": [{"product_id": p1["id"], "name": p1["name"], "qty": 1},
                            {"product_id": p2["id"], "name": p2["name"], "qty": 1}],
            "code": "", "min_order": 0, "mode": "all", "active": True}
    r = s.post(f"{API}/admin/offers", json=body, headers=admin_h)
    assert r.status_code == 200
    d = r.json()
    assert d["type"] == "combo" and len(d["combo_items"]) == 2
    s.delete(f"{API}/admin/offers/{d['id']}", headers=admin_h)


# ---------- GET /api/offers hides code-locked ----------
def test_public_offers_hide_codes(s, admin_h):
    body = {"title": "TEST_HIDDEN", "type": "percent", "value": 10,
            "code": "SECRETXYZ", "active": True,
            "product_ids": [], "category_ids": [], "combo_items": [],
            "min_order": 0, "mode": "all"}
    c = s.post(f"{API}/admin/offers", json=body, headers=admin_h).json()
    try:
        rows = s.get(f"{API}/offers").json()
        assert all(o["id"] != c["id"] for o in rows), "code-locked offer must be hidden from public"
    finally:
        s.delete(f"{API}/admin/offers/{c['id']}", headers=admin_h)


# ---------- apply computations ----------
def test_apply_percent_with_code_case_insensitive(s, admin_h, products):
    p = products[0]
    body = {"title": "TEST_PCT", "type": "percent", "value": 10, "code": "MYCODE",
            "product_ids": [], "category_ids": [], "combo_items": [],
            "min_order": 0, "mode": "all", "active": True}
    o = s.post(f"{API}/admin/offers", json=body, headers=admin_h).json()
    try:
        items = [_item(p, qty=2)]
        r = s.post(f"{API}/offers/apply", json={"items": items, "mode": "delivery", "code": "mycode"}).json()
        expected = round(items[0]["line_total"] * 0.10, 2)
        assert r["code_valid"] is True
        # Assert our specific offer's discount (other seed offers may also apply)
        mine = [a for a in r["applied"] if a["id"] == o["id"]]
        assert mine and abs(mine[0]["discount"] - expected) < 0.01
        # invalid code -> code_valid False and offer not applied
        r2 = s.post(f"{API}/offers/apply", json={"items": items, "mode": "delivery", "code": "WRONG"}).json()
        assert r2["code_valid"] is False
        assert r2["discount"] == 0 or all(a["id"] != o["id"] for a in r2["applied"])
    finally:
        s.delete(f"{API}/admin/offers/{o['id']}", headers=admin_h)


def test_apply_bogo_second_unit_free(s, admin_h, products):
    p = products[0]
    body = {"title": "TEST_BOGO_P", "type": "bogo", "value": 0,
            "product_ids": [p["id"]], "category_ids": [], "combo_items": [],
            "code": "", "min_order": 0, "mode": "all", "active": True}
    o = s.post(f"{API}/admin/offers", json=body, headers=admin_h).json()
    try:
        items = [_item(p, qty=2)]
        r = s.post(f"{API}/offers/apply", json={"items": items, "mode": "delivery"}).json()
        expected = round(items[0]["unit_price"], 2)
        # discount should include our bogo (there may be other seed offers on p[0] as well)
        assert any(a["id"] == o["id"] and abs(a["discount"] - expected) < 0.01 for a in r["applied"]), r
    finally:
        s.delete(f"{API}/admin/offers/{o['id']}", headers=admin_h)


def test_apply_fixed_capped_at_subtotal(s, admin_h, products):
    p = products[0]
    body = {"title": "TEST_FIXBIG", "type": "fixed", "value": 999,
            "product_ids": [], "category_ids": [], "combo_items": [],
            "code": "FIXBIG", "min_order": 0, "mode": "all", "active": True}
    o = s.post(f"{API}/admin/offers", json=body, headers=admin_h).json()
    try:
        items = [_item(p, qty=1)]
        r = s.post(f"{API}/offers/apply", json={"items": items, "mode": "delivery", "code": "FIXBIG"}).json()
        assert r["discount"] <= items[0]["line_total"] + 0.01
    finally:
        s.delete(f"{API}/admin/offers/{o['id']}", headers=admin_h)


def test_apply_combo_discount(s, admin_h, products):
    p1, p2 = products[0], products[1]
    combo_price = 10.0
    body = {"title": "TEST_COMBO_C", "type": "combo", "value": combo_price,
            "product_ids": [], "category_ids": [],
            "combo_items": [{"product_id": p1["id"], "name": p1["name"], "qty": 1},
                            {"product_id": p2["id"], "name": p2["name"], "qty": 1}],
            "code": "COMBOX", "min_order": 0, "mode": "all", "active": True}
    o = s.post(f"{API}/admin/offers", json=body, headers=admin_h).json()
    try:
        items = [_item(p1, 2), _item(p2, 2)]
        regular = items[0]["unit_price"] + items[1]["unit_price"]
        # n sets = min(2,2) = 2
        expected = max(0.0, (regular - combo_price) * 2)
        r = s.post(f"{API}/offers/apply", json={"items": items, "mode": "delivery", "code": "COMBOX"}).json()
        applied = [a for a in r["applied"] if a["id"] == o["id"]]
        assert applied and abs(applied[0]["discount"] - round(expected, 2)) < 0.01, r
    finally:
        s.delete(f"{API}/admin/offers/{o['id']}", headers=admin_h)


# ---------- create_order recomputes ----------
def _order_body(items, total_override=None, coupon="", scheduled_for=None):
    subtotal = sum(i["line_total"] for i in items)
    return {
        "items": items, "mode": "delivery",
        "customer_name": "TEST", "customer_phone": "6900000000",
        "address": "T 1", "area": "Volos", "address_number": "1",
        "floor": "", "notes": "", "payment_method": "cash",
        "subtotal": subtotal, "delivery_fee": 1.5, "discount": 0,
        "total": total_override if total_override is not None else subtotal + 1.5,
        "coupon_code": coupon, "scheduled_for": scheduled_for,
    }


def test_order_recomputes_server_side(s, admin_h, products):
    p = products[0]
    body = {"title": "TEST_PCT_RECOMPUTE", "type": "percent", "value": 50,
            "code": "HALFOFF", "product_ids": [], "category_ids": [],
            "combo_items": [], "min_order": 0, "mode": "all", "active": True}
    o = s.post(f"{API}/admin/offers", json=body, headers=admin_h).json()
    try:
        items = [_item(p, qty=1)]
        payload = _order_body(items, total_override=9999, coupon="halfoff")
        r = s.post(f"{API}/orders", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total"] != 9999, "server should recompute total"
        # discount should be ~50% of subtotal
        assert abs(d["discount"] - round(items[0]["line_total"] * 0.5, 2)) < 0.01
        assert any(a["id"] == o["id"] for a in d.get("applied_offers", []))
        assert d["subtotal"] == round(items[0]["line_total"], 2)
    finally:
        s.delete(f"{API}/admin/offers/{o['id']}", headers=admin_h)


# ---------- scheduled orders ----------
def test_scheduled_too_soon_400(s, products):
    p = products[0]
    soon = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    r = s.post(f"{API}/orders", json=_order_body([_item(p)], scheduled_for=soon))
    assert r.status_code == 400


def test_scheduled_future_ok(s, products):
    p = products[0]
    later = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    r = s.post(f"{API}/orders", json=_order_body([_item(p)], scheduled_for=later))
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("scheduled_for")


def test_scheduled_disabled_400(s, admin_h, products):
    p = products[0]
    later = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    try:
        r0 = s.put(f"{API}/admin/settings", json={"scheduled_enabled": False}, headers=admin_h)
        assert r0.status_code == 200 and r0.json()["scheduled_enabled"] is False
        r = s.post(f"{API}/orders", json=_order_body([_item(p)], scheduled_for=later))
        assert r.status_code == 400
    finally:
        s.put(f"{API}/admin/settings", json={"scheduled_enabled": True}, headers=admin_h)
    assert s.get(f"{API}/settings").json()["scheduled_enabled"] is True


# ---------- admin order detail auth ----------
def test_admin_order_detail_auth(s, admin_h, products):
    p = products[0]
    o = s.post(f"{API}/orders", json=_order_body([_item(p)])).json()
    oid = o["id"]
    # no auth -> 401
    assert s.get(f"{API}/admin/orders/{oid}").status_code == 401
    # admin ok
    r = s.get(f"{API}/admin/orders/{oid}", headers=admin_h)
    assert r.status_code == 200 and r.json()["id"] == oid


# ---------- static / PWA / SEO ----------
@pytest.mark.parametrize("path", ["/manifest.json", "/sw.js", "/robots.txt", "/sitemap.xml", "/logo.png", "/icon-192.png"])
def test_static_files(s, path):
    r = s.get(f"{BASE}{path}")
    assert r.status_code == 200, f"{path} -> {r.status_code}"


def test_index_has_title_and_ldjson(s):
    r = s.get(f"{BASE}/")
    assert r.status_code == 200
    html = r.text.lower()
    assert "telecanto" in html, "expected 'Telecanto' in index html"
    assert "application/ld+json" in html, "expected ld+json schema in index.html"
