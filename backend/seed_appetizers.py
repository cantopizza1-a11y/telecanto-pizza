import asyncio, os, uuid
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
load_dotenv(Path(__file__).parent / '.env')

IMG = "https://www.telecanto.gr/images/thumbs/"
ITEMS = [
    ("Ψωμάκι", "", 0.5, ""),
    ("Πατάτες τηγανητές", "", 2.5, "patates-thganhtes_4835495548.webp"),
    ("Πατάτες με cheddar & μπέικον", "", 4.0, "patates-me-cheddar-mpeikon_6949592274.webp"),
    ("Πατάτες με Bbq & μπέικον", "", 4.0, "patates-me-bbq-mpeikon_7449402664.webp"),
    ("Πατάτες με cheddar & τριμμένη παρμεζάνα", "", 4.0, "patates-me-cheddar-trimmenh-parmezana_6434095867.webp"),
    ("10 Κοτομπουκιές", "", 5.0, "10-kotompoykies_4528517430.webp"),
    ("Loaded fries crispy chicken burger bowl (Ατομική μερίδα)", "Τηγανιτές πατάτες με cheddar, κοτομπουκιές, μαρούλι, κύβους ντομάτας, μαγιονέζα & κέτσαπ", 5.5, "loaded-fries-crispy-chicken-burger-bowlatomikh-merida_5080471886.webp"),
    ("Φιλετίνια κοτόπουλο", "Φιλετίνια κοτόπουλο (5τμχ), sauce tartare & sauce cheddar", 5.5, "filetinia-kotopoylo_4876955182.webp"),
    ("Τηγανητές πατάτες με sauce cheddar & λουκάνικο πιροσκί (ατομική μερίδα)", "", 5.5, "thganhtes-patates-me-sauce-cheddar-loykaniko-piroski-atomikh-merida_1211367460.webp"),
    ("Λουκάνικο Μεξικάνα μερίδα", "", 6.0, "loykaniko-meksikana-merida_8421315762.webp"),
    ("Λουκάνικο γίγας μερίδα", "Συνοδεύεται από πατάτες τηγανητές, ντομάτα, μαρούλι, ketchup & μουστάρδα", 6.0, "loykaniko-gigas-merida_6839684261.webp"),
    ("Σάντουιτς Αλλαντικών", "Μεγάλο φρεσκοψημένο χειροποίητο ψωμάκι με μαγιονέζα, μαρούλι, ζαμπόν, πιπερόνε, gouda και ντομάτα.", 6.5, "santoyits-allantikwn_4576383175.webp"),
    ("Σκορδόψωμο με μοτσαρέλα", "", 7.0, "skordopswmo-me-motsarela_2893877561.webp"),
    ("Σκορδόψωμο με μοτσαρέλα, ελιές & κρεμμύδι", "", 7.0, "skordopswmo-me-motsarela-elies-kremmydi_7148999608.webp"),
    ("Σκορδόψωμο με φέτα, ντομάτα & μοτσαρέλα", "", 7.5, "skordopswmo-me-feta-ntomata-motsarela_1038121901.webp"),
    ("Μπιφτέκι μερίδα", "2 Τεμάχια. Συνοδεύεται από πατάτες τηγανητές, τυρί, ντομάτα, μαρούλι, ketchup & μουστάρδα", 7.5, "mpifteki-merida_7435717651.webp"),
    ("Πατάτες τηγανητές με σως τυριών, μπέικον & μανιτάρια", "Τηγανητές πατάτες με σως τυριών, μπέικον & μανιτάρια", 7.5, "patates-thganhtes-me-sws-tyriwn-mpeikon-manitaria_5888252466.webp"),
    ("Πεινιρλί γίγας", "Πεινιρλί γίγας με γέμιση τυρί gouda, ζαμπόν, μπέικον & πιπερόνε", 7.5, "peinirli-gigas_5390733660.webp"),
    ("Loaded fries crispy chicken burger bowl 1100ml", "Τηγανιτές πατάτες με cheddar, κοτομπουκιές, μαρούλι, κύβους ντομάτας, μαγιονέζα & κέτσαπ", 7.5, "loaded-fries-crispy-chicken-burger-ball_8036413569.webp"),
    ("Σνίτσελ κοτόπουλο γεμιστό μερίδα", "2 Τεμάχια. Συνοδεύεται από πατάτες τηγανητές, τυρί, ντομάτα, μαρούλι, ketchup & μουστάρδα", 8.0, "snitsel-kotopoylo-gemisto-merida_9772233093.webp"),
    ("Red meatballs & fries", "Ζουμερά κεφτεδάκια με σάλτσα Ναπολιτάνα & τηγανιτές πατάτες", 8.0, "red-meatballs-fries_2439245434.webp"),
    ("Stromboli Pepperoni & gouda", "Γεμιστό με πεπερόνι & gouda, αλειμμένο με garlic butter, παρμεζάνα, μαϊντανό & αποξηραμένο κρεμμύδι. Συνοδεύεται με τηγανητές πατάτες & σως ketchup", 10.0, "stromboli-pepperoni-gouda_6898287566.webp"),
]

async def main():
    db = AsyncIOMotorClient(os.environ['MONGO_URL'])[os.environ['DB_NAME']]
    cat = await db.categories.find_one({"slug": "appetizers"})
    await db.products.delete_many({"category_id": cat["id"]})
    for i, (name, desc, price, img) in enumerate(ITEMS):
        await db.products.insert_one({"id": str(uuid.uuid4()), "name": name, "description": desc, "image": (IMG + img) if img else "",
            "category_id": cat["id"], "price": price, "sizes": [], "extras": [], "toppings": [], "active": True,
            "popular": name.startswith("Loaded fries") and "1100" not in name, "order": i, "mode": "all", "bundle": None, "tags": []})
    print("appetizers:", await db.products.count_documents({"category_id": cat["id"]}))

asyncio.run(main())
