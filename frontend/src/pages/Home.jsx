import { useEffect, useMemo, useState } from "react";
import { http } from "@/lib/api";
import Header from "@/components/Header";
import CategoryRail from "@/components/CategoryRail";
import ProductCard from "@/components/ProductCard";
import ProductModal from "@/components/ProductModal";
import StickyCartBar from "@/components/StickyCartBar";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { Truck, Store, Search, MapPin, Phone, Clock } from "lucide-react";

export default function Home() {
  const [cats, setCats] = useState([]);
  const [prods, setProds] = useState([]);
  const [active, setActive] = useState(null);
  const [openProd, setOpenProd] = useState(null);
  const [q, setQ] = useState("");
  const [settings, setSettings] = useState({});
  const [favs, setFavs] = useState([]);
  const { mode, setMode } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    http.get("/categories").then((r) => { setCats(r.data); setActive(r.data[0]?.id); });
    http.get("/products").then((r) => setProds(r.data));
    http.get("/settings").then((r) => setSettings(r.data));
    if (user) http.get("/favorites").then((r) => setFavs(r.data)).catch(() => {});
  }, [user]);

  const toggleFav = async (pid) => {
    if (!user) return;
    const r = await http.post(`/favorites/${pid}`);
    setFavs(r.data);
  };

  const grouped = useMemo(() => {
    const search = q.trim().toLowerCase();
    const map = {};
    for (const c of cats) map[c.id] = [];
    for (const p of prods) {
      if (search && !(p.name.toLowerCase().includes(search) || p.description.toLowerCase().includes(search))) continue;
      if (map[p.category_id]) map[p.category_id].push(p);
    }
    return map;
  }, [prods, cats, q]);

  const popular = prods.filter((p) => p.popular).slice(0, 6);

  return (
    <div className="min-h-screen">
      <Header />
      {/* Hero */}
      <section className="bg-gradient-to-b from-white to-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="font-display text-3xl sm:text-5xl font-black tracking-tight">
                Παράγγειλε από <span className="text-brand">Telecanto</span>
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-slate-600 text-sm">
                <span className="inline-flex items-center gap-1"><MapPin className="w-4 h-4 text-brand" />Αναλήψεως 174, Βόλος</span>
                <span className="inline-flex items-center gap-1"><Phone className="w-4 h-4 text-brand" />24210 55085</span>
                <span className="inline-flex items-center gap-1"><Clock className="w-4 h-4 text-brand" />{settings.store_open ? "Ανοιχτά τώρα" : "Κλειστό αυτή τη στιγμή"}</span>
              </div>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button data-testid="mode-delivery" onClick={() => setMode("delivery")}
              className={`rounded-2xl p-4 sm:p-5 text-left border-2 transition ${
                mode === "delivery" ? "border-brand bg-white shadow-lg" : "border-slate-200 bg-white hover:border-slate-300"}`}>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${mode === "delivery" ? "bg-brand text-white" : "bg-slate-100 text-slate-500"}`}><Truck className="w-5 h-5" /></div>
                <div>
                  <div className="font-display font-black text-lg">DELIVERY</div>
                  <div className="text-xs text-slate-500">Παράδοση στον χώρο σου</div>
                </div>
              </div>
            </button>
            <button data-testid="mode-pickup" onClick={() => setMode("pickup")}
              className={`rounded-2xl p-4 sm:p-5 text-left border-2 transition relative overflow-hidden ${
                mode === "pickup" ? "border-emerald-500 bg-white shadow-lg" : "border-emerald-200 bg-emerald-50/40 hover:border-emerald-400"}`}>
              <span className="absolute top-1 right-2 text-[10px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">ΕΚΠΤΩΣΗ</span>
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${mode === "pickup" ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-600"}`}><Store className="w-5 h-5" /></div>
                <div>
                  <div className="font-display font-black text-lg">ΠΑΡΑΛΑΒΗ</div>
                  <div className="text-xs text-slate-500">Από το κατάστημα</div>
                </div>
              </div>
            </button>
          </div>

          {/* Search */}
          <div className="mt-5 relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} data-testid="search-input"
              placeholder="Αναζήτηση προϊόντος… π.χ. κοτόπουλο"
              className="w-full pl-11 pr-4 h-12 rounded-2xl bg-white border border-slate-200 focus:border-brand outline-none text-sm" />
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 pb-24">
        <CategoryRail categories={cats} active={active} onSelect={(id) => {
          setActive(id);
          document.getElementById(`cat-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }} />

        {popular.length > 0 && !q && (
          <section className="mt-6">
            <h2 className="font-display text-2xl font-black mb-3">Δημοφιλή</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {popular.map((p) => (
                <ProductCard key={p.id} product={p} onOpen={setOpenProd}
                  isFav={favs.includes(p.id)} onToggleFav={user ? toggleFav : null} />
              ))}
            </div>
          </section>
        )}

        {cats.map((c) => {
          const list = grouped[c.id] || [];
          if (list.length === 0) return null;
          return (
            <section key={c.id} id={`cat-${c.id}`} className="mt-8 scroll-mt-32">
              <h2 className="font-display text-2xl font-black mb-3" data-testid={`cat-title-${c.slug}`}>{c.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((p) => (
                  <ProductCard key={p.id} product={p} onOpen={setOpenProd}
                    isFav={favs.includes(p.id)} onToggleFav={user ? toggleFav : null} />
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <ProductModal product={openProd} onClose={() => setOpenProd(null)} />
      <StickyCartBar />
    </div>
  );
}
