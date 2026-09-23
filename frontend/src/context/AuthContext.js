import { createContext, useContext, useEffect, useState } from "react";
import { http } from "@/lib/api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("tc_token");
    if (!t) { setLoading(false); return; }
    http.get("/auth/me").then((r) => setUser(r.data)).catch(() => localStorage.removeItem("tc_token")).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await http.post("/auth/login", { email, password });
    localStorage.setItem("tc_token", data.token); setUser(data.user); return data.user;
  };
  const register = async (payload) => {
    const { data } = await http.post("/auth/register", payload);
    localStorage.setItem("tc_token", data.token); setUser(data.user); return data.user;
  };
  const logout = () => { localStorage.removeItem("tc_token"); setUser(null); };

  return <Ctx.Provider value={{ user, loading, login, register, logout, setUser }}>{children}</Ctx.Provider>;
}
