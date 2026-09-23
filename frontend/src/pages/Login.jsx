import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/Logo";
import { toast } from "sonner";

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ email: "", password: "", name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const user = mode === "login" ? await login(f.email, f.password) : await register(f);
      toast.success("Καλωσόρισες!");
      nav(user.role === "admin" ? "/admin" : "/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Σφάλμα");
    } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md">
        <div className="flex justify-center mb-5"><Link to="/"><Logo /></Link></div>
        <h1 className="font-display text-2xl font-black text-center">{mode === "login" ? "Σύνδεση" : "Εγγραφή"}</h1>
        <form onSubmit={submit} className="space-y-3 mt-4">
          {mode === "register" && (
            <>
              <Input placeholder="Όνομα" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required data-testid="reg-name" />
              <Input placeholder="Τηλέφωνο" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} data-testid="reg-phone" />
            </>
          )}
          <Input type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required data-testid="auth-email" />
          <Input type="password" placeholder="Κωδικός" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required data-testid="auth-password" />
          <Button type="submit" disabled={busy} data-testid="auth-submit"
            className="w-full rounded-full bg-brand hover-brand h-11 font-bold">{busy ? "..." : mode === "login" ? "Σύνδεση" : "Εγγραφή"}</Button>
        </form>
        <button onClick={() => setMode(mode === "login" ? "register" : "login")} className="w-full text-sm text-slate-500 mt-3" data-testid="auth-toggle">
          {mode === "login" ? "Δεν έχεις λογαριασμό; Εγγραφή" : "Έχεις λογαριασμό; Σύνδεση"}
        </button>
      </div>
    </div>
  );
}
