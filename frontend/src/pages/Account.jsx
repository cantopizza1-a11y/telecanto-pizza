import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { http, formatEuro, STATUS_LABELS, STATUS_COLORS } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function Account() {
  const { user, loading } = useAuth();
  const [orders, setOrders] = useState([]);
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && !user) nav("/login");
    if (user) http.get("/orders/mine").then((r) => setOrders(r.data));
  }, [user, loading, nav]);
  if (!user) return null;
  return (
    <div className="min-h-screen">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="font-display text-3xl font-black">Γεια σου, {user.name}</h1>
        <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-4">
          <div className="text-sm text-slate-500">Πόντοι Loyalty</div>
          <div className="text-3xl font-display font-black text-brand" data-testid="loyalty-points">{user.loyalty_points || 0}</div>
        </div>
        <h2 className="font-display text-xl font-bold mt-6 mb-2">Οι παραγγελίες σου</h2>
        <div className="space-y-2">
          {orders.length === 0 && <p className="text-slate-500 text-sm">Καμία παραγγελία ακόμη.</p>}
          {orders.map((o) => (
            <div key={o.id} className="bg-white border border-slate-200 rounded-2xl p-3 flex justify-between items-center" data-testid={`account-order-${o.id}`}>
              <div>
                <div className="font-bold">#{o.id.slice(0, 8)}</div>
                <div className="text-xs text-slate-500">{new Date(o.created_at).toLocaleString("el-GR")}</div>
              </div>
              <div className="text-right">
                <div className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</div>
                <div className="font-bold mt-1">{formatEuro(o.total)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
