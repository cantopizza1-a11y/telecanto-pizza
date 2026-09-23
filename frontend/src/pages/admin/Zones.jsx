import { useEffect, useState } from "react";
import { http, formatEuro } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";

export default function AdminZones() {
  const [zones, setZones] = useState([]);
  const [f, setF] = useState({ name: "", fee: 0, min_order: 0 });
  const load = () => http.get("/admin/zones").then((r) => setZones(r.data));
  useEffect(load, []);
  const add = async () => {
    if (!f.name) return;
    await http.post("/admin/zones", { name: f.name, fee: parseFloat(f.fee) || 0, min_order: parseFloat(f.min_order) || 0 });
    setF({ name: "", fee: 0, min_order: 0 }); load();
  };
  const upd = async (z, patch) => { await http.put(`/admin/zones/${z.id}`, patch); load(); };
  const del = async (id) => { if (!confirm("Διαγραφή;")) return; await http.delete(`/admin/zones/${id}`); load(); };
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-black">Ζώνες Delivery</h1>
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex gap-2 flex-wrap">
        <Input placeholder="Όνομα ζώνης" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="zone-name" />
        <Input type="number" step="0.1" placeholder="Χρέωση €" value={f.fee} onChange={(e) => setF({ ...f, fee: e.target.value })} data-testid="zone-fee" />
        <Input type="number" step="0.1" placeholder="Ελάχ. €" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} />
        <Button onClick={add} className="rounded-full bg-brand hover-brand" data-testid="zone-add"><Plus className="w-4 h-4 mr-1" />Νέα</Button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr className="text-left"><th className="p-3">Ζώνη</th><th className="p-3">Χρέωση</th><th className="p-3">Ελάχ.</th><th className="p-3">Ενεργή</th><th></th></tr></thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id} className="border-t border-slate-100">
                <td className="p-3"><Input value={z.name} onChange={(e) => upd(z, { name: e.target.value })} /></td>
                <td className="p-3"><Input type="number" step="0.1" value={z.fee} onChange={(e) => upd(z, { fee: parseFloat(e.target.value) || 0 })} className="w-24" /></td>
                <td className="p-3"><Input type="number" step="0.1" value={z.min_order} onChange={(e) => upd(z, { min_order: parseFloat(e.target.value) || 0 })} className="w-24" /></td>
                <td className="p-3"><Switch checked={z.active} onCheckedChange={(v) => upd(z, { active: v })} /></td>
                <td className="p-3"><button onClick={() => del(z.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
