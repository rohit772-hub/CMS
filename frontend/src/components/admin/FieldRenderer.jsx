import React, { useRef } from "react";
import { Upload, X } from "lucide-react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Button } from "../ui/button";
import MultiSelect from "./MultiSelect";

/**
 * FieldRenderer — renders one form field based on a schema.
 * Supported types: text, email, tel, number, password, textarea, select, multi-select, image
 */
export default function FieldRenderer({ field, value, onChange }) {
  const { key, label, type = "text", placeholder, options = [], required, span = 1, accept } = field;
  const fileRef = useRef(null);

  const baseCls =
    "h-11 bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60";

  let control = null;

  if (type === "textarea") {
    control = (
      <Textarea
        value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3}
        placeholder={placeholder}
        className="bg-white/5 border-white/10 text-white placeholder:text-[#64748B] focus-visible:ring-cyan-400/60 resize-none"
        data-testid={`field-${key}`}
      />
    );
  } else if (type === "select") {
    control = (
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger className={baseCls} data-testid={`field-${key}`}><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent className="bg-[#0B1120] border-white/10 text-white">
          {options.map((o) => <SelectItem key={o.value} value={o.value} data-testid={`field-${key}-option-${o.value}`}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  } else if (type === "multi-select") {
    control = (
      <MultiSelect options={options} value={Array.isArray(value) ? value : []} onChange={onChange} placeholder={placeholder} testid={`field-${key}`} />
    );
  } else if (type === "image") {
    const readFileAsDataUrl = (file) => new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(file);
    });
    const onPick = async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      if (!f.type.startsWith("image/")) return;
      if (f.size > 2 * 1024 * 1024) return;
      const url = await readFileAsDataUrl(f);
      onChange(url);
    };
    control = (
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative">
            <img src={value} alt="" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
            <button type="button" onClick={() => onChange("")} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#0B1120] border border-white/15 hover:bg-red-500/30 flex items-center justify-center" data-testid={`field-${key}-clear`}>
              <X size={10} />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl border border-dashed border-white/15 bg-white/5 flex items-center justify-center text-[#64748B]">
            <Upload size={16} />
          </div>
        )}
        <input ref={fileRef} type="file" accept={accept || "image/*"} className="hidden" onChange={onPick} data-testid={`field-${key}-file`} />
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="bg-white/5 border-white/10 text-white hover:bg-white/10" data-testid={`field-${key}-button`}>
          <Upload size={12} className="mr-2" /> Upload
        </Button>
      </div>
    );
  } else {
    control = (
      <Input
        type={type}
        value={value ?? ""} onChange={(e) => onChange(type === "number" ? e.target.value : e.target.value)}
        placeholder={placeholder} className={baseCls}
        data-testid={`field-${key}`}
      />
    );
  }

  return (
    <div className={span === 2 ? "md:col-span-2 space-y-2" : "space-y-2"}>
      <Label className="text-sm font-medium text-[#A0ABC0]">
        {label} {required && <span className="text-cyan-300">*</span>}
      </Label>
      {control}
    </div>
  );
}
