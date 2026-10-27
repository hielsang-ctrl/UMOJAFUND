import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, clearTokens, getRefresh, refreshTokens, setAuthLostHandler, setTokens } from "../services/api.js";

export const AuthContext = createContext(null);

/**
 * Who is signed in. `user` comes from GET /auth/me/:
 *   { id, name, email, phone, role (position), access ("admin" | "member"), paid }
 * The server decides what each person may do; the frontend only hides buttons.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check for a saved session

  // a failed refresh anywhere in the app signs the person out
  useEffect(() => { setAuthLostHandler(() => setUser(null)); }, []);

  // reload: use the saved refresh token to get back in without asking for the password again
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (getRefresh() && (await refreshTokens())) {
          const me = await api("/auth/me/");
          if (alive) setUser(me);
        }
      } catch {
        clearTokens();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api("/auth/login/", { method: "POST", body: { email: email.trim(), password }, retry: false });
    setTokens({ access: data.access, refresh: data.refresh });
    const me = await api("/auth/me/");
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    const refresh = getRefresh();
    try { if (refresh) await api("/auth/logout/", { method: "POST", body: { refresh }, retry: false }); } catch { /* ignore */ }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};
