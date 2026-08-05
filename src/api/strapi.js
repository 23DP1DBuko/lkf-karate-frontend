import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:1337";


const api = axios.create({
  baseURL: `${API_URL}/api`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

export function getQuestionText(question, language) {
  return getLocalizedField(question, language, "text");
}

export function getLocalizedField(item, language, fieldBase) {
  if (!item) return "";
  const langMap = { lv: "Lv", ru: "Ru", en: "En" };
  const suffix = langMap[language] || "Lv";
  const localizedKey = `${fieldBase}${suffix}`;
  if (item[localizedKey]) return item[localizedKey];
  // Fallback chain: lv → en → base field
  return (
    item[`${fieldBase}Lv`] || item[`${fieldBase}En`] || item[fieldBase] || ""
  );
}

/**
 * Get localized array field (e.g. optionsLv, blocksRu).
 * Returns an array, falling back through lv → en → [].
 */
export function getLocalizedArray(item, language, fieldBase) {
  if (!item) return [];
  const langMap = { lv: "Lv", ru: "Ru", en: "En" };
  const suffix = langMap[language] || "Lv";
  const localizedKey = `${fieldBase}${suffix}`;
  if (Array.isArray(item[localizedKey])) return item[localizedKey];
  if (Array.isArray(item[`${fieldBase}Lv`])) return item[`${fieldBase}Lv`];
  if (Array.isArray(item[`${fieldBase}En`])) return item[`${fieldBase}En`];
  if (Array.isArray(item[fieldBase])) return item[fieldBase];
  return [];
}
