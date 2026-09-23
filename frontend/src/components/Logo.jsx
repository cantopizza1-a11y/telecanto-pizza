export default function Logo({ className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} data-testid="brand-logo">
      <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shadow-md">
        <span className="text-white font-display font-black text-lg">T</span>
      </div>
      <div className="leading-none">
        <div className="font-display font-black text-xl tracking-tight text-slate-900">TELECANTO</div>
        <div className="text-[10px] font-semibold tracking-[.25em] text-brand">PIZZA · 1998</div>
      </div>
    </div>
  );
}
