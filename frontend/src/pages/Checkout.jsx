import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { http, formatEuro } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Truck, Store, Banknote, QrCode, CreditCard } from "lucide-react";
import CouponBox from "@/components/CouponBox";
import SchedulePicker from "@/components/SchedulePicker";
import { useOffers } from "@/hooks/useOffers";

export default function Checkout() {
  const { items, subtotal, clear, mode, setMode, coupon } = useCart();
  const [scheduledFor, setScheduledFor] = useState(null);
  const offers = useOffers(items, mode, coupon);
  const { user } = useAuth();
  const nav = useNavigate();
  const [zones, setZones] = useState([]);
  const [settings, setSettings] = useState({});
  const [zoneId, setZoneId] = useState("");
  const [payment, setPayment] = useState("cash");
  useEffect(() => { if (mode === "delivery" && payment === "card_pos") setPayment("cash"); }, [mode, payment]);
  const [form, setForm] = useState({
    name: user?.name || "", phone: user?.phone || "", email: user?.email || "",
    area: "", address: "", address_number: "", floor: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    if (user) setForm((f) => ({ ...f, name: f.name || user.name || "", phone: f.phone || user.phone || "", email: f.email || user.email || "" }));
  }, [user]);
  const [done, setDone] = useState(false);

  useEffect(() => {
    http.get("/zones").then((r) => setZones(r.data));
    http.get("/settings").then((r) => setSettings(r.data));
  }, []);

  useEffect(() => { if (items.length === 0 && !done) nav("/"); }, [items, nav, done]);

  const zone = zones.find((z) => z.id === zoneId);
  const deliveryFee = mode === "delivery" ? (zone?.fee || 0) : 0;
  const discount = offers.discount || 0;
  const total = Math.max(0, subtotal - discount) + deliveryFee;

  const phoneOk = /^\+?[0-9\s-]{10,15}$/.test((form.phone || "").trim());
  const emailOk = /^\S+@\S+\.\S+$/.test((form.email || "").trim());
  const [touched, setTouched] = useState(false);
  const minOrder = settings.min_order ?? 8;
  const belowMin = subtotal - discount < minOrder - 0.001;
  const canSubmit = form.name.trim() && phoneOk && emailOk && !belowMin && (mode === "pickup" || (form.address && zoneId));

  const submit = async () => {
    setTouched(true);
    if (belowMin) return toast.error(`Η ελάχιστη παραγγελία είναι ${formatEuro(minOrder)} (χωρίς delivery)`);
    if (!form.name.trim()) return toast.error("Συμπλήρωσε το όνομά σου");
    if (!phoneOk) return toast.error("Συμπλήρωσε έγκυρο τηλέφωνο (10 ψηφία)");
    if (!emailOk) return toast.error("Συμπλήρωσε έγκυρο email για την ειδοποίηση");
    if (mode === "delivery" && (!form.address || !zoneId)) return toast.error("Συμπλήρωσε διεύθυνση & ζώνη");
    if (scheduledFor && new Date(scheduledFor).getTime() < Date.now() + 25 * 60000) return toast.error("Η ώρα πρέπει να είναι τουλάχιστον 25' μετά");
    setSubmitting(true);
    try {
      setDone(true);
      const { data } = await http.post("/orders", {
        items, mode, customer_name: form.name.trim(), customer_phone: form.phone.trim(), customer_email: form.email.trim(),
        address: form.address, area: zone?.name || form.area,
        address_number: form.address_number, floor: form.floor, notes: form.notes,
        payment_method: payment, subtotal, delivery_fee: deliveryFee, discount, total,
        coupon_code: coupon || "", scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
      });
      nav(`/order/${data.id}`, { replace: true });
      clear();
      toast.success("Η παραγγελία καταχωρήθηκε!");
    } catch (e) {
      setDone(false);
      toast.error(e.response?.data?.detail || "Σφάλμα");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <h1 className="font-display text-3xl font-black mb-4">Ολοκλήρωση</h1>

        {/* Mode */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Τρόπος παραλαβής</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode("delivery")} data-testid="checkout-delivery"
              className={`p-3 rounded-xl border-2 font-bold flex items-center gap-2 ${mode === "delivery" ? "border-brand bg-accent text-brand" : "border-slate-200"}`}>
              <Truck className="w-4 h-4" /> Delivery
            </button>
            <button onClick={() => setMode("pickup")} data-testid="checkout-pickup"
              className={`p-3 rounded-xl border-2 font-bold flex items-center gap-2 ${mode === "pickup" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200"}`}>
              <Store className="w-4 h-4" /> Παραλαβή
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 mt-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Στοιχεία πελάτη <span className="text-brand normal-case font-semibold">(όλα υποχρεωτικά)</span></div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Όνομα *</label>
            <Input placeholder="Όνομα" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-name"
              className={touched && !form.name.trim() ? "border-red-400" : ""} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Τηλέφωνο *</label>
            <Input placeholder="π.χ. 6912345678" type="tel" required inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-phone"
              className={touched && !phoneOk ? "border-red-400" : ""} />
            {touched && !phoneOk && <p className="text-xs text-red-600 mt-1" data-testid="phone-error">Απαιτείται έγκυρο τηλέφωνο (10 ψηφία)</p>}
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Email *</label>
            <Input placeholder="π.χ. name@email.com" type="email" required inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-email"
              className={touched && !emailOk ? "border-red-400" : ""} />
            {touched && !emailOk && <p className="text-xs text-red-600 mt-1" data-testid="email-error">Απαιτείται έγκυρο email</p>}
          </div>
          <p className="text-[11px] text-slate-500">Θα σας στείλουμε email μόλις γίνει αποδεκτή η παραγγελία, με τον εκτιμώμενο χρόνο. Το τηλέφωνο χρησιμοποιείται μόνο αν χρειαστεί επικοινωνία.</p>
        </div>

        {/* Address */}
        {mode === "delivery" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 mt-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Διεύθυνση</div>
            <select id="zone-select" value={zoneId} onChange={(e) => setZoneId(e.target.value)} data-testid="select-zone"
              className={`w-full h-11 border-2 rounded-xl px-3 font-semibold ${zoneId ? "border-slate-200" : "border-brand bg-accent/40"}`}>
              <option value="">Επιλογή ζώνης / περιοχής</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name} · {formatEuro(z.fee)}</option>)}
            </select>
            <Input placeholder="Οδός" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} data-testid="input-address" />
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Αριθμός" value={form.address_number} onChange={(e) => setForm({ ...form, address_number: e.target.value })} data-testid="input-number" />
              <Input placeholder="Όροφος" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} data-testid="input-floor" />
            </div>
            <Input placeholder="Σχόλια (κωδικός κουδουνιού κλπ.)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="input-notes" />
          </div>
        )}

        {mode === "pickup" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mt-3">
            <div className="font-bold text-emerald-900">Παραλαβή από:</div>
            <div className="text-sm text-emerald-800">Αναλήψεως 174, Βόλος</div>
          </div>
        )}

        {settings.scheduled_enabled !== false && <SchedulePicker value={scheduledFor} onChange={setScheduledFor} />}

        {/* Payment */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 mt-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">4. Πληρωμή</div>
          <RadioGroup value={payment} onValueChange={setPayment}>
            {settings.cash_enabled !== false && (
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${payment === "cash" ? "border-brand bg-accent" : "border-slate-200"}`} data-testid="pay-cash">
                <RadioGroupItem value="cash" />
                <Banknote className="w-5 h-5 text-slate-600" />
                <span className="font-bold">{mode === "delivery" ? "Μετρητά κατά την παράδοση" : "Μετρητά στο κατάστημα"}</span>
              </label>
            )}
            {mode === "pickup" && (
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${payment === "card_pos" ? "border-brand bg-accent" : "border-slate-200"}`} data-testid="pay-card-pos">
                <RadioGroupItem value="card_pos" />
                <CreditCard className="w-5 h-5 text-slate-600" />
                <span className="font-bold">Πληρωμή με κάρτα στο κατάστημα</span>
              </label>
            )}
            {settings.iris_enabled && (
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${payment === "iris" ? "border-brand bg-accent" : "border-slate-200"}`} data-testid="pay-iris">
                <RadioGroupItem value="iris" />
                <QrCode className="w-5 h-5 text-slate-600" />
                <span className="font-bold">IRIS</span>
              </label>
            )}
          </RadioGroup>
          <p className="text-xs text-slate-500">{mode === "pickup" ? "Μετρητά ή κάρτα (POS) κατά την παραλαβή" : "Χωρίς online κάρτα · Μετρητά κατά την παράδοση"}</p>
        </div>

        {/* Totals */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mt-3 space-y-2">
          <CouponBox codeValid={offers.code_valid} />
          <div className="flex justify-between text-sm"><span>Υποσύνολο προϊόντων</span><span>{formatEuro(subtotal)}</span></div>
          {offers.applied?.map((a) => (
            <div key={a.id} className="flex justify-between text-sm text-emerald-700 font-semibold" data-testid={`applied-offer-${a.id}`}><span>{a.title}</span><span>-{formatEuro(a.discount)}</span></div>
          ))}
          <div className="flex justify-between text-sm items-center" data-testid="checkout-delivery-fee"><span>{mode === "delivery" ? `Κόστος delivery${zone ? ` (${zone.name})` : ""}` : "Παραλαβή από το κατάστημα"}</span>
            {mode === "delivery" && !zone ? (
              <button type="button" data-testid="pick-zone-link" onClick={() => { const el = document.getElementById("zone-select"); el?.scrollIntoView({ behavior: "smooth", block: "center" }); setTimeout(() => el?.focus(), 400); }}
                className="text-brand font-bold underline underline-offset-2">Επίλεξε ζώνη ↑</button>
            ) : <span>{mode === "delivery" ? `+${formatEuro(deliveryFee)}` : formatEuro(0)}</span>}
          </div>
          {belowMin && <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2" data-testid="min-order-note">Ελάχιστη παραγγελία {formatEuro(minOrder)} σε προϊόντα (χωρίς delivery). Λείπουν {formatEuro(minOrder - (subtotal - discount))}.</p>}
          <div className="flex justify-between font-display font-black text-xl pt-2 border-t border-slate-100"><span>Σύνολο</span><span className="text-brand">{formatEuro(total)}</span></div>
          {!canSubmit && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2" data-testid="missing-fields-note">Για να ολοκληρωθεί η παραγγελία συμπληρώστε: {[belowMin && `προϊόντα τουλάχιστον ${formatEuro(minOrder)}`, !form.name.trim() && "όνομα", !phoneOk && "τηλέφωνο", !emailOk && "email", mode === "delivery" && !form.address && "διεύθυνση", mode === "delivery" && !zoneId && "ζώνη"].filter(Boolean).join(", ")}.</p>}
          <Button disabled={submitting} onClick={submit} data-testid="submit-order-btn"
            className={`w-full rounded-full h-12 font-bold text-base mt-2 ${canSubmit ? "bg-brand hover-brand" : "bg-slate-300 text-slate-600 hover:bg-slate-300"}`}>
            {submitting ? "Αποστολή…" : "Ολοκλήρωση Παραγγελίας"}
          </Button>
        </div>
      </div>
    </div>
  );
}
