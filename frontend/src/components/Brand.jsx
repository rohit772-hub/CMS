import React from "react";

/**
 * Brand — CMS / Create Mind Studio logo.
 *  - <Brand /> renders logo + wordmark
 *  - <Brand iconOnly /> renders only the round mark (collapsed sidebar)
 */
export default function Brand({ iconOnly = false, theme = "dark", className = "", testid = "brand" }) {
  const wordmarkColor = theme === "light" ? "text-[#0d3b3f]" : "text-white";
  const subtitleColor = theme === "light" ? "text-[#126b6e]" : "text-[#5fc8c4]";
  return (
    <div className={`flex items-center gap-2.5 ${className}`} data-testid={testid}>
      <img src="/cms-logo.png" alt="Create Mind Studio" className="w-9 h-9 object-contain shrink-0 select-none" draggable={false} />
      {!iconOnly && (
        <div className="leading-tight">
          <p className={`font-heading text-base font-semibold ${wordmarkColor}`}>Create Mind</p>
          <p className={`text-[10px] uppercase tracking-[0.32em] ${subtitleColor}`}>Studio</p>
        </div>
      )}
    </div>
  );
}
