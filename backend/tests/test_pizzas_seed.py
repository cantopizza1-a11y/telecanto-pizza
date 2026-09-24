import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://pizza-delivery-volos.preview.emergentagent.com").rstrip("/")


def _get_pizzas_category_id():
    r = requests.get(f"{BASE_URL}/api/categories", timeout=30)
    assert r.status_code == 200, r.text
    cats = r.json()
    pizzas = [c for c in cats if c.get("slug") == "pizzas"]
    assert pizzas, f"No pizzas category found. Cats: {[c.get('slug') for c in cats]}"
    return pizzas[0].get("id") or pizzas[0].get("_id")


def test_categories_contains_pizzas():
    _get_pizzas_category_id()


def test_pizzas_category_has_36_active_products():
    cat_id = _get_pizzas_category_id()
    r = requests.get(f"{BASE_URL}/api/products", timeout=30)
    assert r.status_code == 200, r.text
    products = r.json()
    pizzas = [p for p in products if p.get("category_id") == cat_id and p.get("active", True)]
    assert len(pizzas) == 36, f"Expected 36 active pizzas, got {len(pizzas)}"


def test_chicken_bbq_present():
    r = requests.get(f"{BASE_URL}/api/products", timeout=30)
    assert r.status_code == 200
    products = r.json()
    matches = [p for p in products if p.get("name") == "Chicken BBQ"]
    assert matches, "Chicken BBQ not found"
    p = matches[0]
    # price check (either float on product or via sizes)
    price = p.get("price")
    sizes = p.get("sizes") or []
    assert len(sizes) == 3, f"Expected 3 sizes for Chicken BBQ, got {sizes}"
    prices = [s.get("price") for s in sizes]
    assert 9.0 in prices or price == 9.0, f"Expected price 9.0 in Chicken BBQ sizes, got {prices}, base {price}"
    extras = p.get("extras") or []
    assert extras, "Chicken BBQ should have non-empty extras"
    image = p.get("image") or p.get("image_url") or ""
    assert image.startswith("https://www.telecanto.gr"), f"Bad image URL: {image}"


def test_creamy_chicken_present():
    r = requests.get(f"{BASE_URL}/api/products", timeout=30)
    assert r.status_code == 200
    products = r.json()
    matches = [p for p in products if p.get("name") == "Creamy Chicken"]
    assert matches, "Creamy Chicken not found"
    p = matches[0]
    price = p.get("price")
    sizes = p.get("sizes") or []
    assert len(sizes) == 3, f"Expected 3 sizes for Creamy Chicken, got {sizes}"
    prices = [s.get("price") for s in sizes]
    assert 8.5 in prices or price == 8.5, f"Expected price 8.5 in Creamy Chicken sizes, got {prices}, base {price}"
    extras = p.get("extras") or []
    assert extras, "Creamy Chicken should have non-empty extras"
    image = p.get("image") or p.get("image_url") or ""
    assert image.startswith("https://www.telecanto.gr"), f"Bad image URL: {image}"


def test_guest_pickup_checkout_creamy_chicken():
    r = requests.get(f"{BASE_URL}/api/products", timeout=30)
    products = r.json()
    p = next((x for x in products if x.get("name") == "Creamy Chicken"), None)
    assert p, "Creamy Chicken missing"
    sizes = p.get("sizes") or []
    size = sizes[0] if sizes else None
    pid = p.get("id") or p.get("_id")

    unit_price = (size and size.get("price")) or p.get("price") or 8.5
    item = {
        "product_id": pid,
        "name": p["name"],
        "quantity": 1,
        "size": (size.get("name") or size.get("label") or size.get("size")) if size else None,
        "size_price": (size and size.get("price")) or None,
        "extras": [],
        "choices": [],
        "notes": "",
        "unit_price": unit_price,
        "line_total": unit_price,
    }
    body = {
        "items": [item],
        "mode": "pickup",
        "customer_name": "TEST_Guest",
        "customer_phone": "6900000000",
        "payment_method": "cash",
        "subtotal": unit_price,
        "delivery_fee": 0,
        "discount": 0,
        "total": unit_price,
    }
    r = requests.post(f"{BASE_URL}/api/orders", json=body, timeout=30)
    assert r.status_code in (200, 201), f"Order failed: {r.status_code} {r.text[:400]}"
    data = r.json()
    assert data.get("id") or data.get("_id") or data.get("order_id"), f"No id in order: {data}"
