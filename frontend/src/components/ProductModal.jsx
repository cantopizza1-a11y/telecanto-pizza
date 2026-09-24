import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { formatEuro } from "@/lib/api";
import { toast } from "sonner";

export default function ProductModal({ product, onClose, allProducts = [], categories = [] }) {
  const { addItem } = useCart();
  const [size, setSize] = useState(product?.sizes?.[0] || null);
  const [extras, setExtras] = useState([]);
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState("");
  const [picks, setPicks] = useState([]);

  useEffect(() => { setSize(product?.sizes?.[0] || null); setExtras([]); setQty(1); setNotes(""); setPicks([]); }, [product]);

  if (!product) return null;
  const bundle = product.bundle;
  const catId = (slug) => categories.find((c) => c.slug === slug)?.id;
  const pizzas = bundle ? allProducts.filter((p) => p.category_id === catId("pizzas")) : [];
  const salads = bundle?.salad ? allProducts.filter((p) => p.category_id === catId("salads")) : [];
  const slots = bundle ? [...Array(bundle.pizzas).fill("pizza"), ...(bundle.salad ? ["salad"] : [])] : [];
  const bundleReady = !bundle || slots.every((_, i) => picks[i]);
  const base = product.price + (size?.price || 0);
  const extraSum = extras.reduce((a, e) => a + e.price, 0);
  const unit = base + extraSum;
  const total = unit * qty;

  const toggleExtra = (ex) => {
    setExtras((s) => s.find((e) => e.name === ex.name) ? s.filter((e) => e.name !== ex.name) : [...s, ex]);
  };

  const add = () => {
    if (!bundleReady) return toast.error("Διάλεξε όλα τα προϊόντα της προσφοράς");
    addItem({
      product_id: product.id, name: product.name, quantity: qty,
      size: size?.label || null, size_price: size?.price || null,
      extras, choices: picks, notes, unit_price: Number(unit.toFixed(2)), line_total: Number(total.toFixed(2)),
    });
    toast.success(`${product.name} στο καλάθι!`);
    onClose();
  };

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0" data-testid="product-modal">
        {product.image && <img src={product.image} alt={product.name} className="w-full h-56 object-cover" />}
        <div className="p-5 space-y-4">
          <DialogHeader className="text-left">
            <DialogTitle className="font-display text-2xl font-black">{product.name}</DialogTitle>
            {product.description && <p className="text-sm text-slate-500 mt-1">{product.description}</p>}
          </DialogHeader>

          {bundle && slots.map((kind, i) => (
            <div key={i} data-testid={`bundle-slot-${i}`}>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{kind === "pizza" ? `Πίτσα ${i + 1}` : "Σαλάτα"} · διάλεξε</div>
              <select value={picks[i] || ""} onChange={(e) => { const n = [...picks]; n[i] = e.target.value; setPicks(n); }}
                className={`w-full h-11 border-2 rounded-xl px-3 text-sm font-semibold ${picks[i] ? "border-brand" : "border-slate-200"}`} data-testid={`bundle-select-${i}`}>
                <option value="">— Επιλογή —</option>
                {(kind === "pizza" ? pizzas : salads).map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
          ))}

          {product.sizes?.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Μέγεθος</div>
              <div className="grid grid-cols-1 gap-2">
                {product.sizes.map((s) => (
                  <button key={s.label} data-testid={`size-${s.label}`} onClick={() => setSize(s)}
                    className={`text-left px-4 py-3 rounded-xl border flex justify-between items-center font-semibold ${
                      size?.label === s.label ? "border-brand bg-accent" : "border-slate-200 hover:border-slate-300"}`}>
                    <span>{s.label}</span>
                    <span className="text-brand">{s.price > 0 ? `+${formatEuro(s.price)}` : "Βασική"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.extras?.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Extras</div>
              <div className="grid grid-cols-2 gap-2">
                {product.extras.map((ex) => {
                  const active = extras.find((e) => e.name === ex.name);
                  return (
                    <button key={ex.name} data-testid={`extra-${ex.name}`} onClick={() => toggleExtra(ex)}
                      className={`px-3 py-2 rounded-xl border text-sm text-left font-semibold ${
                        active ? "border-brand bg-accent text-brand" : "border-slate-200"}`}>
                      <div className="flex justify-between"><span>{ex.name}</span><span>+{formatEuro(ex.price)}</span></div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Σχόλια</div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="product-notes"
              placeholder="π.χ. χωρίς κρεμμύδι"
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none" rows={2} />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3 bg-slate-100 rounded-full p-1">
              <button data-testid="qty-minus" onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center"><Minus className="w-4 h-4" /></button>
              <span className="font-bold w-6 text-center" data-testid="qty-value">{qty}</span>
              <button data-testid="qty-plus" onClick={() => setQty(qty + 1)}
                className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center"><Plus className="w-4 h-4" /></button>
            </div>
            <Button onClick={add} data-testid="add-to-cart-btn"
              className="rounded-full bg-brand hover-brand text-white font-bold h-11 px-6">
              Προσθήκη · {formatEuro(total)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
