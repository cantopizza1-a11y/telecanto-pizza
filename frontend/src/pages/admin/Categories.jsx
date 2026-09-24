import { useEffect, useState } from "react";
import { http } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function AdminCategories() {
  const [items, setItems] = useState([]);
  const [f, setF] = useState({ name: "", slug: "", image: "" });
  const load = () => http.get("/admin/categories").then((r) => setItems(r.data));
  useEffect(() => { load(); }, []);
  const add = async () => {
    if (!f.name || !f.slug) return toast.error("Όνομα & slug");
    await http.post("/admin/categories", { ...f, order: items.length });
    setF({ name: "", slug: "", image: "" }); load();
  };
  const upd = async (c, patch) => { await http.put(`/admin/categories/${c.id}`, patch); load(); };
  const del = async (id) => { if (!window.confirm("Διαγραφή;")) return; await http.delete(`/admin/categories/${id}`); load(); };
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-black">Κατηγορίες</h1>
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex gap-2 flex-wrap">
        <Input placeholder="Όνομα" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="cat-name" />
        <Input placeholder="slug (π.χ. pizzas)" value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} data-testid="cat-slug" />
        <Input placeholder="URL εικόνας" value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} />
        <Button onClick={add} className="rounded-full bg-brand hover-brand" data-testid="cat-add"><Plus className="w-4 h-4 mr-1" />Προσθήκη</Button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr className="text-left"><th className="p-3">Όνομα</th><th className="p-3">Slug</th><th className="p-3">Σειρά</th><th className="p-3">Για</th><th className="p-3">Ενεργή</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="p-3"><Input value={c.name} onChange={(e) => upd(c, { name: e.target.value })} /></td>
                <td className="p-3 text-slate-500">{c.slug}</td>
                <td className="p-3"><Input type="number" value={c.order} onChange={(e) => upd(c, { order: parseInt(e.target.value) || 0 })} className="w-20" /></td>
                <td className="p-3"><select value={c.mode || "all"} onChange={(e) => upd(c, { mode: e.target.value })} className="h-9 border border-slate-200 rounded-lg px-2 text-xs" data-testid={`cat-mode-${c.slug}`}>
                  <option value="all">Όλα</option><option value="delivery">Delivery</option><option value="pickup">Παραλαβή</option></select></td>
                <td className="p-3"><Switch checked={c.active} onCheckedChange={(v) => upd(c, { active: v })} /></td>
                <td className="p-3"><button onClick={() => del(c.id)} className="text-red-500"><Trash2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
