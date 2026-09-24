# Telecanto Pizza — PRD

## Original problem
Full production-ready online ordering website + admin panel για Telecanto Pizza (Αναλήψεως 174, Βόλος, από 1998). Mobile-first, με εμπειρία Wolt/e-food αλλά δικό μας design. Cash + IRIS μόνο (χωρίς card). Πλήρες ownership, portable, χωρίς vendor lock-in.

## Stack
- Backend: FastAPI + MongoDB + JWT auth (bcrypt)
- Frontend: React 19 + Tailwind + shadcn/ui + Recharts + Sonner
- Portability: Full source (Git-ready), MongoDB export/backup, no proprietary vendor SDKs

## Personas
- **Πελάτης**: παραγγέλνει delivery/pickup, guest ή registered (με loyalty)
- **Owner/Admin (cantopizza1@gmail.com)**: διαχειρίζεται προϊόντα, παραγγελίες, ώρες, ζώνες, ρυθμίσεις

## Implemented (v1 — Feb 2026)
- Auth: register / login / me, JWT, admin seed
- Menu: 10 κατηγορίες, 55 προϊόντα από πραγματικό Telecanto scraping
- Product modal: sizes, extras, quantity, notes, LIVE price
- Cart (localStorage) + sticky mobile bar
- 5-step checkout: mode → info → address+zone → payment → total
- Payments: Cash (+ IRIS toggle-ready), NO card
- Order flow: new → confirmed → preparing → ready → delivering → completed / cancelled
- Admin: Dashboard (KPIs + 7-day chart + popular), Orders (live poll+alert), Products (CRUD + image upload base64), Categories, Delivery Zones, Settings (store open, hours per day, payments toggle, IRIS AFM/DOY, loyalty)
- Loyalty: αυτόματοι πόντοι ανά € στην ολοκλήρωση, εμφάνιση στο account
- Favorites (καρδιά), Search, guest checkout

## Implemented (v2 — Sep 2026)
- E2E testing agent: iteration_1 (MVP) + iteration_2 (Phase 2) — backend 40/40, frontend green after fixes
- Προσφορές: τύποι bogo (1+1) / percent / fixed / combo, προαιρετικός κωδικός κουπονιού, min_order, mode (all/delivery/pickup), κατηγορίες/προϊόντα. Admin UI /admin/offers. Server-side recompute subtotal/discount/delivery_fee/total στο POST /orders. Public /api/offers (χωρίς κουπόνια), POST /api/offers/apply (preview). Home OffersStrip, Cart discount line, Checkout CouponBox
- Προγραμματισμένες παραγγελίες: SchedulePicker στο checkout (≥25' μετά), validation backend, εμφάνιση σε admin/ticket/confirm
- Print ticket 80mm: /admin/print/:id (auto window.print), κουμπί στο Orders
- PWA: manifest.json, sw.js (prod only), icons, apple-touch-icon
- SEO: title/meta/OG, Restaurant JSON-LD, robots.txt, sitemap.xml (URLs point to preview domain — αλλαγή σε telecanto domain πριν go-live)
- Πραγματικό logo (/logo.png) σε header/admin
- Fixes: Audio.play overlay bug στο admin orders, guest order confirmation (public GET /api/orders/{id}), checkout redirect race
- Πίτσες: +17 από telecanto.gr/e-food (Chicken BBQ, Creamy Chicken, Hot Dog, Σως Μουστάρδας, A la Chef, Αυγό, Μποσκαγιόλα, Νηστίσιμη, Light γαλοπούλα/κοτόπουλο, Vegan BBQ, Agrotica, Potato, Corn&onion, Verdure, Veggie grill, Πατάτες&Cheddar) → 36 πίτσες (seed_more_pizzas.py). Ορεκτικά: 22 προϊόντα (seed_appetizers.py). Προσφορές Delivery & Παραλαβή εμφανίζονται πάντα με badge mode + auto-switch. Fix: admin Categories/Zones/Products blank page (useEffect(load) → destroy is not a function)
- Ετικέτες προϊόντων στο Admin (Νηστίσιμο / Vegan / Καυτερό / Νέο) — chips στη φόρμα προϊόντος, badge στη λίστα admin & στις κάρτες storefront; «νηστίσιμο» τροφοδοτεί το φίλτρο vegan
- Αλοιφές (5) & Γλυκά Καλτσόνε (3) από telecanto.gr (seed_sauces_sweets.py); κουμπί «Μόνο νηστίσιμα / vegan» στην αρχική (φιλτράρει με product.tags «νηστίσιμο»); logo μεγαλύτερο (h-20); «Προσφορές Παραλαβή από το κατάστημα»
- Μενού telecanto.gr (Sep 2026): κατηγορίες «Πίτσες Τυρολίνα» (8 προϊόντα, μετά τις Πίτσες) & «Νηστίσιμο Μενού» (14 προϊόντα, τελευταία) από seed_extra_menu.py με εικόνες telecanto.gr 2 κατηγορίες «Προσφορές Delivery» (6 πακέτα) & «Προσφορές Παραλαβή» (9 πακέτα) από seed_offers.py, με εικόνες telecanto.gr. Product/Category `mode` (all/delivery/pickup) → εμφάνιση μόνο στο αντίστοιχο mode, backend guard στο POST /orders. Product `bundle` {pizzas, salad} → ο πελάτης διαλέγει πίτσες/σαλάτα στο modal (item.choices), εμφάνιση σε cart/admin/ticket. Admin Products: πεδία mode + bundle, Admin Categories: mode

## Backlog
- P1: IRIS πραγματική διασύνδεση με πάροχο (Viva/NBG/Piraeus), "Φτιάξε τη δική σου πίτσα" wizard (user skipped for now)
- P2: Thermal printer auto-print (Wi-Fi/LAN), per-size extras, Νηστίσιμο μενού filter, sitemap/canonical σε production domain, ώρες λειτουργίας → auto store_open
