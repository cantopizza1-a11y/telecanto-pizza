# Telecanto Pizza — Online Ordering

Full-stack σύστημα online παραγγελιών (React + FastAPI + MongoDB). 100% δικός σας κώδικας, χωρίς vendor lock-in.

## Διευθύνσεις
- **Κατάστημα (πελάτες):** `https://<domain>/`
- **Admin Panel:** `https://<domain>/admin` (σύνδεση με τον λογαριασμό διαχειριστή)
- **Ticket εκτύπωσης:** `https://<domain>/admin/print/<orderId>`

## Εγκατάσταση Admin Panel στον υπολογιστή (PWA)
1. Ανοίξτε **Chrome** ή **Edge** και μπείτε στο `https://<domain>/admin/orders`.
2. Συνδεθείτε με τον λογαριασμό admin.
3. Πατήστε το κουμπί **«Εγκατάσταση στον υπολογιστή»** στο κάτω μέρος του μενού, ή το εικονίδιο εγκατάστασης ⊕ στη γραμμή διευθύνσεων του browser (Chrome: «Εγκατάσταση Telecanto Admin»).
4. Δημιουργείται εικονίδιο «Telecanto Admin» στην επιφάνεια εργασίας / Start menu που ανοίγει απευθείας τις Παραγγελίες σε δικό του παράθυρο.
5. Αφήστε το παράθυρο ανοιχτό: κάθε νέα παραγγελία εμφανίζεται αυτόματα (ανανέωση κάθε 8") με ήχο (κουμπί «Ήχος ON/OFF»).

> Στο κινητό/tablet: Chrome (Android) → μενού ⋮ → «Προσθήκη στην αρχική οθόνη». Safari (iOS) → Κοινή χρήση → «Προσθήκη στην αρχική οθόνη».

## Τοπική εκτέλεση
```bash
# Backend
cd backend && pip install -r requirements.txt
# .env: MONGO_URL=mongodb://localhost:27017  DB_NAME=telecanto  JWT_SECRET=...  ADMIN_EMAIL=...  ADMIN_PASSWORD=...
uvicorn server:app --host 0.0.0.0 --port 8001

# Frontend
cd frontend && yarn && yarn start   # .env: REACT_APP_BACKEND_URL=http://localhost:8001
```

## Δεδομένα (seed scripts, ασφαλή για επανεκτέλεση)
`python backend/seed_data.py` (βασικό μενού) · `seed_offers.py` · `seed_extra_menu.py` · `seed_sauces_sweets.py` · `seed_appetizers.py` · `seed_more_pizzas.py`

## Backup / Migration MongoDB
```bash
mongodump --uri="$MONGO_URL" --db=$DB_NAME --out=./backup-$(date +%F)
mongorestore --uri="<new MONGO_URL>" --db=$DB_NAME ./backup-YYYY-MM-DD/$DB_NAME
```

## Πληρωμές
Μετρητά (delivery & παραλαβή), Κάρτα στο κατάστημα/POS (μόνο παραλαβή). IRIS: flag `iris_enabled` στις Ρυθμίσεις — χρειάζεται σύνδεση με τον πάροχο της τράπεζας.
