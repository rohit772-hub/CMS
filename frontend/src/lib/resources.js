import api from "./api";

const BASE = (kind) => `/admin/resources/${kind}`;

export const listResources  = (kind, q = "") => api.get(BASE(kind), { params: q ? { q } : {} }).then((r) => r.data);
export const createResource = (kind, body)   => api.post(BASE(kind), body).then((r) => r.data);
export const updateResource = (kind, id, b)  => api.put(`${BASE(kind)}/${id}`, b).then((r) => r.data);
export const deleteResource = (kind, id)     => api.delete(`${BASE(kind)}/${id}`).then((r) => r.data);
export const toggleStatus   = (kind, id, st) => api.patch(`${BASE(kind)}/${id}/status`, { status: st }).then((r) => r.data);
export const bulkCreate     = (kind, items)  => api.post(`${BASE(kind)}/bulk`, { items }).then((r) => r.data);

export const fmtDate = (iso) => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch { return iso; }
};

export const toArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
};
