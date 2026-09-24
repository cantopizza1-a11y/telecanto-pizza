import { Clock, CalendarClock } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function SchedulePicker({ value, onChange }) {
  const min = new Date(Date.now() + 30 * 60000);
  const scheduled = value !== null;
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 mt-3" data-testid="schedule-box">
      <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Χρόνος παράδοσης</div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => onChange(null)} data-testid="schedule-now"
          className={`p-3 rounded-xl border-2 font-bold flex items-center gap-2 ${!scheduled ? "border-brand bg-accent text-brand" : "border-slate-200"}`}>
          <Clock className="w-4 h-4" /> Το συντομότερο
        </button>
        <button onClick={() => onChange(toLocalInput(new Date(min.getTime() + 30 * 60000)))} data-testid="schedule-later"
          className={`p-3 rounded-xl border-2 font-bold flex items-center gap-2 ${scheduled ? "border-brand bg-accent text-brand" : "border-slate-200"}`}>
          <CalendarClock className="w-4 h-4" /> Προγραμματισμός
        </button>
      </div>
      {scheduled && (
        <input type="datetime-local" value={value} min={toLocalInput(min)} onChange={(e) => onChange(e.target.value)} data-testid="schedule-input"
          className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm" />
      )}
    </div>
  );
}
