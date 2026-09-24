import { useEffect, useState } from "react";
import { http } from "@/lib/api";

export function useOffers(items, mode, code) {
  const [res, setRes] = useState({ discount: 0, applied: [], code_valid: false });
  useEffect(() => {
    if (items.length === 0) { setRes({ discount: 0, applied: [], code_valid: false }); return; }
    const t = setTimeout(() => {
      http.post("/offers/apply", { items, mode, code: code || "" }).then((r) => setRes(r.data)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [items, mode, code]);
  return res;
}
