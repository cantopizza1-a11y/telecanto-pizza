import asyncio, os, uuid
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
load_dotenv(Path(__file__).parent / '.env')

IMG = "https://www.telecanto.gr/images/thumbs/"
PIZZA_SIZES = [{"label": "26cm (8 τμχ)", "price": 0}, {"label": "30cm (Οικογενειακή)", "price": 4.0}, {"label": "36cm (Γίγας)", "price": 8.0}]
# (name, desc, price, img, tags)
NEW = [
    ("Chicken BBQ", "Με σάλτσα BBQ, gouda, κοτόπουλο, μανιτάρια & sauce BBQ", 9.0, "pizza-barbeque_6124300514.webp", []),
    ("Creamy Chicken", "Με κρέμα γάλακτος, gouda, κοτόπουλο & καλαμπόκι", 8.5, "creamy-chicken_4361438091.webp", []),
    ("Pizza Hot Dog", "Με σάλτσα ντομάτας, gouda & λουκάνικο hot dog", 8.5, "pizza-hot-dog_5184628189.webp", []),
    ("Pizza Σως Μουστάρδας", "Όλα τα αγαπημένα αλλαντικά (ζαμπόν, μπέικον, λουκάνικο) με χειροποίητη σως ντομάτας, τυριά & σως μουστάρδας σε ρόλο έκπληξη!", 8.5, "pizza-sws-moystardas_4117690105.webp", []),
    ("Pizza 'A la Chef", "Σως ντομάτας, gouda, ζαμπόν, τραγανό μπέικον, λουκάνικο & μοναδική Σως Σεφ σε πλέγμα", 8.5, "pizza-a-la-chef_8109942731.webp", []),
    ("Αυγό", "Σπιτική σάλτσα ντομάτας, τραγανό μπέικον, πράσινη πιπεριά & ομελέτα αυγού ψημένη πάνω στην πίτσα", 7.5, "aygo_9113042692.webp", []),
    ("Μποσκαγιόλα", "Σπιτική σάλτσα ντομάτας, ελαφρώς πικάντικο λουκάνικο πιπερόνε, ελιές & τραγανή πράσινη πιπεριά", 7.5, "mposkagiola_6325661262.webp", ["spicy"]),
    ("Νηστίσιμη", "Σπιτική σάλτσα ντομάτας, λιωμένο φυτικό τυρί, φρέσκα μανιτάρια & τραγανές πράσινες πιπεριές", 7.5, "nhstisimh_8981140880.webp", ["νηστίσιμο", "vegan"]),
    ("Light γαλοπούλα", "Σπιτική σάλτσα ντομάτας, gouda, φέτες γαλοπούλας, φρέσκα μανιτάρια & πράσινη πιπεριά", 8.0, "light-galopoyla_5569174018.webp", []),
    ("Light κοτόπουλο", "Σπιτική σάλτσα ντομάτας, τρυφερά κομμάτια κοτόπουλο, φρέσκα μανιτάρια & πράσινη πιπεριά. Χωρίς αλλαντικά!", 8.5, "light-kotopoylo_927773998.webp", []),
    ("Pizza Vegan BBQ", "Πλούσια σως BBQ, λιωμένο φυτικό τυρί & τραγανές τηγανητές πατάτες. Από πάνω πλέγμα BBQ", 8.0, "pizza-vegan-bbq_8207971527.webp", ["νηστίσιμο", "vegan"]),
    ("Agrotica", "Gouda, φρέσκα μανιτάρια, τραγανή πράσινη πιπεριά, κρεμμύδι & καλαμπόκι", 8.0, "agrotica_2535983866.webp", []),
    ("Potato pizza", "Χειροποίητη σως ντομάτας, λιωμένο gouda & τραγανές φρεσκοτηγανισμένες πατάτες", 8.5, "potato-pizza_2447146760.webp", []),
    ("Corn & onion delight", "Με σάλτσα ντομάτας, gouda, καλαμπόκι & κρεμμύδι", 8.5, "corn-onion-delight_2033564158.webp", []),
    ("Verdure", "Με σάλτσα ντομάτας, gouda, κουνουπίδι, μπρόκολο & καρότο", 8.5, "verdure_2897505136.webp", []),
    ("Veggie grill", "Με σάλτσα ντομάτας, gouda, μελιτζάνες, κολοκυθάκια & πολύχρωμες πιπεριές", 8.5, "veggie-grill_2903760353.webp", []),
    ("Πατάτες & Cheddar", "Με σάλτσα ντομάτας, gouda, τηγανητές πατάτες & cheddar sauce", 9.5, "patates-cheddar-kanonikh-8-tmx-26cm_3301900627.webp", []),
]

async def main():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    cat = await db.categories.find_one({"slug": "pizzas"})
    extras = (await db.products.find_one({"category_id": cat["id"], "name": "Μαργαρίτα"}) or {}).get("extras", [])
    base = await db.products.count_documents({"category_id": cat["id"]})
    for i, (name, desc, price, img, tags) in enumerate(NEW):
        doc = {"name": name, "description": desc, "image": IMG + img, "category_id": cat["id"], "price": price,
               "sizes": PIZZA_SIZES, "extras": extras, "toppings": [], "active": True, "popular": False,
               "order": base + i, "mode": "all", "bundle": None, "tags": tags}
        await db.products.update_one({"name": name, "category_id": cat["id"]}, {"$set": doc, "$setOnInsert": {"id": str(uuid.uuid4())}}, upsert=True)
    print("pizzas:", await db.products.count_documents({"category_id": cat["id"]}))

asyncio.run(main())
