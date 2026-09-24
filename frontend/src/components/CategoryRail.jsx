import { useEffect, useRef } from "react";
export default function CategoryRail({ categories, active, onSelect }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current?.querySelector(`[data-cat="${active}"]`);
    if (el) el.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" });
  }, [active]);
  return (
    <div ref={ref} className="sticky top-[88px] z-30 bg-white border-b border-slate-200 -mx-4 px-4 py-3 overflow-x-auto no-scrollbar">
      <div className="flex gap-2 min-w-max">
        {categories.map((c) => (
          <button key={c.id} data-cat={c.id} data-testid={`cat-pill-${c.slug}`} onClick={() => onSelect(c.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition ${
              active === c.id ? "bg-slate-900 text-white shadow-md" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
