import { useEffect, useState } from "react";
import { http } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const DAYS = [["mon", "Δευτέρα"], ["tue", "Τρίτη"], ["wed", "Τετάρτη"], ["thu", "Πέμπτη"], ["fri", "Παρασκευή"], ["sat", "Σάββατο"], ["sun", "Κυριακή"]];

export default function AdminSettings() {
  const [s, setS] = useState(null);
  useEffect(() => { http.get("/settings").then((r) => setS(r.data)); }, []);
  if (!s) return <div>...</div>;
  const save = async () => { const { data } = await http.put("/admin/settings", s); setS(data); toast.success("Αποθηκεύτηκε"); };
  const upd = (k, v) => setS({ ...s, [k]: v });
  const updDay = (d, patch) => setS({ ...s, opening_hours: { ...s.opening_hours, [d]: { ...s.opening_hours[d], ...patch } } });

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="font-display text-3xl font-black">Ρυθμίσεις</h1>

      <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <h2 className="font-display font-bold text-lg">Κατάσταση καταστήματος</h2>
        <label className="flex items-center gap-3"><Switch checked={s.store_open} onCheckedChange={(v) => upd("store_open", v)} data-testid="set-store-open" /><span className="font-semibold">Ανοιχτό ({s.store_open ? "δεχόμαστε παραγγελίες" : "κλειστό"})</span></label>
        <label className="flex items-center gap-3"><Switch checked={s.delivery_enabled} onCheckedChange={(v) => upd("delivery_enabled", v)} /><span>Delivery ενεργό</span></label>
        <label className="flex items-center gap-3"><Switch checked={s.pickup_enabled} onCheckedChange={(v) => upd("pickup_enabled", v)} /><span>Παραλαβή ενεργή</span></label>
        <label className="flex items-center gap-3"><Switch checked={s.scheduled_enabled} onCheckedChange={(v) => upd("scheduled_enabled", v)} /><span>Προγραμματισμένες παραγγελίες</span></label>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <h2 className="font-display font-bold text-lg">Πληρωμές</h2>
        <label className="flex items-center gap-3"><Switch checked={s.cash_enabled} onCheckedChange={(v) => upd("cash_enabled", v)} data-testid="set-cash" /><span>Μετρητά</span></label>
        <label className="flex items-center gap-3"><Switch checked={s.iris_enabled} onCheckedChange={(v) => upd("iris_enabled", v)} data-testid="set-iris" /><span>IRIS</span></label>
        <p className="text-xs text-slate-500">Online πιστωτική κάρτα: <b>Απενεργοποιημένη</b> (δεν εμφανίζεται στο checkout).</p>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <h2 className="font-display font-bold text-lg">Στοιχεία IRIS / Τιμολόγησης</h2>
        <Input placeholder="Επωνυμία" value={s.iris_business_name || ""} onChange={(e) => upd("iris_business_name", e.target.value)} />
        <Input placeholder="ΑΦΜ" value={s.iris_afm || ""} onChange={(e) => upd("iris_afm", e.target.value)} data-testid="set-afm" />
        <Input placeholder="ΔΟΥ" value={s.iris_doy || ""} onChange={(e) => upd("iris_doy", e.target.value)} />
        <p className="text-xs text-slate-500">Τα στοιχεία αυτά χρησιμοποιούνται στη διασύνδεση με τον πάροχο IRIS όταν ενεργοποιηθεί.</p>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <h2 className="font-display font-bold text-lg">Ελάχιστη παραγγελία (μόνο delivery)</h2>
        <label className="text-xs">Ελάχιστο ποσό προϊόντων (€) για delivery — η παραλαβή δεν έχει ελάχιστο
          <Input type="number" step="0.5" value={s.min_order ?? 8} onChange={(e) => upd("min_order", parseFloat(e.target.value) || 0)} data-testid="settings-min-order" className="mt-1 max-w-[160px]" /></label>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <h2 className="font-display font-bold text-lg">Loyalty</h2>
        <div className="grid grid-cols-3 gap-2">
          <label className="text-xs">Πόντοι ανά €<Input type="number" value={s.loyalty_points_per_euro} onChange={(e) => upd("loyalty_points_per_euro", parseFloat(e.target.value))} /></label>
          <label className="text-xs">Πόντοι για δώρο<Input type="number" value={s.loyalty_points_for_reward} onChange={(e) => upd("loyalty_points_for_reward", parseInt(e.target.value))} /></label>
          <label className="text-xs">Αξία δώρου €<Input type="number" value={s.loyalty_reward_value} onChange={(e) => upd("loyalty_reward_value", parseFloat(e.target.value))} /></label>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
        <h2 className="font-display font-bold text-lg">Ωράριο</h2>
        {DAYS.map(([k, l]) => {
          const d = s.opening_hours?.[k] || {};
          return (
            <div key={k} className="flex flex-wrap gap-2 items-center">
              <span className="w-24 font-semibold text-sm">{l}</span>
              <label className="flex items-center gap-2 text-xs"><Switch checked={!d.closed} onCheckedChange={(v) => updDay(k, { closed: !v })} /><span>{d.closed ? "Κλειστό" : "Ανοιχτό"}</span></label>
              {!d.closed && (
                <>
                  <Input type="time" value={d.open || ""} onChange={(e) => updDay(k, { open: e.target.value })} className="w-32" />
                  <Input type="time" value={d.close || ""} onChange={(e) => updDay(k, { close: e.target.value })} className="w-32" />
                </>
              )}
            </div>
          );
        })}
      </section>

      <Button onClick={save} className="rounded-full bg-brand hover-brand h-11 px-6" data-testid="settings-save">Αποθήκευση όλων</Button>
    </div>
  );
}
