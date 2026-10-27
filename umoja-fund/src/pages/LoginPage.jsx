import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2, LogIn } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import Button, { inputClass } from "../components/ui/Button.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const from = location.state?.from || "/";
  if (!loading && user) return <Navigate to={from} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.status === 401 ? "Wrong email or password." : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
      <Card className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-white">U</span>
          <div>
            <p className="font-semibold">Umoja Fund</p>
            <p className="text-xs text-stone-500">Sign in to see the fund and your savings</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-xs text-stone-500">Email
            <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputClass} mt-1 w-full`} />
          </label>
          <label className="block text-xs text-stone-500">Password
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} mt-1 w-full`} />
          </label>
          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
          <Button type="submit" disabled={busy || !email || !password} className="w-full justify-center disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />} Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-[11px] text-stone-400">Forgotten your password? Ask the admin to reset it.</p>
      </Card>
    </div>
  );
}
