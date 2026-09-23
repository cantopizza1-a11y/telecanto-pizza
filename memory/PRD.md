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

## Backlog
- P1: IRIS πραγματική διασύνδεση με πάροχο (Viva/NBG/Piraeus), scheduled orders UI, offers builder UI, "Φτιάξε τη δική σου πίτσα" wizard, PWA manifest + service worker
- P2: Thermal receipt printer (Wi-Fi/LAN), SEO structured data (LocalBusiness, Product), sitemap.xml, per-size extras, Νηστίσιμο μενού filter
