import asyncio, os, uuid
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
load_dotenv(Path(__file__).parent / '.env')

IMG = "https://www.telecanto.gr/images/thumbs/"
DELIVERY = [
    ("2 Πίτσες κανονικές 26cm", "2 Πίτσες Κανονικές 8τμχ 26cm", 14.5, "2-pitses-kanonikes-26cm_3310739134.webp", 2, False),
    ("2 Πίτσες Οικογενειακές 30cm", "2 Πίτσες Οικογενειακές 30cm", 18.0, "2-pitses-oikogeneiakes-30cm_120469212.webp", 2, False),
    ("3 Πίτσες Κανονικές 26cm", "3 Πίτσες Κανονικές 8τμχ 26cm", 20.0, "3-pitses-kanonikes-26cm_3785769477.webp", 3, False),
    ("2 Πίτσες κανονικές & Σαλάτα", "2 Κανονικές πίτσες 8τμχ 26cm & Σαλάτα", 20.0, "2-pitses-kanonikes-salata_2334273885.webp", 2, True),
    ("2 Πίτσες Οικογενειακές 30cm & Σαλάτα", "2 Πίτσες Οικογενειακές 30cm & Σαλάτα", 25.0, "2-pitses-oikogeneiakes-30cm-salata_7109977245.webp", 2, True),
    ("3 Πίτσες Οικογενειακές 30cm 8τμχ", "3 Πίτσες Οικογενειακές 30cm 8τμχ", 27.0, "3-pitses-oikogeneiakes-30cm-8tmx_8434139471.webp", 3, False),
]
PICKUP = [
    ("1 Πίτσα Κανονική 26cm", "Παραλαβή από το κατάστημα", 6.5, "1-pitsa-kanonikh-26cm_1206929615.webp", 1, False),
    ("1 Πίτσα Οικογενειακή 30cm", "Παραλαβή από το κατάστημα", 8.0, "1-pitsa-oikogeneiakh-30cm_7087753993.webp", 1, False),
    ("2 Πίτσες κανονικές 26cm", "Παραλαβή από το κατάστημα", 12.5, "2-pitses-kanonikes-26cm_5216072153.webp", 2, False),
    ("1 Πίτσα Κανονική 26cm & Σαλάτα", "Παραλαβή από το κατάστημα", 12.5, "1-pitsa-kanonikh-26cm-salata_8171986022.webp", 1, True),
    ("2 Πίτσες Οικογενειακές 30cm", "Παραλαβή από το κατάστημα", 16.0, "2-pitses-oikogeneiakes-30cm_9458458181.webp", 2, False),
    ("3 Πίτσες Κανονικές 26cm", "Παραλαβή από το κατάστημα", 18.0, "3-pitses-kanonikes-26cm_1986755929.webp", 3, False),
    ("2 Πίτσες κανονικές 26cm & Σαλάτα", "Παραλαβή από το κατάστημα", 18.0, "2-pitses-kanonikes-26cm-salata_576610910.webp", 2, True),
    ("2 Πίτσες Οικογενειακές 30cm & Σαλάτα", "Παραλαβή από το κατάστημα", 22.0, "2-pitses-oikogeneiakes-30cm-salata_2725910608.webp", 2, True),
    ("3 Πίτσες Οικογενειακές 30cm", "Παραλαβή από το κατάστημα", 24.0, "3-pitses-oikogeneiakes-30cm_329304312.webp", 3, False),
]

async def main():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    await db.categories.update_one({"slug": "offers"}, {"$set": {"name": "Προσφορές Delivery", "mode": "delivery"}})
    pk = await db.categories.find_one({"slug": "offers-pickup"})
    if not pk:
        pk = {"id": str(uuid.uuid4()), "name": "Προσφορές Παραλαβή", "slug": "offers-pickup", "image": "", "order": 1, "active": True, "mode": "pickup"}
        await db.categories.insert_one(pk)
    dl = await db.categories.find_one({"slug": "offers"})
    for cat, rows, mode in ((dl, DELIVERY, "delivery"), (pk, PICKUP, "pickup")):
        for i, (name, desc, price, img, n, salad) in enumerate(rows):
            doc = {"name": name, "description": desc, "image": IMG + img, "category_id": cat["id"], "price": price,
                   "sizes": [], "extras": [], "toppings": [], "active": True, "popular": False, "order": i,
                   "mode": mode, "bundle": {"pizzas": n, "salad": salad}}
            await db.products.update_one({"name": name, "category_id": cat["id"]}, {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4())}}, upsert=True)
    print("offers seeded")

asyncio.run(main())
