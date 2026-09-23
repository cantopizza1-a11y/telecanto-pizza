import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect } from "react";
import Logo from "@/components/Logo";
import { LayoutDashboard, Package, ListOrdered, MapPin, Settings, LogOut, ClipboardList } from "lucide-react";

export default function AdminLayout() {
  const { user, loading, logout } = useAuth();
  const nav = useNavigate();
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) nav("/login");
  }, [user, loading, nav]);

  const links = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
    { to: "/admin/orders", label: "Παραγγελίες", icon: ClipboardList },
    { to: "/admin/products", label: "Προϊόντα", icon: Package },
    { to: "/admin/categories", label: "Κατηγορίες", icon: ListOrdered },
    { to: "/admin/zones", label: "Ζώνες Delivery", icon: MapPin },
    { to: "/admin/settings", label: "Ρυθμίσεις", icon: Settings },
  ];
  if (!user || user.role !== "admin") return null;
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50">
      <aside className="lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 lg:h-screen lg:sticky lg:top-0 flex flex-col">
        <div className="p-4 border-b border-slate-100"><Logo /></div>
        <nav className="flex-1 p-2 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-y-auto no-scrollbar">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} data-testid={`admin-nav-${l.to.split("/").pop() || "home"}`}
              className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg font-semibold text-sm whitespace-nowrap ${isActive ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              <l.icon className="w-4 h-4" /> {l.label}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => { logout(); nav("/"); }} className="p-4 border-t border-slate-100 text-sm text-slate-600 flex items-center gap-2 hover:bg-slate-50" data-testid="admin-logout">
          <LogOut className="w-4 h-4" /> Αποσύνδεση
        </button>
      </aside>
      <main className="flex-1 p-4 sm:p-6 max-w-full overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
