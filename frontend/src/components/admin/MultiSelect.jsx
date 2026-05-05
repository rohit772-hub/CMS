import React, { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Checkbox } from "../ui/checkbox";

/**
 * MultiSelect — simple shadcn-Popover based multi-select.
 * Props:
 *   options: [{ value, label }]
 *   value: string[]
 *   onChange: (string[]) => void
 *   placeholder: string
 *   testid: string
 */
export default function MultiSelect({ options = [], value = [], onChange, placeholder = "Select…", testid = "multi-select" }) {
  const [open, setOpen] = useState(false);
  const labelFor = (v) => options.find((o) => o.value === v)?.label || v;
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button" data-testid={testid}
          className="w-full min-h-[44px] rounded-md bg-white/5 border border-white/10 text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/10 transition"
        >
          <div className="flex flex-wrap gap-1.5 items-center">
            {value.length === 0 && <span className="text-[#64748B] text-sm">{placeholder}</span>}
            {value.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 bg-cyan-400/15 border border-cyan-400/30 text-cyan-200 text-xs px-2 py-0.5 rounded-full">
                {labelFor(v)}
                <X size={10} role="button" onClick={(e) => { e.stopPropagation(); toggle(v); }} />
              </span>
            ))}
          </div>
          <ChevronsUpDown size={14} className="text-[#64748B] shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="bg-[#0B1120] border border-white/10 text-white p-0 min-w-[var(--radix-popover-trigger-width)] max-h-72 overflow-auto">
        {options.length === 0 && <p className="p-3 text-sm text-[#64748B]">No options yet.</p>}
        <ul className="py-1">
          {options.map((o) => {
            const on = value.includes(o.value);
            return (
              <li
                key={o.value}
                onClick={() => toggle(o.value)}
                data-testid={`${testid}-option-${o.value}`}
                className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/5 cursor-pointer"
              >
                <Checkbox checked={on} className="border-white/20 data-[state=checked]:bg-cyan-400 data-[state=checked]:text-black" />
                <span className="flex-1">{o.label}</span>
                {on && <Check size={14} className="text-cyan-300" />}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
