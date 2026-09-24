import asyncio, os, uuid
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
load_dotenv(Path(__file__).parent / '.env')

IMG = "https://www.telecanto.gr/images/thumbs/"
PIZZA_SIZES = [{"label": "26cm (8 τμχ)", "price": 0}, {"label": "30cm (Οικογενειακή)", "price": 4.0}, {"label": "36cm (Γίγας)", "price": 8.0}]
VEGAN_EXTRAS = [{"name": "Έξτρα φυτικό τυρί", "price": 1.5}, {"name": "Μανιτάρια", "price": 1.0}, {"name": "Πιπεριά", "price": 1.0}, {"name": "Ελιές", "price": 1.0}, {"name": "Καλαμπόκι", "price": 1.0}]

TYROLINA = [
    ("Cheddar Κανονική 8τμχ 26cm", "Με γέμιση στις άκρες τυρί cheddar", 10.5, "cheddar-kanonikh-8tmx-26cm_6179444371.webp"),
    ("Pizza Τυρολίνα Οικογενειακή 30cm", "Pizza Τυρολίνα Οικογενειακή 30cm με γέμιση στις άκρες τυρί gouda", 13.0, "pizza-tyrolina-oikogeneiakh-30cm_2420421091.webp"),
    ("Pizza Philadelphia Οικογενειακή 30cm", "Pizza Philadelphia Οικογενειακή 30cm με γέμιση στις άκρες τυρί Φιλαδέλφεια", 13.0, "pizza-philadelphia-oikogeneiakh-30cm_7908501329.webp"),
    ("Pizza Πιροσκί Οικογενειακή 30cm", "Pizza Πιροσκί Οικογενειακή 30cm με γέμιση στις άκρες λουκάνικο πιροσκί", 13.0, "pizza-piroski-oikogeneiakh-30cm_47143466.webp"),
    ("Cheddar Οικογενειακή 8τμχ 30cm", "Με γέμιση στις άκρες τυρί cheddar", 13.5, "cheddar-oikogeneiakh-8tmx-30cm_7231700250.webp"),
    ("Pizza Τυρολίνα Μεγάλη 36cm", "Pizza Τυρολίνα Μεγάλη 36cm με γέμιση στις άκρες τυρί gouda", 16.0, "pizza-tyrolina-megalh-36cm_3099978827.webp"),
    ("Pizza Philadelphia Μεγάλη 36cm", "Pizza Philadelphia Μεγάλη 36cm με γέμιση στις άκρες τυρί φιλαδέλφεια", 16.0, "pizza-philadelphia-megalh-36cm_2210688866.webp"),
    ("Pizza Πιροσκί Μεγάλη 36cm", "Pizza Πιροσκί Μεγάλη 36cm με γέμιση στις άκρες λουκάνικο πιροσκί", 16.0, "pizza-piroski-megalh-36cm_1695777245.webp"),
]
# (name, desc, price, img, is_pizza)
LENT = [
    ("Ζυμαρικά Napoli", "Με σάλτσα ναπολιτάνα & νηστίσιμο τυρί", 6.0, "zymarika-napoli_8447569053.webp", False),
    ("Ζυμαρικά λαχανικών", "Με σως ντομάτας, πιπεριά, μανιτάρια & νηστίσιμο τυρί", 6.0, "zymarika-laxanikwn_1642398306.webp", False),
    ("Σαλάτα vegetarian 1100ml", "", 7.0, "salata-vegetarian-1100ml_3496114743.webp", False),
    ("Verde vegan", "Με σάλτσα ντομάτας, τυρί νηστίσιμο, μανιτάρια, κρεμμύδι & πιπεριά", 7.5, "verde-vegan_2479838569.webp", True),
    ("Νηστίσιμη", "Με σάλτσα ντομάτας, τυρί νηστίσιμο, πράσινη πιπεριά, κόκκινη πιπεριά & μανιτάρια", 7.5, "nhstisimh_2918360669.webp", True),
    ("Μαργαρίτα νηστίσιμη", "Με σάλτσα ντομάτας & τυρί νηστίσιμο", 7.5, "margarita_784838225.webp", True),
    ("Μπιφτέκι λαχανικών μερίδα", "2 Τεμάχια. Συνοδεύεται από πατάτες τηγανητές & pickle mayo sauce", 7.5, "mpifteki-laxanikwn-merida_9580529642.webp", False),
    ("Μπιφτέκι φαλάφελ μερίδα", "2 Τεμάχια. Συνοδεύεται από πατάτες τηγανητές & bbq σως", 7.5, "mpifteki-falafel-merida_7493411807.webp", False),
    ("Corn & onion delight Vegan", "Με σάλτσα ντομάτας, τυρί φυτικό, καλαμπόκι & κρεμμύδι", 8.5, "corn-onion-delight-vegan_9723968064.webp", True),
    ("Verdure vegan", "Με σάλτσα ντομάτας, τυρί φυτικό, μπρόκολο, κουνουπίδι & καρότο", 8.5, "verdure-vegan_2529820132.webp", True),
    ("Agrotica vegan", "Με σάλτσα ντομάτας, φυτικό τυρί, καλαμπόκι, κρεμμύδι, μανιτάρια & πράσινη πιπεριά", 8.5, "agrotica-vegan_8967559020.webp", True),
    ("Veggie grill vegan", "Με σάλτσα ντομάτας, φυτικό τυρί, μελιτζάνες, κολοκυθάκια & πολύχρωμες πιπεριές", 8.5, "veggie-grill-vegan_1270974984.webp", True),
    ("BBQ vegan", "Με σάλτσα BBQ, τυρί από άμυλο σιταριού & πατάτες τηγανητές", 8.5, "bbq-vegan_2473970147.webp", True),
    ("Πίτσα potato", "Με σάλτσα ντομάτας, τυρί νηστίσιμο & πατάτες τηγανητές", 8.5, "pitsa-potato_6380704005.webp", True),
]

async def cat(db, slug, name, order, image):
    c = await db.categories.find_one({"slug": slug})
    if not c:
        c = {"id": str(uuid.uuid4()), "name": name, "slug": slug, "image": IMG + image, "order": order, "active": True, "mode": "all"}
        await db.categories.insert_one(c)
    return c

async def main():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    # shift categories after pizzas (order 2) by one to fit Τυρολίνα right after Πίτσες
    ty = await db.categories.find_one({"slug": "tyrolina"})
    if not ty:
        await db.categories.update_many({"order": {"$gte": 3}}, {"$inc": {"order": 1}})
    ty = await cat(db, "tyrolina", "Πίτσες Τυρολίνα", 3, "pitses-turolina_7376980140.webp")
    last = await db.categories.find_one(sort=[("order", -1)])
    lent = await cat(db, "lent", "Νηστίσιμο Μενού", (last["order"] + 1) if last["slug"] != "lent" else last["order"], "")
    for i, (name, desc, price, img) in enumerate(TYROLINA):
        doc = {"name": name, "description": desc, "image": IMG + img, "category_id": ty["id"], "price": price,
               "sizes": [], "extras": [], "toppings": [], "active": True, "popular": False, "order": i, "mode": "all", "bundle": None}
        await db.products.update_one({"name": name, "category_id": ty["id"]}, {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4())}}, upsert=True)
    for i, (name, desc, price, img, is_pizza) in enumerate(LENT):
        doc = {"name": name, "description": desc, "image": IMG + img, "category_id": lent["id"], "price": price,
               "sizes": PIZZA_SIZES if is_pizza else [], "extras": VEGAN_EXTRAS if is_pizza else [], "toppings": [],
               "active": True, "popular": False, "order": i, "mode": "all", "bundle": None, "tags": ["νηστίσιμο", "vegan"]}
        await db.products.update_one({"name": name, "category_id": lent["id"]}, {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4())}}, upsert=True)
    print("tyrolina + lent seeded")

asyncio.run(main())
