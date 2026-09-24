import asyncio, os, uuid
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
load_dotenv(Path(__file__).parent / '.env')

IMG = "https://www.telecanto.gr/images/thumbs/"
SAUCES = [("Σως chef", 0.8), ("Μαγιονέζα", 0.8), ("Ουγγαρέζα", 1.5), ("Σως BBQ", 1.5), ("Σως Caesar's", 1.5)]
SWEETS = [
    ("Καλτσόνε Nutella", "Καλτσόνε με πραλίνα Nutella", 8.5, "kaltsone-nutella_2172084656.webp"),
    ("Καλτσόνε Bueno", "Καλτσόνε με πραλίνα bueno & kinder Bueno", 8.5, "kaltsone-bueno_1054027447.webp"),
    ("Γλυκό Μεγάλο Σάντουιτς", "Με γέμιση πραλίνες Bueno, Nutella & τριμμένο μπισκότο oreo", 8.5, "glyko-megalo-santoyits_5650917555.webp"),
]

def prod(name, desc, price, img, cid, i, tags=None):
    return {"name": name, "description": desc, "image": (IMG + img) if img else "", "category_id": cid, "price": price,
            "sizes": [], "extras": [], "toppings": [], "active": True, "popular": False, "order": i, "mode": "all", "bundle": None, "tags": tags or []}

async def main():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    await db.categories.update_one({"slug": "offers-pickup"}, {"$set": {"name": "Προσφορές Παραλαβή από το κατάστημα"}})
    sweets = await db.categories.find_one({"slug": "sweets"})
    await db.categories.update_one({"slug": "sweets"}, {"$set": {"name": "Γλυκά Καλτσόνε", "image": IMG + "gli-ka-ka_6888289536.webp"}})
    sauces = await db.categories.find_one({"slug": "sauces"})
    if not sauces:
        await db.categories.update_many({"order": {"$gte": sweets["order"]}}, {"$inc": {"order": 1}})
        sauces = {"id": str(uuid.uuid4()), "name": "Αλοιφές", "slug": "sauces", "image": IMG + "aloifes_2121477091.webp", "order": sweets["order"], "active": True, "mode": "all"}
        await db.categories.insert_one(sauces)
    for i, (name, price) in enumerate(SAUCES):
        await db.products.update_one({"name": name, "category_id": sauces["id"]}, {"$set": prod(name, "60ml", price, "", sauces["id"], i, ["νηστίσιμο"] if name in ("Σως BBQ", "Ουγγαρέζα") else []), "$setOnInsert": {"id": str(uuid.uuid4())}}, upsert=True)
    for i, (name, desc, price, img) in enumerate(SWEETS):
        await db.products.update_one({"name": name, "category_id": sweets["id"]}, {"$set": prod(name, desc, price, img, sweets["id"], i), "$setOnInsert": {"id": str(uuid.uuid4())}}, upsert=True)
    # tag lent products
    lent = await db.categories.find_one({"slug": "lent"})
    if lent: await db.products.update_many({"category_id": lent["id"]}, {"$set": {"tags": ["νηστίσιμο", "vegan"]}})
    print("sauces + sweets seeded")

asyncio.run(main())
