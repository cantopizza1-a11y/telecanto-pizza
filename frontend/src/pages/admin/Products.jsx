import { useEffect, useState } from "react";
import { http, formatEuro } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", description: "", image: "", category_id: "", price: 0, sizes: [], extras: [], active: true, popular: false, mode: "all", bundle: null, tags: [] };
const TAGS = [["νηστίσιμο", "Νηστίσιμο"], ["vegan", "Vegan"], ["spicy", "Καυτερό"], ["new", "Νέο"]];

export default function AdminProducts() {
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(empty);
  const load = () => {
    http.get("/admin/products").then((r) => setItems(r.data));
    http.get("/admin/categories").then((r) => setCats(r.data));
  };
  useEffect(() => { load(); }, []);

  const edit = (p) => { setF({ ...empty, ...p, sizes: p.sizes || [], extras: p.extras || [], tags: p.tags || [] }); setOpen(true); };
  const toggleTag = (t) => setF({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] });
  const del = async (id) => { if (!confirm("Διαγραφή;")) return; await http.delete(`/admin/products/${id}`); load(); };
  const save = async () => {
    if (!f.name || !f.category_id) return toast.error("Απαιτούμενα πεδία");
    const body = { ...f, price: parseFloat(f.price) || 0,
      sizes: f.sizes.map((s) => ({ label: s.label, price: parseFloat(s.price) || 0 })),
      extras: f.extras.map((e) => ({ name: e.name, price: parseFloat(e.price) || 0 })) };
    if (f.id) await http.put(`/admin/products/${f.id}`, body);
    else await http.post("/admin/products", body);
    setOpen(false); load(); toast.success("Αποθηκεύτηκε");
  };
  const upload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData(); fd.append("file", file);
    const { data } = await http.post("/admin/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    setF((s) => ({ ...s, image: data.url }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="font-display text-3xl font-black">Προϊόντα</h1>
        <Button onClick={() => { setF(empty); setOpen(true); }} data-testid="add-product-btn"
          className="rounded-full bg-brand hover-brand"><Plus className="w-4 h-4 mr-1" />Νέο προϊόν</Button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50"><tr className="text-left">
            <th className="p-3">Όνομα</th><th className="p-3">Κατηγορία</th><th className="p-3">Τιμή</th><th className="p-3">Ενεργό</th><th></th>
          </tr></thead>
          <tbody>
            {items.map((p) => {
              const cat = cats.find((c) => c.id === p.category_id);
              return (
                <tr key={p.id} className="border-t border-slate-100" data-testid={`prod-row-${p.id}`}>
                  <td className="p-3 font-semibold">{p.name}{(p.tags || []).length > 0 && <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">{p.tags.join(" · ")}</span>}</td>
                  <td className="p-3 text-slate-500">{cat?.name}</td>
                  <td className="p-3">{formatEuro(p.price)}</td>
                  <td className="p-3">{p.active ? "✓" : "—"}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => edit(p)} className="p-1 text-slate-500 hover:text-brand" data-testid={`edit-${p.id}`}><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => del(p.id)} className="p-1 text-slate-500 hover:text-red-500" data-testid={`del-${p.id}`}><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="product-form">
          <DialogHeader><DialogTitle>{f.id ? "Επεξεργασία" : "Νέο"} προϊόν</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Όνομα" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="pf-name" />
            <textarea placeholder="Περιγραφή" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })}
              className="w-full border border-slate-200 rounded-lg p-2 text-sm" rows={2} data-testid="pf-desc" />
            <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}
              className="w-full h-10 border border-slate-200 rounded-lg px-2" data-testid="pf-cat">
              <option value="">Κατηγορία…</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Input type="number" step="0.01" placeholder="Τιμή" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} data-testid="pf-price" />
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Εικόνα</label>
              <input type="file" accept="image/*" onChange={upload} className="block w-full text-sm mt-1" data-testid="pf-upload" />
              {f.image && <img src={f.image} alt="" className="mt-2 h-24 rounded-lg object-cover" />}
              <Input placeholder="ή URL εικόνας" value={f.image} onChange={(e) => setF({ ...f, image: e.target.value })} className="mt-2" />
            </div>
            <div>
              <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase text-slate-500">Μεγέθη</label>
                <button onClick={() => setF({ ...f, sizes: [...f.sizes, { label: "", price: 0 }] })} className="text-brand text-sm font-bold" data-testid="add-size">+ μέγεθος</button></div>
              {f.sizes.map((s, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <Input placeholder="π.χ. 30cm" value={s.label} onChange={(e) => { const x = [...f.sizes]; x[i].label = e.target.value; setF({ ...f, sizes: x }); }} />
                  <Input type="number" step="0.01" placeholder="+€" value={s.price} onChange={(e) => { const x = [...f.sizes]; x[i].price = e.target.value; setF({ ...f, sizes: x }); }} className="w-24" />
                  <button onClick={() => setF({ ...f, sizes: f.sizes.filter((_, j) => j !== i) })} className="text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between items-center"><label className="text-xs font-bold uppercase text-slate-500">Extras</label>
                <button onClick={() => setF({ ...f, extras: [...f.extras, { name: "", price: 0 }] })} className="text-brand text-sm font-bold" data-testid="add-extra">+ extra</button></div>
              {f.extras.map((s, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <Input placeholder="π.χ. Έξτρα τυρί" value={s.name} onChange={(e) => { const x = [...f.extras]; x[i].name = e.target.value; setF({ ...f, extras: x }); }} />
                  <Input type="number" step="0.01" placeholder="€" value={s.price} onChange={(e) => { const x = [...f.extras]; x[i].price = e.target.value; setF({ ...f, extras: x }); }} className="w-24" />
                  <button onClick={() => setF({ ...f, extras: f.extras.filter((_, j) => j !== i) })} className="text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-slate-500">Ετικέτες</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {TAGS.map(([k, l]) => (
                  <button key={k} type="button" onClick={() => toggleTag(k)} data-testid={`pf-tag-${k}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors ${f.tags.includes(k) ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 text-slate-600 hover:border-emerald-400"}`}>{l}</button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Το «Νηστίσιμο» τροφοδοτεί το φίλτρο «Μόνο νηστίσιμα / vegan» της αρχικής.</p>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} data-testid="pf-active" /><span className="text-sm">Ενεργό</span></label>
              <label className="flex items-center gap-2"><Switch checked={f.popular} onCheckedChange={(v) => setF({ ...f, popular: v })} data-testid="pf-popular" /><span className="text-sm">Δημοφιλές</span></label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold uppercase text-slate-500">Διαθέσιμο για
                <select value={f.mode || "all"} onChange={(e) => setF({ ...f, mode: e.target.value })} className="w-full h-10 border border-slate-200 rounded-lg px-2 mt-1 font-normal normal-case" data-testid="pf-mode">
                  <option value="all">Delivery & Παραλαβή</option><option value="delivery">Μόνο Delivery</option><option value="pickup">Μόνο Παραλαβή</option>
                </select></label>
              <label className="text-xs font-bold uppercase text-slate-500">Πακέτο: επιλογή πιτσών
                <div className="flex gap-2 mt-1 items-center">
                  <Input type="number" min="0" value={f.bundle?.pizzas ?? 0} className="w-20" data-testid="pf-bundle-pizzas"
                    onChange={(e) => { const n = parseInt(e.target.value) || 0; setF({ ...f, bundle: n || f.bundle?.salad ? { pizzas: n, salad: !!f.bundle?.salad } : null }); }} />
                  <label className="flex items-center gap-1 normal-case font-normal text-sm"><Switch checked={!!f.bundle?.salad} onCheckedChange={(v) => setF({ ...f, bundle: v || f.bundle?.pizzas ? { pizzas: f.bundle?.pizzas || 0, salad: v } : null })} /> + Σαλάτα</label>
                </div></label>
            </div>
            <Button onClick={save} className="w-full rounded-full bg-brand hover-brand h-11" data-testid="pf-save">Αποθήκευση</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
