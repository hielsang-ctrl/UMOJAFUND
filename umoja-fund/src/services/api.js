/**
 * The only place that talks to the Django backend.
 *  - the short-lived access token lives in memory
 *  - the refresh token lives in localStorage so a page reload keeps you signed in
 *  - on a 401 it refreshes ONCE (even if many requests fail together, because refresh tokens rotate) and retries
 */
const API = (import.meta.env?.VITE_API_URL || "http://localhost:8000/api").replace(/\/$/, "");
const REFRESH_KEY = "umoja_refresh";

let access = null;
let onAuthLost = () => {};
export const setAuthLostHandler = (fn) => { onAuthLost = fn; };

export const getRefresh = () => { try { return localStorage.getItem(REFRESH_KEY); } catch { return null; } };
export const setTokens = ({ access: a, refresh: r } = {}) => {
  access = a ?? null;
  try { r ? localStorage.setItem(REFRESH_KEY, r) : localStorage.removeItem(REFRESH_KEY); } catch { /* storage blocked */ }
};
export const clearTokens = () => setTokens({});

let refreshing = null; // one refresh at a time
export function refreshTokens() {
  if (refreshing) return refreshing;
  const refresh = getRefresh();
  if (!refresh) return Promise.resolve(false);
  refreshing = fetch(`${API}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  })
    .then(async (res) => {
      if (!res.ok) { clearTokens(); return false; }   // expired or blacklisted: sign in again
      const data = await res.json();
      setTokens({ access: data.access, refresh: data.refresh ?? refresh });
      return true;
    })
    .catch(() => false)                                  // server unreachable: keep the tokens, try later
    .finally(() => { refreshing = null; });
  return refreshing;
}

function messageFrom(data, status) {
  if (data?.detail) return String(data.detail);
  const first = data && typeof data === "object" ? Object.values(data).flat()[0] : null;
  if (typeof first === "string") return first;
  if (status === 403) return "You are not allowed to do that.";
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  return "Something went wrong. Please try again.";
}

export async function api(path, { method = "GET", body, signal, retry = true } = {}) {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      signal,
      headers: {
        ...(access && { Authorization: `Bearer ${access}` }),
        ...(body && !isForm && { "Content-Type": "application/json" }), // for FormData the browser adds the boundary
      },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw Object.assign(new Error("Cannot reach the server. Check your connection and try again."), { status: 0 });
  }

  if (res.status === 401 && retry && getRefresh()) {
    if (await refreshTokens()) return api(path, { method, body, signal, retry: false });
    onAuthLost();
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(messageFrom(data, res.status)), { status: res.status, data });
  return data;
}
