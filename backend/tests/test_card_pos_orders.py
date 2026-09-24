"""Tests for card_pos payment_method: valid on pickup, rejected on delivery."""
import os
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


@pytest.fixture(scope="module")
def a_product():
    r = requests.get(f"{BASE_URL}/api/products", timeout=15)
    assert r.status_code == 200
    prods = r.json()
    # find any available product
    for p in prods:
        if p.get("available", True) and float(p.get("price", 0)) > 0:
            return p
    pytest.skip("No product available")


def _order_payload(product, mode, payment_method):
    return {
        "items": [{
            "product_id": product["id"],
            "name": product["name"],
            "size_label": (product.get("sizes") or [{}])[0].get("label", ""),
            "unit_price": float(product["price"]),
            "qty": 1,
            "extras": [],
            "notes": "",
            "line_total": float(product["price"]),
        }],
        "mode": mode,
        "customer_name": "TEST_Card",
        "customer_phone": "6900000000",
        "address": "TEST" if mode == "delivery" else "",
        "area": "TEST" if mode == "delivery" else "",
        "address_number": "1", "floor": "", "notes": "",
        "payment_method": payment_method,
        "subtotal": float(product["price"]),
        "delivery_fee": 0,
        "discount": 0,
        "total": float(product["price"]),
        "coupon_code": "",
        "scheduled_for": None,
    }


def test_pickup_card_pos_succeeds(a_product):
    payload = _order_payload(a_product, "pickup", "card_pos")
    r = requests.post(f"{BASE_URL}/api/orders", json=payload, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["payment_method"] == "card_pos"
    assert data["mode"] == "pickup"
    assert "id" in data
    # verify persisted
    g = requests.get(f"{BASE_URL}/api/orders/{data['id']}", timeout=15)
    assert g.status_code == 200
    assert g.json()["payment_method"] == "card_pos"


def test_delivery_card_pos_rejected(a_product):
    payload = _order_payload(a_product, "delivery", "card_pos")
    r = requests.post(f"{BASE_URL}/api/orders", json=payload, timeout=15)
    assert r.status_code == 400
    assert "κάρτα" in r.text or "card" in r.text.lower()


def test_pickup_cash_still_works(a_product):
    payload = _order_payload(a_product, "pickup", "cash")
    r = requests.post(f"{BASE_URL}/api/orders", json=payload, timeout=15)
    assert r.status_code == 200
    assert r.json()["payment_method"] == "cash"
