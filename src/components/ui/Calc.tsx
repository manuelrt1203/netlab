"use client";
import { useState } from "react";

/* Briques UI partagées des pages de calcul (mêmes conventions que /telecoms et /fibre-optique) */

export function Card({ color, title, formula, explainer, children }: {
  color: string; title: string; formula?: string; explainer?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-5 border-b border-[#2a2d3a]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-bold" style={{ color }}>{title}</h3>
            {formula && <code className="text-xs text-[#64748b] mt-0.5 block break-words">{formula}</code>}
          </div>
          {explainer && (
            <button onClick={() => setOpen((o) => !o)}
              className="shrink-0 px-2 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all">
              {open ? "Fermer" : "C'est quoi ?"}
            </button>
          )}
        </div>
        {open && <div className="mt-3 text-xs text-[#94a3b8] leading-5 bg-black/20 rounded-lg p-3 space-y-1">{explainer}</div>}
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

export function Field({ label, unit, value, onChange, hint, step, text }: {
  label: string; unit?: string; value: string; onChange: (v: string) => void; hint?: string; step?: string;
  /** Saisie libre (adresse IP, MAC…) au lieu d'un nombre */
  text?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-[#64748b] mb-1 block">{label} {unit && <span className="text-[#475569]">({unit})</span>}</label>
      <input type={text ? "text" : "number"} value={value} step={text ? undefined : step ?? "any"} spellCheck={false} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono outline-none focus:border-[#00d4ff] transition-colors" />
      {hint && <p className="text-[#64748b] text-[10px] mt-1 leading-3">{hint}</p>}
    </div>
  );
}

export function Select<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs text-[#64748b] mb-1 block">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}
        className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm outline-none focus:border-[#00d4ff] transition-colors">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Slider({ label, value, onChange, min, max, step = 1, display }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; display?: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-[#64748b] mb-1">
        <span>{label}</span>
        <span className="font-mono text-[#e2e8f0]">{display ?? value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full accent-[#00d4ff]" />
    </div>
  );
}

export function Result({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-sm text-[#64748b]">{label}</span>
      <span className={`font-bold font-mono text-sm text-right ${accent ? "text-[#00d4ff]" : "text-[#e2e8f0]"}`}>{value}</span>
    </div>
  );
}

export function Divider() { return <div className="border-t border-[#2a2d3a] my-1" />; }

export function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#64748b] italic mt-1">{children}</p>;
}

export function Tabs<T extends string>({ tabs, value, onChange }: {
  tabs: { id: T; icon: string; label: string; desc: string; color: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className={`grid grid-cols-2 ${tabs.length >= 5 ? "sm:grid-cols-5" : tabs.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3"} gap-2 mb-7`}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className="p-3 rounded-xl border text-left transition-all"
          style={value === t.id
            ? { borderColor: t.color, background: `${t.color}12`, boxShadow: `0 0 16px ${t.color}22` }
            : { borderColor: "#2a2d3a", background: "rgba(26,29,39,0.6)" }}>
          <div className="text-xl mb-1">{t.icon}</div>
          <div className="text-xs font-semibold" style={{ color: value === t.id ? t.color : "#94a3b8" }}>{t.label}</div>
          <div className="text-[10px] text-[#64748b] leading-3 mt-0.5">{t.desc}</div>
        </button>
      ))}
    </div>
  );
}

/* ─── Formatage ────────────────────────────────────────────────────── */

const PREFIXES: [number, string][] = [
  [1e12, "T"], [1e9, "G"], [1e6, "M"], [1e3, "k"], [1, ""],
  [1e-3, "m"], [1e-6, "µ"], [1e-9, "n"], [1e-12, "p"], [1e-15, "f"],
];

/** 4700 → "4.7 k", 1.5e-6 → "1.5 µ" */
export function si(v: number, unit = "", digits = 3): string {
  if (!isFinite(v)) return "—";
  if (v === 0) return `0 ${unit}`.trim();
  const abs = Math.abs(v);
  const [f, p] = PREFIXES.find(([f]) => abs >= f * 0.9995) ?? PREFIXES[PREFIXES.length - 1];
  return `${parseFloat((v / f).toPrecision(digits))} ${p}${unit}`.trim();
}

export function fmt(v: number, digits = 4): string {
  if (!isFinite(v)) return "—";
  if (v !== 0 && (Math.abs(v) < 1e-3 || Math.abs(v) >= 1e6)) return v.toExponential(digits - 1);
  return parseFloat(v.toPrecision(digits)).toString();
}

export const num = (s: string) => parseFloat(s);
