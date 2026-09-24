import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import { LayoutDashboard, Package, ListOrdered, MapPin, Settings, LogOut, ClipboardList, Tag, Download, Store } from "lucide-react";

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  const [installPrompt, setInstallPrompt] = useState(null);
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) nav("/login");
  }, [user, loading, nav]);
  useEffect(() => {
    const link = document.querySelector('link[rel="manifest"]');
    const prev = link?.getAttribute("href");
    link?.setAttribute("href", "/admin-manifest.json");
    document.title = "Telecanto Admin";
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => { if (prev) link?.setAttribute("href", prev); document.title = "Telecanto Pizza & Pasta — Online Delivery Βόλος"; window.removeEventListener("beforeinstallprompt", onPrompt); };
  }, []);

  const links = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/orders", label: "Παραγγελίες", icon: ClipboardList },
    { to: "/admin/products", label: "Προϊόντα", icon: Package },
    { to: "/admin/categories", label: "Κατηγορίες", icon: ListOrdered },
    { to: "/admin/offers", label: "Προσφορές", icon: Tag },
    { to: "/admin/zones", label: "Ζώνες Delivery", icon: MapPin },
    { to: "/admin/settings", label: "Ρυθμίσεις", icon: Settings },
  ];
  if (!user || user.role !== "admin") return null;
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      <aside className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 lg:h-screen lg:sticky lg:top-0 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2">
          <Logo size="h-14" />
          <span className="text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white rounded-full px-2 py-1" data-testid="admin-badge">Admin</span>
        </div>
        <nav className="flex-1 p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto no-scrollbar">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} data-testid={`admin-nav-${l.to.split("/").pop() || "home"}`}
              className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm whitespace-nowrap ${isActive ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              <l.icon className="w-4 h-4" /> {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-100">
          {installPrompt && (
            <button onClick={async () => { installPrompt.prompt(); setInstallPrompt(null); }} data-testid="admin-install-btn"
              className="w-full p-3 text-sm font-bold text-brand flex items-center gap-2 hover:bg-accent">
              <Download className="w-4 h-4" /> Εγκατάσταση στον υπολογιστή
            </button>
          )}
          <a href="/" target="_blank" rel="noreferrer" className="w-full p-3 text-sm text-slate-600 flex items-center gap-2 hover:bg-slate-50" data-testid="admin-view-store">
            <Store className="w-4 h-4" /> Προβολή καταστήματος
          </a>
          <button onClick={() => { logout(); nav("/"); }} className="w-full p-3 text-sm text-slate-600 flex items-center gap-2 hover:bg-slate-50" data-testid="admin-logout">
            <LogOut className="w-4 h-4" /> Αποσύνδεση
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6 max-w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
