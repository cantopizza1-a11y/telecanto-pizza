import { useCart } from "@/context/CartContext";
import { formatEuro } from "@/lib/api";
import { ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function StickyCartBar() {
  const { count, subtotal } = useCart();
  const nav = useNavigate();
  if (count === 0) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden">
      <button onClick={() => nav("/cart")} data-testid="sticky-cart-bar"
        className="w-full bg-brand hover-brand text-white rounded-2xl py-4 px-5 flex items-center justify-between shadow-2xl font-bold">
        <span className="flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> Καλάθι ({count})</span>
        <span>{formatEuro(subtotal)}</span>
      </button>
    </div>
  );
}
