import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ShoppingBag, User, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/api";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const { user, logout } = useAuth();
  const { count, subtotal } = useCart();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/70">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-2">
        <Link to="/" data-testid="header-home-link"><Logo /></Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => nav("/cart")}
            data-testid="header-cart-btn" className="rounded-full font-semibold gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Καλάθι</span>
            {count > 0 && <span className="bg-brand text-white text-xs px-2 py-0.5 rounded-full">{count}</span>}
          </Button>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full gap-2" data-testid="header-user-menu">
                  <User className="w-4 h-4" /><span className="hidden sm:inline">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => nav("/account")} data-testid="menu-account">Ο λογαριασμός μου</DropdownMenuItem>
                {user.role === "admin" && (
                  <DropdownMenuItem onClick={() => nav("/admin")} data-testid="menu-admin"><ShieldCheck className="w-4 h-4 mr-2" />Admin Panel</DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { logout(); nav("/"); }} data-testid="menu-logout">
                  <LogOut className="w-4 h-4 mr-2" />Αποσύνδεση
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button size="sm" onClick={() => nav("/login")} data-testid="header-login-btn"
              className="rounded-full bg-slate-900 hover:bg-slate-800 text-white font-semibold">Σύνδεση</Button>
          )}
        </div>
      </div>
    </header>
  );
}
