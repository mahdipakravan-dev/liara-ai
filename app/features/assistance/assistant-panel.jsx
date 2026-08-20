"use client";

import { GitBranch, Terminal, UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const methods = [
  ["GitHub", GitBranch],
  ["Drag & Drop", UploadCloud],
  ["Liara CLI", Terminal],
];

export function AssistantPanel({ open, onClose, onSelect, message }) {
  return (
    <section
      aria-label="دستیار استقرار"
      aria-hidden={!open}
      className={cn(
        "fixed bottom-5 left-5 z-50 w-[calc(100%-40px)] max-w-[370px] origin-bottom-left rounded-[26px] border border-[#78f3c5]/20 bg-[#22242d]/96 p-5 shadow-[0_24px_80px_rgba(0,0,0,.55)] backdrop-blur-2xl transition duration-300",
        open ? "scale-100 opacity-100" : "pointer-events-none scale-90 opacity-0",
      )}
    >
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="orb relative size-12 rounded-full" />
          <div>
            <p className="font-bold">دستیار لیارا</p>
            <span className="text-xs text-[#78f3c5]">{message ? "در حال پایش" : "آماده‌ی کمک"}</span>
          </div>
        </div>
        <Button aria-label="بستن دستیار" title="بستن دستیار" variant="ghost" size="icon" onClick={onClose}>
          <X />
        </Button>
      </header>

      <div className="mt-5 rounded-2xl bg-black/20 p-4">
        <h2 className="text-lg font-bold">{message ? "شروع شد!" : "بسیار خب!"}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">
          {message || "من منتظرم کدهات رو روی لیارا آپلود کنی. یکی از روش‌های زیر رو انتخاب کن؛ اگر سؤالی داشتی، روی همون روش کلیک کن."}
        </p>
      </div>

      {!message && (
        <div className="relative mt-4 grid grid-cols-3 gap-2 before:absolute before:right-[16%] before:left-[16%] before:top-5 before:h-px before:bg-white/10">
          {methods.map(([label, Icon]) => (
            <button key={label} onClick={() => onSelect(label)} className="relative z-10 flex flex-col items-center gap-2 rounded-xl p-2 text-[11px] text-slate-300 transition hover:bg-white/5 hover:text-white">
              <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-[#292b35]"><Icon size={18} /></span>
              {label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
