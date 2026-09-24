import { useEffect, useState } from "react";
import { http, formatEuro } from "@/lib/api";
import { BadgePercent } from "lucide-react";

export default function OffersStrip() {
  const [offers, setOffers] = useState([]);
  useEffect(() => { http.get("/offers").then((r) => setOffers(r.data)).catch(() => {}); }, []);
  if (offers.length === 0) return null;
  const label = (o) => o.type === "percent" ? `-${o.value}%` : o.type === "fixed" ? `-${formatEuro(o.value)}` : o.type === "bogo" ? "1+1" : `Πακέτο ${formatEuro(o.value)}`;
  return (
    <section className="mt-6" data-testid="offers-strip">
      <h2 className="font-display text-2xl font-black mb-3 flex items-center gap-2"><BadgePercent className="w-6 h-6 text-brand" />Προσφορές</h2>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {offers.map((o) => (
          <div key={o.id} className="min-w-[240px] bg-brand text-white rounded-2xl p-4 shadow-lg" data-testid={`offer-${o.id}`}>
            <div className="font-display font-black text-2xl">{label(o)}</div>
            <div className="font-bold mt-1">{o.title}</div>
            {o.description && <div className="text-xs opacity-90 mt-1">{o.description}</div>}
            {o.min_order > 0 && <div className="text-[10px] opacity-80 mt-2">Ελάχ. παραγγελία {formatEuro(o.min_order)}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
