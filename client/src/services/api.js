/**
 * FoodBridge AI — Centralized API Service
 * -----------------------------------------
 * All calls go through this module. Every function:
 *  - Attaches the JWT from localStorage
 *  - Throws an Error with the backend's error message on non-2xx responses
 *  - Returns the parsed JSON body on success
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// ─────────────────────────────────────────────────────────────────────────────
// Token helpers (stored in localStorage as "fb_token" and "fb_user")
// ─────────────────────────────────────────────────────────────────────────────

export const getToken = () => localStorage.getItem("fb_token");
export const getUser  = () => {
  try { return JSON.parse(localStorage.getItem("fb_user") || "null"); }
  catch { return null; }
};

export const saveAuth = (token, user) => {
  localStorage.setItem("fb_token", token);
  localStorage.setItem("fb_user", JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem("fb_token");
  localStorage.removeItem("fb_user");
};

export const isLoggedIn = () => Boolean(getToken());

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────

async function _fetch(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // 401 → force logout (expired session)
  if (res.status === 401) {
    clearAuth();
    window.dispatchEvent(new Event("fb:session-expired"));
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = body?.error || body?.message || `HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status, body });
  }
  return body;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data)    => _fetch("/api/auth/register",  { method: "POST",  body: JSON.stringify(data) }),
  login:    (data)    => _fetch("/api/auth/login",      { method: "POST",  body: JSON.stringify(data) }),
  me:       ()        => _fetch("/api/auth/me"),
  updateProfile: (d)  => _fetch("/api/auth/profile",   { method: "PUT",   body: JSON.stringify(d) }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Food Donations API
// ─────────────────────────────────────────────────────────────────────────────

export const foodApi = {
  create:      (data)  => _fetch("/api/food/",          { method: "POST",   body: JSON.stringify(data) }),
  list:        (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return _fetch(`/api/food/${q ? "?" + q : ""}`);
  },
  myDonations: (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return _fetch(`/api/food/my${q ? "?" + q : ""}`);
  },
  get:         (id)    => _fetch(`/api/food/${id}`),
  cancel:      (id)    => _fetch(`/api/food/${id}`,     { method: "DELETE" }),
  accept:      (id)    => _fetch(`/api/food/${id}/accept`,  { method: "POST" }),
  reject:      (id, reason) => _fetch(`/api/food/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  pickup:      (id)    => _fetch(`/api/food/${id}/pickup`,  { method: "POST" }),
  deliver:     (id)    => _fetch(`/api/food/${id}/deliver`, { method: "POST" }),
  stats:       ()      => _fetch("/api/food/stats"),
  donorStats:  ()      => _fetch("/api/food/donor-stats"),
  ngoStats:    ()      => _fetch("/api/food/ngo-stats"),
};

// ─────────────────────────────────────────────────────────────────────────────
// NGO Needs API
// ─────────────────────────────────────────────────────────────────────────────

export const needsApi = {
  create:  (data)   => _fetch("/api/needs/",       { method: "POST",   body: JSON.stringify(data) }),
  list:    (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return _fetch(`/api/needs/${q ? "?" + q : ""}`);
  },
  myNeeds: ()       => _fetch("/api/needs/my"),
  update:  (id, d)  => _fetch(`/api/needs/${id}`,  { method: "PUT",    body: JSON.stringify(d) }),
  delete:  (id)     => _fetch(`/api/needs/${id}`,  { method: "DELETE" }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Smart Rescue Agent API
// ─────────────────────────────────────────────────────────────────────────────

export const agentApi = {
  health:          ()       => _fetch("/api/agent/health"),
  chat:            (data)   => _fetch("/api/agent/chat",            { method: "POST", body: JSON.stringify(data) }),
  rescue:          (data)   => _fetch("/api/agent/rescue",          { method: "POST", body: JSON.stringify(data) }),
  approveRescue:   (data)   => _fetch("/api/agent/rescue/approve",  { method: "POST", body: JSON.stringify(data) }),
  rejectRescue:    (data)   => _fetch("/api/agent/rescue/reject",   { method: "POST", body: JSON.stringify(data) }),
  recommendations: (params) => {
    const q = new URLSearchParams(params || {}).toString();
    return _fetch(`/api/agent/recommendations${q ? "?" + q : ""}`);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ML / Forecast API
// ─────────────────────────────────────────────────────────────────────────────

export const mlApi = {
  forecastWeek:    ()     => _fetch("/api/ml/forecast-week"),
  metrics:         ()     => _fetch("/api/ml/metrics"),
  predictDemand:   (data) => _fetch("/api/ml/predict-demand",  { method: "POST", body: JSON.stringify(data) }),
  predictSpoilage: (data) => _fetch("/api/ml/predict-spoilage", { method: "POST", body: JSON.stringify(data) }),
  predictMatch:    (data) => _fetch("/api/ml/predict-match",   { method: "POST", body: JSON.stringify(data) }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Format helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Return human-readable relative time: "2 hours ago", "in 3 hours", etc. */
export const relativeTime = (isoString) => {
  if (!isoString) return "—";
  const diff = Date.now() - new Date(isoString).getTime();
  const abs  = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const hrs  = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);
  const sign = diff > 0 ? "" : "in ";
  const suf  = diff > 0 ? " ago" : "";
  if (mins < 2)   return "just now";
  if (mins < 60)  return `${sign}${mins} min${suf}`;
  if (hrs < 24)   return `${sign}${hrs} hr${hrs > 1 ? "s" : ""}${suf}`;
  return `${sign}${days} day${days > 1 ? "s" : ""}${suf}`;
};

/** Badge color class for donation status */
export const statusBadge = (status) => {
  const map = {
    available:  "bg-green-50 text-green-700 border-green-200",
    matched:    "bg-blue-50 text-blue-700 border-blue-200",
    accepted:   "bg-indigo-50 text-indigo-700 border-indigo-200",
    scheduled:  "bg-purple-50 text-purple-700 border-purple-200",
    picked_up:  "bg-yellow-50 text-yellow-700 border-yellow-200",
    delivered:  "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled:  "bg-red-50 text-red-700 border-red-200",
    expired:    "bg-gray-50 text-gray-500 border-gray-200",
  };
  return map[status] || "bg-gray-50 text-gray-600 border-gray-200";
};

export const statusLabel = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace("_", " ") : "—";
