import Header from "@/components/Header";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { http, formatEuro } from "@/lib/api";
import { Trash2, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useOffers } from "@/hooks/useOffers";

export default function Cart() {
  const { items, subtotal, updateQty, removeItem, mode, coupon } = useCart();
  const nav = useNavigate();
  const offers = useOffers(items, mode, coupon);
  const [minFee, setMinFee] = useState(null);
  useEffect(() => { http.get("/zones").then((r) => { const fees = r.data.map((z) => z.fee); if (fees.length) setMinFee(Math.min(...fees)); }).catch(() => {}); }, []);
  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="font-display text-3xl font-black mb-4">Το καλάθι σου</h1>
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
            <p className="text-slate-600 mb-4">Το καλάθι σου είναι άδειο.</p>
            <Link to="/"><Button className="rounded-full bg-brand hover-brand" data-testid="empty-back-btn">Δες το μενού</Button></Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {items.map((it) => (
                <div key={it.key} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-3 items-start" data-testid={`cart-item-${it.product_id}`}>
                  <div className="flex-1">
                    <div className="font-bold">{it.name}</div>
                    {it.size && <div className="text-xs text-slate-500">{it.size}</div>}
                    {it.extras?.length > 0 && <div className="text-xs text-slate-500">+ {it.extras.map((e) => e.name).join(", ")}</div>}
                    {it.choices?.length > 0 && <div className="text-xs text-slate-600 font-semibold">{it.choices.join(" · ")}</div>}
                    {it.notes && <div className="text-xs text-slate-400 italic">{it.notes}</div>}
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => updateQty(it.key, it.quantity - 1)} className="w-8 h-8 rounded-full bg-slate-100"><Minus className="w-4 h-4 mx-auto" /></button>
                      <span className="font-bold w-6 text-center">{it.quantity}</span>
                      <button onClick={() => updateQty(it.key, it.quantity + 1)} className="w-8 h-8 rounded-full bg-slate-100"><Plus className="w-4 h-4 mx-auto" /></button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-display font-black text-brand text-lg">{formatEuro(it.line_total)}</div>
                    <button onClick={() => removeItem(it.key)} className="text-slate-400 hover:text-red-500 mt-2" data-testid={`remove-${it.product_id}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex justify-between text-slate-600"><span>Υποσύνολο προϊόντων</span><span>{formatEuro(subtotal)}</span></div>
              {offers.discount > 0 && <div className="flex justify-between text-emerald-700 font-semibold" data-testid="cart-discount"><span>Προσφορές</span><span>-{formatEuro(offers.discount)}</span></div>}
              <div className="flex justify-between text-slate-500 text-sm" data-testid="cart-delivery-note">
                <span>{mode === "delivery" ? "Κόστος delivery" : "Παραλαβή από το κατάστημα"}</span>
                <span>{mode === "delivery" ? (minFee !== null ? `από +${formatEuro(minFee)} (ανά ζώνη)` : "ανά ζώνη") : formatEuro(0)}</span>
              </div>
              {mode === "pickup" && <div className="flex justify-between font-bold pt-2 mt-2 border-t"><span>Σύνολο</span><span className="text-brand">{formatEuro(Math.max(0, subtotal - (offers.discount || 0)))}</span></div>}
              {mode === "delivery" && <p className="text-[11px] text-slate-400 mt-1">Το τελικό σύνολο υπολογίζεται στο επόμενο βήμα μόλις επιλέξετε ζώνη.</p>}
              <Button onClick={() => nav("/checkout")} data-testid="checkout-btn"
                className="w-full rounded-full bg-brand hover-brand h-12 mt-3 font-bold text-base">Ολοκλήρωση Παραγγελίας</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
