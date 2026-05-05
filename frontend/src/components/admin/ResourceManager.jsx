import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Edit3, Trash2, PowerOff, Power, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../ui/alert-dialog";
import { GlassCard, PageHeader } from "../dashboard/Common";
import ExcelUploadBox from "./ExcelUploadBox";
import FieldRenderer from "./FieldRenderer";
import {
  listResources, createResource, updateResource, deleteResource, toggleStatus, bulkCreate, fmtDate,
} from "../../lib/resources";

/**
 * ResourceManager — one reusable page for every CRUD module.
 *
 * Props:
 *   kind: backend resource kind (e.g. 'schools')
 *   title, subtitle, eyebrow
 *   fields: [{ key, label, type, required?, options?, accept?, multiple?, placeholder?, render?(row, idx) }]
 *   columns: [{ key, label, render?(row, idx) }]
 *   transformBeforeSave?(form, fieldMap) => body
 *   excelHint?: string
 *   excelEnabled?: boolean
 *   onDataChanged?(items): void  // for parent listeners (dropdown refresh)
 *   defaultForm?: object
 *   tableTestId?: string
 */
export default function ResourceManager({
  kind, title, subtitle, eyebrow,
  fields, columns, transformBeforeSave, excelHint, excelEnabled = true,
  onDataChanged, defaultForm, tableTestId,
}) {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm || {});
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const reload = async (search = q) => {
    setLoading(true);
    try {
      const data = await listResources(kind, search);
      setItems(data.items || []);
      onDataChanged && onDataChanged(data.items || []);
    } catch (e) {
      toast.error("Failed to load records");
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(""); /* eslint-disable-next-line */ }, [kind]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => reload(q), 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [q]);

  const filtered = useMemo(() => items, [items]);

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
      if (editing) {
        await updateResource(kind, editing.id, body);
        toast.success("Updated successfully");
      } else {
        await createResource(kind, body);
        toast.success("Saved successfully");
      }
      setOpen(false);
      await reload();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Save failed");
    } finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try { await deleteResource(kind, toDelete.id); toast.success("Deleted"); setToDelete(null); await reload(); }
    catch (e) { toast.error("Delete failed"); }
  };

  const onToggle = async (row) => {
    const next = row.status === "disabled" ? "active" : "disabled";
    try { await toggleStatus(kind, row.id, next); toast.success(`Marked ${next}`); await reload(); }
    catch { toast.error("Update failed"); }
  };

  const onBulkRows = async (rows) => {
    // light normalisation: split csv-like columns
    const normalised = rows.map((r) => {
      const obj = { ...r };
      for (const f of fields) {
        if (f.type === "multi-select" && typeof obj[f.key] === "string") {
          obj[f.key] = obj[f.key].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        }
      }
      return obj;
    });
    try {
      const { inserted } = await bulkCreate(kind, normalised);
      toast.success(`Uploaded ${inserted} record${inserted === 1 ? "" : "s"}`);
      await reload();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Bulk upload failed");
    }
  };

  return (
    <div data-testid={`${kind}-page`}>
      <PageHeader
        eyebrow={eyebrow} title={title} subtitle={subtitle}
        action={
          <Button onClick={openAdd} className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white shadow-[0_8px_28px_rgba(0,229,255,0.35)]" data-testid={`${kind}-add-button`}>
            <Plus size={16} className="mr-2" /> Add new
          </Button>
        }
      />

      {excelEnabled && (
        <div className="mb-5">
          <ExcelUploadBox onRows={onBulkRows} hint={excelHint} testid={`${kind}-excel`} />
        </div>
      )}

      <GlassCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <Input
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…"
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-[#64748B]"
              data-testid={`${kind}-search-input`}
            />
          </div>
          {loading && <Loader2 size={16} className="animate-spin text-cyan-300" />}
          <span className="text-xs text-[#64748B]">{filtered.length} record{filtered.length === 1 ? "" : "s"}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid={tableTestId || `${kind}-table`}>
            <thead>
              <tr className="text-left text-xs uppercase tracking-widest text-[#64748B]">
                <th className="px-3 py-2 font-medium">Sr</th>
                {columns.map((c) => <th key={c.key} className="px-3 py-2 font-medium">{c.label}</th>)}
                <th className="px-3 py-2 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  data-testid={`${kind}-row-${row.id}`}
                  className={`border-t border-white/5 hover:bg-white/3 ${row.status === "disabled" ? "opacity-60" : ""}`}
                >
                  <td className="px-3 py-3 text-[#A0ABC0] font-mono">{i + 1}</td>
                  {columns.map((c) => (
                    <td key={c.key} className="px-3 py-3 text-white/90">
                      {c.render ? c.render(row, i) : row[c.key] ?? "—"}
                    </td>
                  ))}
                  <td className="px-3 py-3">
                    <div className="flex gap-1.5 justify-end">
                      <Button size="sm" variant="outline" onClick={() => openEdit(row)} className="h-8 bg-white/5 border-white/10 text-cyan-200 hover:bg-cyan-400/10" data-testid={`${kind}-edit-${row.id}`}>
                        <Edit3 size={12} className="mr-1" />Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => onToggle(row)} className="h-8 bg-white/5 border-white/10 text-amber-200 hover:bg-amber-400/10" data-testid={`${kind}-disable-${row.id}`}>
                        {row.status === "disabled" ? <><Power size={12} className="mr-1" />Enable</> : <><PowerOff size={12} className="mr-1" />Disable</>}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setToDelete(row)} className="h-8 bg-white/5 border-white/10 text-red-300 hover:bg-red-500/15" data-testid={`${kind}-delete-${row.id}`}>
                        <Trash2 size={12} className="mr-1" />Delete
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {!filtered.length && !loading && (
                <tr><td colSpan={columns.length + 2} className="px-3 py-10 text-center text-[#64748B]">
                  No records yet. Click <span className="text-cyan-300">Add new</span> or upload via Excel.
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
              <FieldRenderer
                key={f.key} field={f}
                value={form[f.key]}
                onChange={(val) => setForm((s) => ({ ...s, [f.key]: val }))}
                kind={kind}
              />
            ))}
            <DialogFooter className="md:col-span-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="bg-white/5 border-white/10 text-white" data-testid={`${kind}-cancel-button`}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-[#00E5FF] to-[#0055FF] text-white" data-testid={`${kind}-save-button`}>
                {saving ? <><Loader2 size={14} className="animate-spin mr-2" />Saving…</> : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent className="bg-[#0B1120] border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription className="text-[#A0ABC0]">
              This will permanently remove <span className="text-white">{toDelete?.name || toDelete?.id}</span>. You can't undo this.
            </AlertDialogDescription>
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

// Helper reload hook
export function useResourceList(kind) {
  const [items, setItems] = useState([]);
  const reload = async () => {
    try { const { items } = await listResources(kind, ""); setItems(items || []); } catch { setItems([]); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [kind]);
  return [items, reload];
}
