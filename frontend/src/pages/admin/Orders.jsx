import { useEffect, useRef, useState } from "react";
import { http, formatEuro, STATUS_LABELS, STATUS_COLORS } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Printer, Volume2, VolumeX } from "lucide-react";
import { playNewOrderSound, soundEnabled, setSoundEnabled, unlockAudio } from "@/lib/sound";

const FLOW = ["new", "confirmed", "preparing", "ready", "delivering", "completed"];

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [sel, setSel] = useState(null);
  const seenIds = useRef(new Set());
  const [newCount, setNewCount] = useState(0);
  const [sound, setSound] = useState(soundEnabled());
  const toggleSound = () => { const on = !sound; setSound(on); setSoundEnabled(on); if (on) { unlockAudio(); playNewOrderSound(); } };

  const load = () => http.get("/admin/orders").then((r) => {
    const fresh = r.data.filter((o) => o.status === "new" && !seenIds.current.has(o.id));
    r.data.forEach((o) => seenIds.current.add(o.id));
    if (fresh.length > 0 && seenIds.current.size > fresh.length) {
      setNewCount((c) => c + fresh.length);
      playNewOrderSound();
    }
    setOrders(r.data);
  });

  useEffect(() => {
    load(); const i = setInterval(load, 8000);
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => { clearInterval(i); window.removeEventListener("pointerdown", unlock); };
  }, []);

  const setStatus = async (id, status) => {
    await http.put(`/admin/orders/${id}/status`, { status });
    load();
    if (sel?.id === id) setSel((s) => ({ ...s, status }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-black">Παραγγελίες</h1>
        <div className="flex items-center gap-2">
          <button onClick={toggleSound} data-testid="sound-toggle" title={sound ? "Ήχος ενεργός" : "Ήχος ανενεργός"}
            className={`h-10 px-3 rounded-full border-2 font-bold text-sm flex items-center gap-2 ${sound ? "border-emerald-500 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-500"}`}>
            {sound ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}<span className="hidden sm:inline">{sound ? "Ήχος ON" : "Ήχος OFF"}</span>
          </button>
        {newCount > 0 && (
          <button onClick={() => setNewCount(0)} data-testid="new-orders-badge"
            className="bg-brand text-white px-4 py-2 rounded-full font-bold new-order-pulse">
            {newCount} Νέες!
          </button>
        )}
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2 max-h-[75vh] overflow-y-auto">
          {orders.length === 0 && <p className="text-slate-500 text-sm">Καμία παραγγελία ακόμη.</p>}
          {orders.map((o) => (
            <button key={o.id} onClick={() => setSel(o)} data-testid={`order-row-${o.id}`}
              className={`w-full text-left bg-white border-2 rounded-2xl p-4 ${sel?.id === o.id ? "border-brand" : "border-slate-200"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-mono text-xs text-slate-400">#{o.id.slice(0, 8)}</div>
                  <div className="font-display font-bold">{o.customer_name}</div>
                  <div className="text-xs text-slate-500">{o.customer_phone} · {o.mode === "delivery" ? "Delivery" : "Παραλαβή"}</div>
                </div>
                <div className="text-right">
                  <div className={`inline-block text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</div>
                  <div className="font-bold text-brand mt-1">{formatEuro(o.total)}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        {sel && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sticky top-4 self-start" data-testid="order-detail">
            <div className="text-xs text-slate-400 font-mono">#{sel.id.slice(0, 8)}</div>
            <div className="font-display font-black text-xl">{sel.customer_name}</div>
            <div className="text-sm text-slate-600">{sel.customer_phone}</div>
            {sel.mode === "delivery" && <div className="text-sm mt-1">{sel.address} {sel.address_number} · {sel.area} {sel.floor && `· Όροφος ${sel.floor}`}</div>}
            {sel.notes && <div className="text-xs italic text-slate-500 mt-1">{sel.notes}</div>}
            {sel.scheduled_for && <div className="text-xs font-bold text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-2 inline-block" data-testid="order-scheduled">Προγραμματισμένη: {new Date(sel.scheduled_for).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}</div>}
            <div className="mt-3 space-y-1 text-sm border-t pt-3">
              {sel.items.map((it, i) => (
                <div key={i} className="flex justify-between">
                  <span>{it.quantity}× {it.name}{it.size ? ` (${it.size})` : ""}{it.choices?.length > 0 && <span className="block text-xs text-slate-500">{it.choices.join(" · ")}</span>}</span>
                  <span>{formatEuro(it.line_total)}</span>
                </div>
              ))}
              {sel.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Έκπτωση {sel.applied_offers?.map((a) => a.title).join(", ")}</span><span>-{formatEuro(sel.discount)}</span></div>}
              <div className="flex justify-between pt-2 border-t"><span>Delivery</span><span>{formatEuro(sel.delivery_fee)}</span></div>
              <div className="flex justify-between font-black text-brand text-lg"><span>Σύνολο</span><span>{formatEuro(sel.total)}</span></div>
              <div className="text-xs text-slate-500">Πληρωμή: {{ cash: "Μετρητά", card_pos: "Κάρτα στο κατάστημα", iris: "IRIS" }[sel.payment_method] || sel.payment_method}</div>
            </div>
            <Button variant="outline" size="sm" onClick={() => window.open(`/admin/print/${sel.id}`, "_blank", "width=420,height=700")}
              className="mt-3 w-full rounded-full gap-2 font-bold" data-testid="print-ticket-btn"><Printer className="w-4 h-4" /> Εκτύπωση ticket</Button>
            <div className="mt-4 space-y-2">
              <div className="text-xs font-bold uppercase text-slate-500">Κατάσταση</div>
              <div className="flex flex-wrap gap-1">
                {FLOW.map((s) => (
                  <button key={s} onClick={() => setStatus(sel.id, s)} data-testid={`status-${s}`}
                    className={`text-xs px-2 py-1 rounded-full font-bold ${sel.status === s ? "bg-brand text-white" : "bg-slate-100 text-slate-600"}`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
                <button onClick={() => setStatus(sel.id, "cancelled")} data-testid="status-cancel"
                  className="text-xs px-2 py-1 rounded-full font-bold bg-red-100 text-red-700">Ακύρωση</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
