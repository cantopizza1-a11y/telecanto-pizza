import axios from "axios";
export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const http = axios.create({ baseURL: API });
http.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("tc_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
export const formatEuro = (n) => `${(Number(n) || 0).toFixed(2).replace(".", ",")}€`;
export const STATUS_LABELS = {
  new: "Νέα", confirmed: "Επιβεβαιωμένη", preparing: "Σε προετοιμασία",
  ready: "Έτοιμη", delivering: "Προς παράδοση", completed: "Ολοκληρωμένη", cancelled: "Ακυρωμένη",
};
export const STATUS_COLORS = {
  new: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-sky-100 text-sky-800 border-sky-200",
  preparing: "bg-purple-100 text-purple-800 border-purple-200",
  ready: "bg-emerald-100 text-emerald-800 border-emerald-200",
  delivering: "bg-pink-100 text-pink-800 border-pink-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};
