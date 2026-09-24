import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ticket, X } from "lucide-react";

export default function CouponBox({ codeValid }) {
  const { coupon, setCoupon } = useCart();
  const [v, setV] = useState(coupon);
  if (coupon) {
    return (
      <div className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold ${codeValid ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`} data-testid="coupon-status">
        <span className="flex items-center gap-2"><Ticket className="w-4 h-4" />{coupon} — {codeValid ? "Ενεργό κουπόνι" : "Μη έγκυρος κωδικός"}</span>
        <button onClick={() => { setCoupon(""); setV(""); }} data-testid="coupon-remove"><X className="w-4 h-4" /></button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Input placeholder="Κωδικός κουπονιού" value={v} onChange={(e) => setV(e.target.value.toUpperCase())} data-testid="coupon-input" />
      <Button variant="outline" onClick={() => v.trim() && setCoupon(v.trim())} className="rounded-xl font-bold" data-testid="coupon-apply">Εφαρμογή</Button>
    </div>
  );
}
