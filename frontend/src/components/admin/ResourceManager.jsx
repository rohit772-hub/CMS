import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit3, Trash2, PowerOff, Power, Loader2, Eye, Download, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../ui/select";
import { GlassCard, PageHeader } from "../dashboard/Common";
import ExcelUploadBox from "./ExcelUploadBox";
import FieldRenderer from "./FieldRenderer";
import {
  listResources, createResource, updateResource, deleteResource, toggleStatus,
  bulkCreate, bulkDelete, fmtDate, downloadCSV,
} from "../../lib/resources";

/**
 * ResourceManager — reusable CRUD page.
 *
 * Props (additions to previous):
 *   basePath:   "/admin/resources" (default) or "/resources"
 *   readOnly:   true → hide Add/Edit/Disable/Delete/Excel; render search + table only
 *   downloadable: render Download CSV button
 *   selectable: render checkboxes + "Delete selected" button (write perm required)
 *   filters:    [{ key, label, options:[{value,label}] }] — render top filter dropdowns (client-side AND filter)
 *   viewable:   true → render View action button that opens a read-only details dialog
 *   actionsOverride: function(row, helpers) => ReactNode (replaces default actions)
 *   addLabel:   string (default "Add new")
 *   srStartLabel: string (default "Sr")
 */
export default function ResourceManager(props) {
  const {
    kind, title, subtitle, eyebrow,
    fields = [], columns, transformBeforeSave,
    excelHint, excelEnabled = true,
    onDataChanged, defaultForm, tableTestId,
    basePath, readOnly = false, downloadable = false, selectable = false,
    filters = [], viewable = false,
    addLabel = "Add new",
  } = props;

  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm || {});
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [viewing, setViewing] = useState(null);
  const [filterValues, setFilterValues] = useState({});

  const reload = async (search = q) => {
    setLoading(true);
    try {
      const data = await listResources(kind, search, basePath);
      setItems(data.items || []);
      onDataChanged && onDataChanged(data.items || []);
      setSelected(new Set());
    } catch { toast.error("Failed to load records"); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(""); /* eslint-disable-next-line */ }, [kind, basePath]);
  useEffect(() => { const t = setTimeout(() => reload(q), 280); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q]);

  const filtered = useMemo(() => {
    if (!filters.length) return items;
    return items.filter((row) =>
      filters.every((f) => {
        const v = filterValues[f.key];
        if (!v || v === "__all__") return true;
        const cell = row[f.key];
        if (Array.isArray(cell)) return cell.includes(v);
        return String(cell ?? "") === String(v);
      })
    );
  }, [items, filters, filterValues]);

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleSel = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((r) => r.id)));

  const openAdd = () => { setEditing(null); setForm(defaultForm || {}); setOpen(true); };
  const openEdit = (row) => { setEditing(row); setForm({ ...row }); setOpen(true); };

  const onSave = async (e) => {
    e?.preventDefault?.();
    for (const f of fields) {
      if (f.required && (form[f.key] === undefined || form[f.key] === "" || (Array.isArray(form[f.key]) && form[f.key].length === 0))) {
        toast.error(`${f.label} is required`); return;
      }
    }
    setSaving(true);
    try {
      const fieldMap = Object.fromEntries(fields.map((f) => [f.key, f]));
      const body = transformBeforeSave ? transformBeforeSave(form, fieldMap) : form;
      if (editing) { await updateResource(kind, editing.id, body, basePath); toast.success("Updated"); }
      else { await createResource(kind, body, basePath); toast.success("Saved"); }
      setOpen(false); await reload();
    } catch (e) { toast.error(e.response?.data?.detail || "Save failed"); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try { await deleteResource(kind, toDelete.id, basePath); toast.success("Deleted"); setToDelete(null); await reload(); }
    catch { toast.error("Delete failed"); }
  };
  const onToggle = async (row) => {
    const next = row.status === "disabled" ? "active" : "disabled";
    try { await toggleStatus(kind, row.id, next, basePath); toast.success(`Marked ${next}`); await reload(); }
    catch { toast.error("Update failed"); }
  };
  const onBulkRows = async (rows) => {
    const normalised = rows.map((r) => {
      const o = { ...r };
      for (const f of fields) if (f.type === "multi-select" && typeof o[f.key] === "string")
        o[f.key] = o[f.key].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      return o;
    });
    try { const { inserted } = await bulkCreate(kind, normalised, basePath); toast.success(`Uploaded ${inserted} record${inserted===1?"":"s"}`); await reload(); }
    catch (e) { toast.error(e.response?.data?.detail || "Bulk upload failed"); }
  };
  const onBulkDelete = async () => {
    if (!selected.size) return;
    try { await bulkDelete(kind, Array.from(selected), basePath); toast.success(`Deleted ${selected.size}`); await reload(); }
    catch { toast.error("Bulk delete failed"); }
  };
  const onDownload = () => {
    if (!filtered.length) { toast("Nothing to download"); return; }
    downloadCSV(`${kind}-${Date.now()}.csv`, filtered, columns);
    toast.success("Downloading CSV");
  };

  return (
    <div data-testid={`${kind}-page`}>
      <PageHeader eyebrow={eyebrow} title={title} subtitle={subtitle}
        action={!readOnly ? (
          <Button onClick={openAdd} className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)]" data-testid={`${kind}-add-button`}>
            <Plus size={16} className="mr-2" /> {addLabel}
          </Button>
        ) : null}
      />

      {excelEnabled && !readOnly && (
        <div className="mb-5"><ExcelUploadBox onRows={onBulkRows} hint={excelHint} testid={`${kind}-excel`} /></div>
      )}

      <GlassCard>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-[#64748B]" data-testid={`${kind}-search-input`} />
          </div>
          {filters.map((f) => (
            <Select key={f.key} value={filterValues[f.key] || "__all__"} onValueChange={(v) => setFilterValues((s) => ({ ...s, [f.key]: v }))}>
              <SelectTrigger className="h-10 w-40 bg-white/5 border-white/10 text-white" data-testid={`${kind}-filter-${f.key}`}>
                <SelectValue placeholder={f.label} />
              </SelectTrigger>
              <SelectContent className="bg-[#0B1120] border-white/10 text-white">
                <SelectItem value="__all__">All {f.label}</SelectItem>
                {f.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          ))}
          {downloadable && (
            <Button variant="outline" onClick={onDownload} className="h-10 bg-white/5 border-white/10 text-white hover:bg-white/10" data-testid={`${kind}-download`}>
              <Download size={14} className="mr-2" /> Download
            </Button>
          )}
          {selectable && !readOnly && selected.size > 0 && (
            <Button variant="outline" onClick={onBulkDelete} className="h-10 bg-red-500/10 border-red-400/40 text-red-200 hover:bg-red-500/20" data-testid={`${kind}-bulk-delete`}>
              <Trash2 size={14} className="mr-2" /> Delete selected ({selected.size})
            </Button>
          )}
          {loading && <Loader2 size={16} className="animate-spin text-cyan-300" />}
          <span className="text-xs text-[#64748B] ml-auto">{filtered.length} record{filtered.length===1?"":"s"}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid={tableTestId || `${kind}-table`}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-[#64748B]">
                {selectable && !readOnly && (
                  <th className="px-3 py-2 font-medium w-8">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} className="border-white/20 data-[state=checked]:bg-cyan-400" data-testid={`${kind}-select-all`} />
                  </th>
                )}
                <th className="px-3 py-2 font-medium">Sr</th>
                {columns.map((c) => <th key={c.key} className="px-3 py-2 font-medium">{c.label}</th>)}
                {!readOnly || viewable ? <th className="px-3 py-2 font-medium text-right">Action</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <motion.tr key={row.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  data-testid={`${kind}-row-${row.id}`}
                  className={`border-t border-white/5 hover:bg-white/3 ${row.status === "disabled" ? "opacity-60" : ""}`}>
                  {selectable && !readOnly && (
                    <td className="px-3 py-3">
                      <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleSel(row.id)} className="border-white/20 data-[state=checked]:bg-cyan-400" data-testid={`${kind}-select-${row.id}`} />
                    </td>
                  )}
                  <td className="px-3 py-3 text-[#A0ABC0] font-mono">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-3 text-white/90">{c.render ? c.render(row, i) : row[c.key] ?? "—"}</td>
                  ))}
                  {(!readOnly || viewable) && (
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5 justify-end">
                        {viewable && (
                          <Button size="sm" variant="outline" onClick={() => setViewing(row)} className="h-8 bg-white/5 border-white/10 text-cyan-200 hover:bg-cyan-400/10" data-testid={`${kind}-view-${row.id}`}>
                            <Eye size={12} className="mr-1" />View
                          </Button>
                        )}
                        {!readOnly && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => openEdit(row)} className="h-8 bg-white/5 border-white/10 text-cyan-200 hover:bg-cyan-400/10" data-testid={`${kind}-edit-${row.id}`}>
                              <Edit3 size={12} className="mr-1" />Edit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => onToggle(row)} className="h-8 bg-white/5 border-white/10 text-amber-200 hover:bg-amber-400/10" data-testid={`${kind}-disable-${row.id}`}>
                              {row.status === "disabled" ? <><Power size={12} className="mr-1" />Enable</> : <><PowerOff size={12} className="mr-1" />Disable</>}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setToDelete(row)} className="h-8 bg-white/5 border-white/10 text-red-300 hover:bg-red-500/15" data-testid={`${kind}-delete-${row.id}`}>
                              <Trash2 size={12} className="mr-1" />Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))}
              {!filtered.length && !loading && (
                <tr><td colSpan={columns.length + 2 + (selectable && !readOnly ? 1 : 0)} className="px-3 py-10 text-center text-[#64748B]">
                  No records {readOnly ? "yet — ask an admin to add some." : <>yet. Click <span className="text-cyan-300">{addLabel}</span> or upload via Excel.</>}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0B1120] border border-white/10 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{editing ? "Edit" : "Add new"} {title}</DialogTitle>
            <DialogDescription className="text-[#A0ABC0]">Fill the form and click Save changes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSave} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2" data-testid={`${kind}-form`}>
            {fields.map((f) => (
              <FieldRenderer key={f.key} field={f} value={form[f.key]} onChange={(val) => setForm((s) => ({ ...s, [f.key]: val }))} kind={kind} />
            ))}
            <DialogFooter className="md:col-span-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="bg-white/5 border-white/10 text-white" data-testid={`${kind}-cancel-button`}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white" data-testid={`${kind}-save-button`}>
                {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Saving…</> : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="bg-[#0B1120] border border-white/10 text-white max-w-xl" data-testid={`${kind}-view-dialog`}>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{viewing?.name || viewing?.student_name || viewing?.title || "Details"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {viewing && Object.entries(viewing).filter(([k]) => !["_id", "password"].includes(k)).map(([k, v]) => (
              <div key={k} className="rounded-lg border border-white/5 bg-white/3 px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-[#64748B]">{k}</p>
                <p className="text-white break-all">{Array.isArray(v) ? v.join(", ") : String(v ?? "—")}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="bg-[#0B1120] border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#A0ABC0]">This will permanently remove <span className="text-white">{toDelete?.name || toDelete?.student_name || toDelete?.id}</span>.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10" data-testid={`${kind}-delete-cancel`}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white" data-testid={`${kind}-delete-confirm`}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export { fmtDate };
export function useResourceList(kind, basePath) {
  const [items, setItems] = useState([]);
  const reload = async () => { try { const { items } = await listResources(kind, "", basePath); setItems(items || []); } catch { setItems([]); } };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [kind, basePath]);
  return [items, reload];
}
