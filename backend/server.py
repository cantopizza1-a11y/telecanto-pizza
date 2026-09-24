from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / '.env')

import os, uuid, jwt, bcrypt, logging, base64, asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, UploadFile, File, BackgroundTasks
from mailer import build_email, send_email, build_store_email
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = 'HS256'

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Telecanto Pizza API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("telecanto")

# ---------- helpers ----------
def now_iso(): return datetime.now(timezone.utc).isoformat()
def uid(): return str(uuid.uuid4())

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def check_pw(pw: str, h: str) -> bool:
    try: return bcrypt.checkpw(pw.encode(), h.encode())
    except Exception: return False

def make_token(uid_: str, email: str, role: str, days: int = 7) -> str:
    return jwt.encode({"sub": uid_, "email": email, "role": role,
                       "exp": datetime.now(timezone.utc) + timedelta(days=days)},
                      JWT_SECRET, algorithm=JWT_ALG)

async def current_user(request: Request) -> Optional[dict]:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.cookies.get("access_token")
    if not token: return None
    try:
        p = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        u = await db.users.find_one({"id": p["sub"]}, {"password_hash": 0, "_id": 0})
        return u
    except Exception:
        return None

async def require_user(request: Request) -> dict:
    u = await current_user(request)
    if not u: raise HTTPException(401, "Not authenticated")
    return u

async def require_admin(request: Request) -> dict:
    u = await require_user(request)
    if u.get("role") != "admin": raise HTTPException(403, "Admin only")
    return u

def clean(d: dict) -> dict:
    if d and "_id" in d: d.pop("_id")
    return d

# ---------- models ----------
class RegisterIn(BaseModel):
    email: EmailStr; password: str; name: str; phone: Optional[str] = ""
class LoginIn(BaseModel):
    email: EmailStr; password: str

class Category(BaseModel):
    id: str = Field(default_factory=uid)
    name: str; slug: str; image: Optional[str] = ""; order: int = 0; active: bool = True
    mode: str = "all"

class ProductSize(BaseModel):
    label: str; price: float

class Product(BaseModel):
    id: str = Field(default_factory=uid)
    name: str; description: str = ""; image: Optional[str] = ""
    category_id: str; price: float = 0
    sizes: List[ProductSize] = []
    extras: List[dict] = []  # [{name, price}]
    toppings: List[dict] = []
    active: bool = True; popular: bool = False; order: int = 0
    tags: List[str] = []
    mode: str = "all"  # all | delivery | pickup
    bundle: Optional[dict] = None  # {pizzas: n, salad: bool}
    created_at: str = Field(default_factory=now_iso)

class OrderItemIn(BaseModel):
    product_id: str; name: str; quantity: int = 1
    size: Optional[str] = None; size_price: Optional[float] = None
    extras: List[dict] = []; choices: List[str] = []; notes: str = ""; unit_price: float; line_total: float

class OrderIn(BaseModel):
    items: List[OrderItemIn]
    mode: str  # delivery | pickup
    coupon_code: Optional[str] = ""
    customer_name: str; customer_phone: str; customer_email: Optional[str] = ""
    address: Optional[str] = ""; area: Optional[str] = ""
    address_number: Optional[str] = ""; floor: Optional[str] = ""; notes: Optional[str] = ""
    payment_method: str  # cash | iris | card_pos (pickup only)
    subtotal: float; delivery_fee: float = 0; discount: float = 0; total: float
    scheduled_for: Optional[str] = None

class StatusUpdate(BaseModel):
    status: str
    eta_minutes: Optional[int] = None

class OfferIn(BaseModel):
    title: str; description: str = ""
    type: str  # bogo | percent | fixed | combo
    value: float = 0  # percent % or fixed € or combo price
    product_ids: List[str] = []; category_ids: List[str] = []
    combo_items: List[dict] = []  # [{product_id, name, qty}]
    code: Optional[str] = ""; min_order: float = 0
    mode: str = "all"  # all | delivery | pickup
    active: bool = True; image: Optional[str] = ""

class ApplyIn(BaseModel):
    items: List[OrderItemIn]; mode: str = "delivery"; code: Optional[str] = ""

def _eligible(offer: dict, it: dict, prod_cat: dict) -> bool:
    pids, cids = offer.get("product_ids") or [], offer.get("category_ids") or []
    if not pids and not cids: return True
    return it["product_id"] in pids or prod_cat.get(it["product_id"]) in cids

def compute_offers(offers: List[dict], items: List[dict], mode: str, code: str, prod_cat: dict):
    code = (code or "").strip().upper()
    subtotal = sum(i["line_total"] for i in items)
    applied, total_disc = [], 0.0
    for o in offers:
        if o.get("mode", "all") not in ("all", mode): continue
        if o.get("code") and o["code"].strip().upper() != code: continue
        if subtotal < float(o.get("min_order") or 0): continue
        disc = 0.0; t = o["type"]
        if t == "percent":
            disc = sum(i["line_total"] for i in items if _eligible(o, i, prod_cat)) * float(o["value"]) / 100
        elif t == "fixed":
            disc = min(float(o["value"]), subtotal)
        elif t == "bogo":
            units = sorted([i["unit_price"] for i in items if _eligible(o, i, prod_cat) for _ in range(i["quantity"])], reverse=True)
            disc = sum(units[1::2])
        elif t == "combo":
            need = o.get("combo_items") or []
            if need:
                have = {}
                for i in items: have[i["product_id"]] = have.get(i["product_id"], 0) + i["quantity"]
                n = min((have.get(c["product_id"], 0) // max(1, int(c.get("qty", 1)))) for c in need)
                if n > 0:
                    price_of = {}
                    for i in items: price_of.setdefault(i["product_id"], i["unit_price"])
                    regular = sum(price_of.get(c["product_id"], 0) * int(c.get("qty", 1)) for c in need)
                    disc = max(0.0, (regular - float(o["value"])) * n)
        disc = round(disc, 2)
        if disc > 0:
            applied.append({"id": o["id"], "title": o["title"], "type": t, "discount": disc}); total_disc += disc
    total_disc = round(min(total_disc, subtotal), 2)
    return {"discount": total_disc, "applied": applied, "code_valid": bool(code) and any(o.get("code", "").strip().upper() == code for o in offers)}

async def _prod_cat_map():
    return {p["id"]: p["category_id"] async for p in db.products.find({}, {"id": 1, "category_id": 1})}

class ZoneIn(BaseModel):
    name: str; fee: float; min_order: float = 0; active: bool = True

class SettingsIn(BaseModel):
    store_open: Optional[bool] = None
    pickup_enabled: Optional[bool] = None
    delivery_enabled: Optional[bool] = None
    scheduled_enabled: Optional[bool] = None
    iris_enabled: Optional[bool] = None
    cash_enabled: Optional[bool] = None
    loyalty_points_per_euro: Optional[float] = None
    loyalty_points_for_reward: Optional[int] = None
    loyalty_reward_value: Optional[float] = None
    iris_afm: Optional[str] = None
    iris_business_name: Optional[str] = None
    iris_doy: Optional[str] = None
    opening_hours: Optional[dict] = None

# ---------- health ----------
@api.get("/")
async def root(): return {"app": "Telecanto Pizza API", "ok": True}

# ---------- auth ----------
@api.post("/auth/register")
async def register(data: RegisterIn):
    email = data.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email υπάρχει ήδη")
    u = {"id": uid(), "email": email, "password_hash": hash_pw(data.password),
         "name": data.name, "phone": data.phone or "", "role": "customer",
         "loyalty_points": 0, "created_at": now_iso()}
    await db.users.insert_one(u)
    token = make_token(u["id"], email, "customer")
    return {"token": token, "user": {k: v for k, v in u.items() if k not in ("password_hash", "_id")}}

@api.post("/auth/login")
async def login(data: LoginIn):
    email = data.email.lower()
    u = await db.users.find_one({"email": email})
    if not u or not check_pw(data.password, u["password_hash"]):
        raise HTTPException(401, "Λάθος email ή κωδικός")
    token = make_token(u["id"], email, u.get("role", "customer"))
    clean(u); u.pop("password_hash", None)
    return {"token": token, "user": u}

@api.get("/auth/me")
async def me(request: Request):
    u = await require_user(request)
    return u

# ---------- categories ----------
@api.get("/categories")
async def list_categories():
    rows = await db.categories.find({"active": True}).sort("order", 1).to_list(200)
    return [clean(r) for r in rows]

@api.get("/admin/categories")
async def admin_list_categories(admin=Depends(require_admin)):
    rows = await db.categories.find().sort("order", 1).to_list(200)
    return [clean(r) for r in rows]

@api.post("/admin/categories")
async def create_category(data: Category, admin=Depends(require_admin)):
    doc = data.model_dump(); await db.categories.insert_one(doc); return clean(doc)

@api.put("/admin/categories/{cid}")
async def update_category(cid: str, data: dict, admin=Depends(require_admin)):
    data.pop("id", None); await db.categories.update_one({"id": cid}, {"$set": data})
    doc = await db.categories.find_one({"id": cid}); return clean(doc)

@api.delete("/admin/categories/{cid}")
async def delete_category(cid: str, admin=Depends(require_admin)):
    await db.categories.delete_one({"id": cid}); return {"ok": True}

# ---------- products ----------
@api.get("/products")
async def list_products(category_id: Optional[str] = None):
    q = {"active": True}
    if category_id: q["category_id"] = category_id
    rows = await db.products.find(q).sort("order", 1).to_list(500)
    return [clean(r) for r in rows]

@api.get("/products/{pid}")
async def get_product(pid: str):
    p = await db.products.find_one({"id": pid})
    if not p: raise HTTPException(404, "Not found")
    return clean(p)

@api.get("/admin/products")
async def admin_list_products(admin=Depends(require_admin)):
    rows = await db.products.find().sort("order", 1).to_list(1000)
    return [clean(r) for r in rows]

@api.post("/admin/products")
async def create_product(data: Product, admin=Depends(require_admin)):
    doc = data.model_dump(); await db.products.insert_one(doc); return clean(doc)

@api.put("/admin/products/{pid}")
async def update_product(pid: str, data: dict, admin=Depends(require_admin)):
    data.pop("id", None); data.pop("_id", None)
    await db.products.update_one({"id": pid}, {"$set": data})
    p = await db.products.find_one({"id": pid}); return clean(p)

@api.delete("/admin/products/{pid}")
async def delete_product(pid: str, admin=Depends(require_admin)):
    await db.products.delete_one({"id": pid}); return {"ok": True}

@api.post("/admin/upload")
async def upload_image(file: UploadFile = File(...), admin=Depends(require_admin)):
    data = await file.read()
    if len(data) > 5 * 1024 * 1024: raise HTTPException(400, "Max 5MB")
    ct = file.content_type or "image/jpeg"
    b64 = base64.b64encode(data).decode()
    return {"url": f"data:{ct};base64,{b64}"}

# ---------- orders ----------
@api.post("/orders")
async def create_order(data: OrderIn, request: Request, bg: BackgroundTasks):
    u = await current_user(request)
    settings = await db.settings.find_one({"_id": "main"}) or {}
    if not settings.get("store_open", True):
        raise HTTPException(400, "Το κατάστημα είναι κλειστό")
    if data.scheduled_for:
        if not settings.get("scheduled_enabled", True):
            raise HTTPException(400, "Οι προγραμματισμένες παραγγελίες δεν είναι διαθέσιμες")
        try:
            sched = datetime.fromisoformat(data.scheduled_for)
            if sched.tzinfo is None: sched = sched.replace(tzinfo=timezone.utc)
        except ValueError:
            raise HTTPException(400, "Μη έγκυρη ώρα")
        if sched < datetime.now(timezone.utc) + timedelta(minutes=25):
            raise HTTPException(400, "Η ώρα παράδοσης πρέπει να είναι τουλάχιστον 25' μετά")
    if data.payment_method == "card_pos" and data.mode != "pickup":
        raise HTTPException(400, "Η πληρωμή με κάρτα είναι διαθέσιμη μόνο για παραλαβή από το κατάστημα")
    pids = [i.product_id for i in data.items]
    async for p in db.products.find({"id": {"$in": pids}, "mode": {"$nin": ["all", None, data.mode]}}, {"name": 1}):
        raise HTTPException(400, f"Το «{p['name']}» ισχύει μόνο για {'παραλαβή' if data.mode == 'delivery' else 'delivery'}")
    order = data.model_dump()
    if data.mode == "delivery":
        zone = await db.zones.find_one({"name": data.area, "active": True})
        order["delivery_fee"] = float(zone["fee"]) if zone else max(0.0, float(data.delivery_fee))
    else:
        order["delivery_fee"] = 0.0
    items = [i.model_dump() for i in data.items]
    offers = await db.offers.find({"active": True}).to_list(200)
    res = compute_offers(offers, items, data.mode, data.coupon_code, await _prod_cat_map())
    order["subtotal"] = round(sum(i["line_total"] for i in items), 2)
    order["discount"] = res["discount"]; order["applied_offers"] = res["applied"]
    order["total"] = round(order["subtotal"] - res["discount"] + order["delivery_fee"], 2)
    order.update({"id": uid(), "user_id": u["id"] if u else None,
                  "status": "new", "payment_status": "pending",
                  "created_at": now_iso()})
    await db.orders.insert_one(order)
    bg.add_task(_notify_store, clean(order))
    # loyalty
    if u:
        s = await db.settings.find_one({"_id": "main"}) or {}
        ppe = float(s.get("loyalty_points_per_euro", 1))
        pts = int(order["total"] * ppe)
        await db.users.update_one({"id": u["id"]}, {"$inc": {"loyalty_points": pts}})
    return clean(order)

@api.get("/orders/mine")
async def my_orders(user=Depends(require_user)):
    rows = await db.orders.find({"user_id": user["id"]}).sort("created_at", -1).to_list(200)
    return [clean(r) for r in rows]

@api.get("/orders/{oid}")
async def get_order_public(oid: str):
    o = await db.orders.find_one({"id": oid}, {"_id": 0, "id": 1, "status": 1, "mode": 1, "total": 1, "subtotal": 1,
                                              "discount": 1, "delivery_fee": 1, "scheduled_for": 1, "created_at": 1, "items": 1, "payment_method": 1, "eta_minutes": 1, "eta_at": 1, "customer_email": 1})
    if not o: raise HTTPException(404, "Not found")
    return o

@api.get("/admin/orders")
async def admin_orders(admin=Depends(require_admin), status: Optional[str] = None):
    q = {}
    if status: q["status"] = status
    rows = await db.orders.find(q).sort("created_at", -1).to_list(500)
    return [clean(r) for r in rows]

@api.get("/admin/orders/{oid}")
async def admin_order(oid: str, admin=Depends(require_admin)):
    o = await db.orders.find_one({"id": oid})
    if not o: raise HTTPException(404, "Not found")
    return clean(o)

EMAIL_EVENTS = {"confirmed", "ready", "delivering"}

def _notify(order: dict, event: str, eta: Optional[int]):
    to = (order.get("customer_email") or "").strip()
    if not to: return
    try:
        subject, html, text = build_email(order, event, eta)
        send_email(to, subject, html, text)
        db_sync_log = {"order_id": order["id"], "event": event, "to": to, "ok": True, "at": now_iso()}
    except Exception as e:
        logging.getLogger("telecanto.mail").exception("email failed order=%s", order["id"])
        db_sync_log = {"order_id": order["id"], "event": event, "to": to, "ok": False, "error": str(e)[:200], "at": now_iso()}
    asyncio.run(_log_notification(db_sync_log))

async def _log_notification(doc: dict):
    c = AsyncIOMotorClient(os.environ["MONGO_URL"])
    await c[os.environ["DB_NAME"]].notifications.insert_one(doc); c.close()

def _notify_store(order: dict):
    to = os.environ.get("STORE_NOTIFY_EMAIL") or os.environ.get("SMTP_USERNAME")
    try:
        subject, html, text = build_store_email(order)
        send_email(to, subject, html, text)
        doc = {"order_id": order["id"], "event": "store_new_order", "to": to, "ok": True, "at": now_iso()}
    except Exception as e:
        logging.getLogger("telecanto.mail").exception("store email failed order=%s", order["id"])
        doc = {"order_id": order["id"], "event": "store_new_order", "to": to, "ok": False, "error": str(e)[:200], "at": now_iso()}
    asyncio.run(_log_notification(doc))

@api.put("/admin/orders/{oid}/status")
async def update_status(oid: str, data: StatusUpdate, bg: BackgroundTasks, admin=Depends(require_admin)):
    o = await db.orders.find_one({"id": oid})
    if not o: raise HTTPException(404, "Not found")
    if data.status == "confirmed" and not data.eta_minutes:
        raise HTTPException(400, "Δώστε εκτιμώμενο χρόνο (λεπτά) για την αποδοχή")
    upd = {"status": data.status}
    if data.status == "confirmed":
        upd["eta_minutes"] = data.eta_minutes; upd["confirmed_at"] = now_iso()
        upd["eta_at"] = (datetime.now(timezone.utc) + timedelta(minutes=data.eta_minutes)).isoformat()
    await db.orders.update_one({"id": oid}, {"$set": upd})
    o = await db.orders.find_one({"id": oid})
    if data.status in EMAIL_EVENTS and not (data.status == "ready" and o.get("mode") == "delivery"):
        bg.add_task(_notify, clean(o), data.status, o.get("eta_minutes"))
    return clean(o)

@api.get("/admin/orders/{oid}/notifications")
async def order_notifications(oid: str, admin=Depends(require_admin)):
    rows = await db.notifications.find({"order_id": oid}, {"_id": 0}).sort("at", -1).to_list(20)
    return rows

@api.get("/admin/dashboard")
async def dashboard(admin=Depends(require_admin)):
    today = datetime.now(timezone.utc).date().isoformat()
    rows = await db.orders.find({"created_at": {"$gte": today}}).to_list(1000)
    total_sales = sum(r.get("total", 0) for r in rows if r.get("status") != "cancelled")
    delivery = sum(1 for r in rows if r.get("mode") == "delivery")
    pickup = sum(1 for r in rows if r.get("mode") == "pickup")
    avg = (total_sales / len(rows)) if rows else 0
    # popular products
    counts = {}
    for r in rows:
        for it in r.get("items", []):
            counts[it["name"]] = counts.get(it["name"], 0) + it["quantity"]
    popular = sorted(counts.items(), key=lambda x: -x[1])[:5]
    # last 7 days
    chart = []
    for i in range(6, -1, -1):
        d = (datetime.now(timezone.utc) - timedelta(days=i)).date().isoformat()
        drows = await db.orders.find({"created_at": {"$gte": d, "$lt": d + "T99"}}).to_list(500)
        chart.append({"day": d, "total": sum(x.get("total", 0) for x in drows)})
    return {"orders_today": len(rows), "sales_today": round(total_sales, 2),
            "delivery_orders": delivery, "pickup_orders": pickup,
            "avg_order": round(avg, 2), "popular": popular, "chart": chart}

# ---------- delivery zones ----------
@api.get("/zones")
async def list_zones():
    rows = await db.zones.find({"active": True}).to_list(200)
    return [clean(r) for r in rows]

@api.get("/admin/zones")
async def admin_zones(admin=Depends(require_admin)):
    rows = await db.zones.find().to_list(200); return [clean(r) for r in rows]

@api.post("/admin/zones")
async def create_zone(data: ZoneIn, admin=Depends(require_admin)):
    doc = data.model_dump(); doc["id"] = uid()
    await db.zones.insert_one(doc); return clean(doc)

@api.put("/admin/zones/{zid}")
async def update_zone(zid: str, data: dict, admin=Depends(require_admin)):
    data.pop("id", None); await db.zones.update_one({"id": zid}, {"$set": data})
    return clean(await db.zones.find_one({"id": zid}))

@api.delete("/admin/zones/{zid}")
async def del_zone(zid: str, admin=Depends(require_admin)):
    await db.zones.delete_one({"id": zid}); return {"ok": True}

# ---------- settings ----------
DEFAULT_SETTINGS = {"_id": "main", "store_open": True, "pickup_enabled": True,
                    "delivery_enabled": True, "scheduled_enabled": True,
                    "iris_enabled": False, "cash_enabled": True,
                    "loyalty_points_per_euro": 1.0, "loyalty_points_for_reward": 100,
                    "loyalty_reward_value": 5.0,
                    "iris_afm": "", "iris_business_name": "TELECANTO PIZZA", "iris_doy": "",
                    "opening_hours": {"mon": {"open": "", "close": "", "closed": True},
                                      "tue": {"open": "13:00", "close": "24:00", "closed": False},
                                      "wed": {"open": "13:00", "close": "24:00", "closed": False},
                                      "thu": {"open": "13:00", "close": "24:00", "closed": False},
                                      "fri": {"open": "13:00", "close": "24:00", "closed": False},
                                      "sat": {"open": "13:00", "close": "24:00", "closed": False},
                                      "sun": {"open": "13:00", "close": "24:00", "closed": False}}}

@api.get("/settings")
async def get_settings():
    s = await db.settings.find_one({"_id": "main"})
    if not s:
        await db.settings.insert_one(DEFAULT_SETTINGS); s = DEFAULT_SETTINGS
    s.pop("_id", None); return s

@api.put("/admin/settings")
async def update_settings(data: SettingsIn, admin=Depends(require_admin)):
    payload = {k: v for k, v in data.model_dump().items() if v is not None}
    await db.settings.update_one({"_id": "main"}, {"$set": payload}, upsert=True)
    s = await db.settings.find_one({"_id": "main"}); s.pop("_id", None); return s

# ---------- offers ----------
@api.get("/offers")
async def list_offers():
    rows = await db.offers.find({"active": True, "code": {"$in": ["", None]}}).to_list(100)
    return [clean(r) for r in rows]

@api.post("/offers/apply")
async def apply_offers(data: ApplyIn):
    offers = await db.offers.find({"active": True}).to_list(200)
    items = [i.model_dump() for i in data.items]
    return compute_offers(offers, items, data.mode, data.code, await _prod_cat_map())

@api.get("/admin/offers")
async def admin_offers(admin=Depends(require_admin)):
    rows = await db.offers.find().sort("created_at", -1).to_list(200)
    return [clean(r) for r in rows]

@api.post("/admin/offers")
async def create_offer(data: OfferIn, admin=Depends(require_admin)):
    doc = data.model_dump(); doc["id"] = uid(); doc["created_at"] = now_iso()
    doc["code"] = (doc.get("code") or "").strip().upper()
    await db.offers.insert_one(doc); return clean(doc)

@api.put("/admin/offers/{oid}")
async def update_offer(oid: str, data: dict, admin=Depends(require_admin)):
    data.pop("id", None); data.pop("_id", None)
    if "code" in data: data["code"] = (data.get("code") or "").strip().upper()
    await db.offers.update_one({"id": oid}, {"$set": data})
    return clean(await db.offers.find_one({"id": oid}))

@api.delete("/admin/offers/{oid}")
async def delete_offer(oid: str, admin=Depends(require_admin)):
    await db.offers.delete_one({"id": oid}); return {"ok": True}

# ---------- favorites ----------
@api.get("/favorites")
async def get_favs(user=Depends(require_user)):
    return user.get("favorites", [])

@api.post("/favorites/{pid}")
async def toggle_fav(pid: str, user=Depends(require_user)):
    favs = user.get("favorites", [])
    favs = [f for f in favs if f != pid] if pid in favs else favs + [pid]
    await db.users.update_one({"id": user["id"]}, {"$set": {"favorites": favs}})
    return favs

# ---------- startup ----------
async def seed():
    from seed_data import SEED_CATEGORIES, SEED_PRODUCTS
    await db.settings.update_one({"_id": "main"}, {"$setOnInsert": DEFAULT_SETTINGS}, upsert=True)
    # admin
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_pw = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"id": uid(), "email": admin_email,
                                   "password_hash": hash_pw(admin_pw), "name": "Telecanto Admin",
                                   "phone": "24210 55085", "role": "admin", "loyalty_points": 0,
                                   "created_at": now_iso()})
    elif not check_pw(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_pw(admin_pw), "role": "admin"}})
    # cats
    if await db.categories.count_documents({}) == 0:
        for i, c in enumerate(SEED_CATEGORIES):
            await db.categories.insert_one({"id": uid(), "order": i, "active": True, **c})
    # products
    if await db.products.count_documents({}) == 0:
        cats = {c["slug"]: c["id"] async for c in db.categories.find()}
        for i, p in enumerate(SEED_PRODUCTS):
            cid = cats.get(p["category"])
            if not cid: continue
            doc = {"id": uid(), "name": p["name"], "description": p.get("desc", ""),
                   "image": p.get("image", ""), "category_id": cid, "price": p["price"],
                   "sizes": p.get("sizes", []), "extras": p.get("extras", []),
                   "toppings": [], "active": True, "popular": p.get("popular", False),
                   "order": i, "created_at": now_iso()}
            await db.products.insert_one(doc)
    # default zones
    if await db.zones.count_documents({}) == 0:
        for z in [{"name": "Ζώνη 1 - Κέντρο Βόλου", "fee": 1.5, "min_order": 8.0},
                  {"name": "Ζώνη 2 - Νέα Ιωνία", "fee": 2.5, "min_order": 10.0},
                  {"name": "Ζώνη 3 - Περιφέρεια", "fee": 3.5, "min_order": 12.0}]:
            await db.zones.insert_one({"id": uid(), "active": True, **z})
    await db.users.create_index("email", unique=True)
    await db.products.create_index("category_id")
    await db.orders.create_index("created_at")
    log.info("Seed complete")

@app.on_event("startup")
async def on_start():
    await seed()

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
                   allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def on_stop(): client.close()
