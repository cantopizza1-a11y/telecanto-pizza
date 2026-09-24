import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { http, formatEuro } from "@/lib/api";

export default function PrintTicket() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  useEffect(() => { http.get(`/admin/orders/${id}`).then((r) => setO(r.data)); }, [id]);
  useEffect(() => { if (o) setTimeout(() => window.print(), 400); }, [o]);
  if (!o) return <div className="p-4 text-sm">Φόρτωση…</div>;
  const dt = (s) => new Date(s).toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" });
  return (
    <div className="ticket" data-testid="print-ticket">
      <style>{`
        .ticket{width:72mm;margin:0 auto;padding:4mm;font-family:'Courier New',monospace;font-size:12px;color:#000;background:#fff}
        .ticket .c{text-align:center}.ticket .b{font-weight:700}.ticket .row{display:flex;justify-content:space-between;gap:6px}
        .ticket hr{border:0;border-top:1px dashed #000;margin:6px 0}.ticket .big{font-size:16px}
        @media print{body{margin:0;background:#fff}@page{size:80mm auto;margin:0}}
      `}</style>
      <div className="c b big">TELECANTO PIZZA</div>
      <div className="c">Αναλήψεως 174, Βόλος · 24210 55085</div>
      <hr />
      <div className="row"><span>Παραγγελία</span><span className="b">#{o.id.slice(0, 8).toUpperCase()}</span></div>
      <div className="row"><span>Ώρα</span><span>{dt(o.created_at)}</span></div>
      {o.scheduled_for && <div className="row b"><span>ΠΡΟΓΡΑΜΜΑΤΙΣΜΕΝΗ</span><span>{dt(o.scheduled_for)}</span></div>}
      <div className="row b big"><span>{o.mode === "delivery" ? "DELIVERY" : "ΠΑΡΑΛΑΒΗ"}</span><span>{o.payment_method === "cash" ? "ΜΕΤΡΗΤΑ" : "IRIS"}</span></div>
      <hr />
      <div className="b">{o.customer_name}</div>
      <div>{o.customer_phone}</div>
      {o.mode === "delivery" && <div>{o.address} {o.address_number}{o.floor ? `, όρ. ${o.floor}` : ""} · {o.area}</div>}
      {o.notes && <div className="b">Σημ: {o.notes}</div>}
      <hr />
      {o.items.map((it, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <div className="row b"><span>{it.quantity}x {it.name}</span><span>{formatEuro(it.line_total)}</span></div>
          {it.size && <div>&nbsp;&nbsp;{it.size}</div>}
          {it.extras?.length > 0 && <div>&nbsp;&nbsp;+ {it.extras.map((e) => e.name).join(", ")}</div>}
          {it.notes && <div>&nbsp;&nbsp;* {it.notes}</div>}
        </div>
      ))}
      <hr />
      <div className="row"><span>Υποσύνολο</span><span>{formatEuro(o.subtotal)}</span></div>
      {o.discount > 0 && <div className="row"><span>Έκπτωση</span><span>-{formatEuro(o.discount)}</span></div>}
      {o.mode === "delivery" && <div className="row"><span>Delivery</span><span>{formatEuro(o.delivery_fee)}</span></div>}
      <div className="row b big"><span>ΣΥΝΟΛΟ</span><span>{formatEuro(o.total)}</span></div>
      <hr />
      <div className="c">Ευχαριστούμε! · telecanto.gr</div>
    </div>
  );
}
