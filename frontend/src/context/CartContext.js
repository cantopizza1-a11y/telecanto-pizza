import { createContext, useContext, useEffect, useState } from "react";

const Ctx = createContext(null);
export const useCart = () => useContext(Ctx);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("tc_cart") || "[]"); } catch { return []; }
  });
  const [mode, setMode] = useState(() => localStorage.getItem("tc_mode") || "delivery");

  useEffect(() => localStorage.setItem("tc_cart", JSON.stringify(items)), [items]);
  useEffect(() => localStorage.setItem("tc_mode", mode), [mode]);

  const addItem = (it) => setItems((s) => [...s, { ...it, key: Date.now() + Math.random() }]);
  const removeItem = (key) => setItems((s) => s.filter((x) => x.key !== key));
  const updateQty = (key, q) => setItems((s) => s.map((x) => x.key === key ? { ...x, quantity: Math.max(1, q), line_total: (x.unit_price * Math.max(1, q)) } : x));
  const clear = () => setItems([]);

  const subtotal = items.reduce((a, x) => a + x.line_total, 0);
  const count = items.reduce((a, x) => a + x.quantity, 0);

  return <Ctx.Provider value={{ items, addItem, removeItem, updateQty, clear, subtotal, count, mode, setMode }}>{children}</Ctx.Provider>;
}
