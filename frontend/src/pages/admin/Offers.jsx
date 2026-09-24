import { useEffect, useState } from "react";
import { http, formatEuro } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, Pencil, X } from "lucide-react";
import { toast } from "sonner";

const TYPES = { bogo: "1+1 (το 2ο δώρο)", percent: "Ποσοστό %", fixed: "Σταθερή έκπτωση €", combo: "Combo / Πακέτο" };
const EMPTY = { title: "", description: "", type: "percent", value: 10, product_ids: [], category_ids: [], combo_items: [], code: "", min_order: 0, mode: "all", active: true };

export default function AdminOffers() {
  const [offers, setOffers] = useState([]);
  const [cats, setCats] = useState([]);
  const [prods, setProds] = useState([]);
  const [f, setF] = useState(null);
  const [comboPid, setComboPid] = useState("");

  const load = () => http.get("/admin/offers").then((r) => setOffers(r.data));
  useEffect(() => {
    load();
    http.get("/admin/categories").then((r) => setCats(r.data));
    http.get("/admin/products").then((r) => setProds(r.data));
  }, []);

  const save = async () => {
    if (!f.title) return toast.error("Δώσε τίτλο");
    if (f.type === "combo" && f.combo_items.length === 0) return toast.error("Πρόσθεσε προϊόντα στο combo");
    const body = { ...f, value: parseFloat(f.value) || 0, min_order: parseFloat(f.min_order) || 0 };
    if (f.id) await http.put(`/admin/offers/${f.id}`, body); else await http.post("/admin/offers", body);
    toast.success("Αποθηκεύτηκε"); setF(null); load();
  };
  const del = async (id) => { if (!window.confirm("Διαγραφή προσφοράς;")) return; await http.delete(`/admin/offers/${id}`); load(); };
  const toggle = async (o) => { await http.put(`/admin/offers/${o.id}`, { active: !o.active }); load(); };
  const toggleIn = (key, id) => setF({ ...f, [key]: f[key].includes(id) ? f[key].filter((x) => x !== id) : [...f[key], id] });
  const addCombo = () => {
    const p = prods.find((x) => x.id === comboPid); if (!p) return;
    setF({ ...f, combo_items: [...f.combo_items, { product_id: p.id, name: p.name, qty: 1 }] }); setComboPid("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-black">Προσφορές</h1>
        <Button onClick={() => setF(EMPTY)} className="rounded-full bg-brand hover-brand" data-testid="offer-new-btn"><Plus className="w-4 h-4 mr-1" />Νέα προσφορά</Button>
      </div>

      {f && (
        <div className="bg-white border-2 border-brand rounded-2xl p-4 space-y-3" data-testid="offer-form">
          <div className="flex justify-between items-center"><h2 className="font-display font-bold text-lg">{f.id ? "Επεξεργασία" : "Νέα προσφορά"}</h2><button onClick={() => setF(null)}><X className="w-5 h-5" /></button></div>
          <Input placeholder="Τίτλος (π.χ. 1+1 σε όλες τις πίτσες Τρίτη)" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} data-testid="offer-title" />
          <Input placeholder="Περιγραφή" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          <div className="grid sm:grid-cols-3 gap-2">
            <label className="text-xs font-semibold">Τύπος
              <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className="w-full h-10 border border-slate-200 rounded-lg px-2 mt-1" data-testid="offer-type">
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            {f.type !== "bogo" && (
              <label className="text-xs font-semibold">{f.type === "percent" ? "Ποσοστό %" : f.type === "combo" ? "Τιμή πακέτου €" : "Έκπτωση €"}
                <Input type="number" step="0.5" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} className="mt-1" data-testid="offer-value" />
              </label>
            )}
            <label className="text-xs font-semibold">Ελάχιστη παραγγελία €<Input type="number" step="0.5" value={f.min_order} onChange={(e) => setF({ ...f, min_order: e.target.value })} className="mt-1" /></label>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            <label className="text-xs font-semibold">Κωδικός κουπονιού (προαιρετικό — αν συμπληρωθεί, ισχύει μόνο με κωδικό)
              <Input placeholder="π.χ. TELE10" value={f.code || ""} onChange={(e) => setF({ ...f, code: e.target.value.toUpperCase() })} className="mt-1" data-testid="offer-code" /></label>
            <label className="text-xs font-semibold">Ισχύει για
              <select value={f.mode} onChange={(e) => setF({ ...f, mode: e.target.value })} className="w-full h-10 border border-slate-200 rounded-lg px-2 mt-1">
                <option value="all">Delivery & Παραλαβή</option><option value="delivery">Μόνο Delivery</option><option value="pickup">Μόνο Παραλαβή</option>
              </select></label>
          </div>

          {(f.type === "bogo" || f.type === "percent") && (
            <div className="space-y-2">
              <div className="text-xs font-semibold">Κατηγορίες (κενό = όλα τα προϊόντα)</div>
              <div className="flex flex-wrap gap-1">
                {cats.map((c) => (
                  <button key={c.id} onClick={() => toggleIn("category_ids", c.id)} data-testid={`offer-cat-${c.slug}`}
                    className={`text-xs px-3 py-1 rounded-full border font-semibold ${f.category_ids.includes(c.id) ? "bg-brand text-white border-brand" : "border-slate-200"}`}>{c.name}</button>
                ))}
              </div>
              <div className="text-xs font-semibold">Συγκεκριμένα προϊόντα</div>
              <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
                {prods.map((p) => (
                  <button key={p.id} onClick={() => toggleIn("product_ids", p.id)}
                    className={`text-xs px-2 py-1 rounded-full border ${f.product_ids.includes(p.id) ? "bg-slate-900 text-white border-slate-900" : "border-slate-200"}`}>{p.name}</button>
                ))}
              </div>
            </div>
          )}

          {f.type === "combo" && (
            <div className="space-y-2">
              <div className="text-xs font-semibold">Προϊόντα πακέτου</div>
              <div className="flex gap-2">
                <select value={comboPid} onChange={(e) => setComboPid(e.target.value)} className="flex-1 h-10 border border-slate-200 rounded-lg px-2" data-testid="combo-select">
                  <option value="">Επιλογή προϊόντος…</option>
                  {prods.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatEuro(p.price)}</option>)}
                </select>
                <Button variant="outline" onClick={addCombo} data-testid="combo-add">Προσθήκη</Button>
              </div>
              {f.combo_items.map((c, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-slate-50 rounded-lg px-3 py-2">
                  <span className="flex-1">{c.name}</span>
                  <Input type="number" min="1" value={c.qty} className="w-16 h-8" onChange={(e) => setF({ ...f, combo_items: f.combo_items.map((x, j) => j === i ? { ...x, qty: parseInt(e.target.value) || 1 } : x) })} />
                  <button onClick={() => setF({ ...f, combo_items: f.combo_items.filter((_, j) => j !== i) })}><Trash2 className="w-4 h-4 text-red-500" /></button>
                </div>
              ))}
            </div>
          )}
          <Button onClick={save} className="rounded-full bg-brand hover-brand" data-testid="offer-save">Αποθήκευση</Button>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        {offers.length === 0 && <p className="text-slate-500 text-sm">Δεν υπάρχουν προσφορές ακόμη.</p>}
        {offers.map((o) => (
          <div key={o.id} className={`bg-white border rounded-2xl p-4 ${o.active ? "border-slate-200" : "border-dashed opacity-60"}`} data-testid={`offer-card-${o.id}`}>
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-brand">{TYPES[o.type]}{o.code && ` · κωδ. ${o.code}`}</div>
                <div className="font-display font-black text-lg">{o.title}</div>
                <div className="text-xs text-slate-500">{o.description}</div>
                <div className="text-xs text-slate-600 mt-1">
                  {o.type === "percent" && `-${o.value}%`}{o.type === "fixed" && `-${formatEuro(o.value)}`}{o.type === "combo" && `Πακέτο ${formatEuro(o.value)} (${o.combo_items.map((c) => `${c.qty}× ${c.name}`).join(", ")})`}
                  {o.min_order > 0 && ` · ελάχ. ${formatEuro(o.min_order)}`}{o.mode !== "all" && ` · ${o.mode}`}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Switch checked={o.active} onCheckedChange={() => toggle(o)} data-testid={`offer-toggle-${o.id}`} />
                <div className="flex gap-2">
                  <button onClick={() => setF({ ...EMPTY, ...o })} className="text-slate-500"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => del(o.id)} className="text-red-500" data-testid={`offer-del-${o.id}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
