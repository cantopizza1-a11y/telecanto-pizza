import { useEffect, useState } from "react";
import { http, formatEuro } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { http.get("/admin/dashboard").then((r) => setD(r.data)); }, []);
  if (!d) return <div>Φόρτωση...</div>;
  const cards = [
    { t: "Παραγγελίες σήμερα", v: d.orders_today, id: "kpi-orders" },
    { t: "Πωλήσεις σήμερα", v: formatEuro(d.sales_today), id: "kpi-sales" },
    { t: "Delivery", v: d.delivery_orders, id: "kpi-delivery" },
    { t: "Παραλαβές", v: d.pickup_orders, id: "kpi-pickup" },
    { t: "Μ.Ο. Παραγγελίας", v: formatEuro(d.avg_order), id: "kpi-avg" },
  ];
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-black">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl p-4 border border-slate-200" data-testid={c.id}>
            <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{c.t}</div>
            <div className="text-2xl font-display font-black mt-1 text-slate-900">{c.v}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-4 border border-slate-200">
        <h2 className="font-display font-bold text-lg mb-3">Πωλήσεις 7 ημερών</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <LineChart data={d.chart}>
              <XAxis dataKey="day" tickFormatter={(x) => x.slice(5)} />
              <YAxis />
              <Tooltip formatter={(v) => formatEuro(v)} />
              <Line type="monotone" dataKey="total" stroke="#E01E5A" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-4 border border-slate-200">
        <h2 className="font-display font-bold text-lg mb-3">Δημοφιλέστερα σήμερα</h2>
        <ul className="space-y-2">
          {d.popular.length === 0 && <li className="text-sm text-slate-500">Δεν υπάρχουν παραγγελίες σήμερα.</li>}
          {d.popular.map(([n, c]) => (
            <li key={n} className="flex justify-between text-sm"><span>{n}</span><span className="font-bold text-brand">×{c}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
