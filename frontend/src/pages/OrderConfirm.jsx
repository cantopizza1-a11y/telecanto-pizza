import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import { http, formatEuro, STATUS_LABELS } from "@/lib/api";
import { CheckCircle2 } from "lucide-react";

export default function OrderConfirm() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  useEffect(() => {
    const load = () => http.get(`/orders/${id}`).then((r) => setOrder(r.data)).catch(() => {});
    load();
    const i = setInterval(load, 10000);
    return () => clearInterval(i);
  }, [id]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center" data-testid="order-confirm">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-9 h-9 text-emerald-600" />
          </div>
          <h1 className="font-display text-2xl font-black">Η παραγγελία σου καταχωρήθηκε!</h1>
          <p className="text-slate-500 mt-1">{order?.status === "new" ? "Θα την επιβεβαιώσουμε άμεσα — θα λάβετε email με τον χρόνο." : order?.eta_minutes ? `Έγινε αποδεκτή! Εκτίμηση ~${order.eta_minutes}' (${order.mode === "pickup" ? "παραλαβή" : "παράδοση"} έως ${order.eta_at ? new Date(order.eta_at).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" }) : ""})` : "Θα την επιβεβαιώσουμε άμεσα."}</p>
          {order?.customer_email && <p className="text-xs text-slate-400 mt-1" data-testid="confirm-email">Ειδοποιήσεις στο {order.customer_email}</p>}
          {order && (
            <>
              <div className="mt-4 inline-block bg-accent text-brand px-4 py-1 rounded-full text-sm font-bold">
                {STATUS_LABELS[order.status]}
              </div>
              <div className="mt-6 text-left text-sm space-y-1">
                <div className="flex justify-between"><span>Παραγγελία</span><span className="font-mono">#{order.id.slice(0, 8)}</span></div>
                <div className="flex justify-between"><span>Τρόπος</span><span>{order.mode === "delivery" ? "Delivery" : "Παραλαβή"}</span></div>
                {order.scheduled_for && <div className="flex justify-between"><span>Ώρα</span><span>{new Date(order.scheduled_for).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}</span></div>}
                {order.discount > 0 && <div className="flex justify-between text-emerald-700"><span>Έκπτωση</span><span>-{formatEuro(order.discount)}</span></div>}
                <div className="flex justify-between font-bold pt-2 border-t"><span>Σύνολο</span><span className="text-brand">{formatEuro(order.total)}</span></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
