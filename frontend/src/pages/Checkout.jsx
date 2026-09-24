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
import { Truck, Store, Banknote, QrCode } from "lucide-react";
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
  const [form, setForm] = useState({
    name: user?.name || "", phone: user?.phone || "",
    area: "", address: "", address_number: "", floor: "", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
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

  const submit = async () => {
    if (!form.name || !form.phone) return toast.error("Συμπλήρωσε όνομα & τηλέφωνο");
    if (mode === "delivery" && (!form.address || !zoneId)) return toast.error("Συμπλήρωσε διεύθυνση & ζώνη");
    if (scheduledFor && new Date(scheduledFor).getTime() < Date.now() + 25 * 60000) return toast.error("Η ώρα πρέπει να είναι τουλάχιστον 25' μετά");
    setSubmitting(true);
    try {
      setDone(true);
      const { data } = await http.post("/orders", {
        items, mode, customer_name: form.name, customer_phone: form.phone,
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
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Στοιχεία πελάτη</div>
          <Input placeholder="Όνομα" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-name" />
          <Input placeholder="Τηλέφωνο" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="input-phone" />
        </div>

        {/* Address */}
        {mode === "delivery" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 mt-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">3. Διεύθυνση</div>
            <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} data-testid="select-zone"
              className="w-full h-11 border border-slate-200 rounded-xl px-3">
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
            {settings.iris_enabled && (
              <label className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer ${payment === "iris" ? "border-brand bg-accent" : "border-slate-200"}`} data-testid="pay-iris">
                <RadioGroupItem value="iris" />
                <QrCode className="w-5 h-5 text-slate-600" />
                <span className="font-bold">IRIS</span>
              </label>
            )}
          </RadioGroup>
          <p className="text-xs text-slate-500">Χωρίς πιστωτική κάρτα · Cash & IRIS μόνο</p>
        </div>

        {/* Totals */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mt-3 space-y-2">
          <CouponBox codeValid={offers.code_valid} />
          <div className="flex justify-between text-sm"><span>Υποσύνολο</span><span>{formatEuro(subtotal)}</span></div>
          {offers.applied?.map((a) => (
            <div key={a.id} className="flex justify-between text-sm text-emerald-700 font-semibold" data-testid={`applied-offer-${a.id}`}><span>{a.title}</span><span>-{formatEuro(a.discount)}</span></div>
          ))}
          {mode === "delivery" && <div className="flex justify-between text-sm"><span>Delivery</span><span>{formatEuro(deliveryFee)}</span></div>}
          <div className="flex justify-between font-display font-black text-xl pt-2 border-t border-slate-100"><span>Σύνολο</span><span className="text-brand">{formatEuro(total)}</span></div>
          <Button disabled={submitting} onClick={submit} data-testid="submit-order-btn"
            className="w-full rounded-full bg-brand hover-brand h-12 font-bold text-base mt-2">
            {submitting ? "Αποστολή…" : "Ολοκλήρωση Παραγγελίας"}
          </Button>
        </div>
      </div>
    </div>
  );
}
