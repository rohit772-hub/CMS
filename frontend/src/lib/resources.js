import api from "./api";

const buildBase = (basePath, kind) => `${basePath || "/admin/resources"}/${kind}`;

export const listResources  = (kind, q = "", basePath) => api.get(buildBase(basePath, kind), { params: q ? { q } : {} }).then((r) => r.data);
export const createResource = (kind, body, basePath)   => api.post(buildBase(basePath, kind), body).then((r) => r.data);
export const updateResource = (kind, id, b, basePath)  => api.put(`${buildBase(basePath, kind)}/${id}`, b).then((r) => r.data);
export const deleteResource = (kind, id, basePath)     => api.delete(`${buildBase(basePath, kind)}/${id}`).then((r) => r.data);
export const toggleStatus   = (kind, id, st, basePath) => api.patch(`${buildBase(basePath, kind)}/${id}/status`, { status: st }).then((r) => r.data);
export const bulkCreate     = (kind, items, basePath)  => api.post(`${buildBase(basePath, kind)}/bulk`, { items }).then((r) => r.data);
export const bulkDelete     = (kind, ids, basePath)    => api.post(`${buildBase(basePath, kind)}/bulk-delete`, { ids }).then((r) => r.data);

export const fmtDate = (iso) => {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" }); } catch { return iso; }
};

export function downloadCSV(filename, items, columns) {
  if (!items?.length) return;
  const headers = columns.map((c) => c.label);
  const keys = columns.map((c) => c.key);
  const lines = [headers.join(",")];
  for (const row of items) {
    lines.push(keys.map((k) => {
      const v = row[k];
      const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
