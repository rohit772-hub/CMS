import React, { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";

/**
 * ExcelUploadBox — drag/click to upload .xlsx/.csv; parses to objects and hands to onRows.
 * Props:
 *   onRows: (rows: object[]) => Promise<void>|void
 *   hint?: string — sample columns help text
 *   testid?: string
 */
export default function ExcelUploadBox({ onRows, hint, testid = "excel-upload-box" }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const handle = async (file) => {
    if (!file) return;
    const ok = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!ok) { toast.error("Please upload a .xlsx, .xls or .csv file."); return; }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (!rows.length) { toast.error("The sheet is empty."); return; }
      await onRows(rows);
    } catch (e) {
      toast.error("Could not parse file. Please use a well-formed Excel/CSV.");
    } finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };

  return (
    <div
      className="rounded-xl border border-dashed border-white/15 bg-white/3 p-4 flex items-center gap-4"
      data-testid={testid}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); handle(e.dataTransfer.files?.[0]); }}
    >
      <div className="w-10 h-10 rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 flex items-center justify-center">
        <Upload size={18} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">Bulk upload via Excel / CSV</p>
        <p className="text-xs text-[#A0ABC0] mt-0.5">{hint || "Drag a .xlsx file or click upload. First row is used as column headers."}</p>
      </div>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handle(e.target.files?.[0])} data-testid={`${testid}-file`} />
      <Button type="button" disabled={busy} onClick={() => ref.current?.click()} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white" data-testid={`${testid}-button`}>
        {busy ? <><Loader2 size={14} className="animate-spin mr-2" />Uploading…</> : <><Upload size={14} className="mr-2" />Upload file</>}
      </Button>
    </div>
  );
}
