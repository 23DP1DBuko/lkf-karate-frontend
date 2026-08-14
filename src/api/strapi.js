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
 * Fetch all documents of a draft-and-publish collection, merging the
 * published list (for correct `publishedAt`) with the draft working copies
 * so published and draft entries appear exactly once.
 */
export async function fetchAllWithStatus(path) {
  const qs = "sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=200";
  const [published, drafts] = await Promise.all([
    api.get(`${path}?${qs}`).then((r) => r.data.data),
    api.get(`${path}?${qs}&status=draft`).then((r) => r.data.data),
  ]);
  const publishedAtById = new Map(
    published.map((doc) => [doc.documentId, doc.publishedAt])
  );
  const byId = new Map();
  for (const doc of drafts) {
    if (!byId.has(doc.documentId)) {
      byId.set(doc.documentId, {
        ...doc,
        publishedAt: publishedAtById.get(doc.documentId) ?? doc.publishedAt,
      });
    }
  }
  // Safety net: include any document that only exists in the published list.
  for (const doc of published) {
    if (!byId.has(doc.documentId)) byId.set(doc.documentId, doc);
  }
  return [...byId.values()];
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
