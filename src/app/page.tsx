"use client";
import Link from "next/link";
import { useState } from "react";
import { ANNEES, Annee, CATEGORIES } from "@/lib/categories";
import YearBadge from "@/components/YearBadge";

export default function Home() {
  const [annee, setAnnee] = useState<Annee | null>(null);

  const total = CATEGORIES.reduce((n, c) => n + c.tools.length, 0);
  const compte = (a: Annee) => CATEGORIES.reduce((n, c) => n + c.tools.filter((t) => t.annee === a).length, 0);
  const categories = CATEGORIES
    .map((cat) => ({ ...cat, tools: cat.tools.filter((t) => annee === null || t.annee === annee) }))
    .filter((cat) => cat.tools.length > 0);

  const filtres: { value: Annee | null; label: string; n: number; color: string }[] = [
    { value: null, label: "Tout", n: total, color: "#00d4ff" },
    ...ANNEES.map((a) => ({ value: a.value, label: `${a.label} (${a.court})`, n: compte(a.value), color: a.color })),
  ];

  return (
    <div className="px-6 py-12 max-w-6xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-bold text-[#00d4ff] tracking-widest mb-3">NetLab</h1>
        <p className="text-[#64748b]">Suite d&apos;outils interactifs pour le BUT Réseaux & Télécommunications</p>
        <div className="flex justify-center gap-4 mt-3 text-xs text-[#475569]">
          {[`${total} outils`, `${CATEGORIES.length} domaines`, "100% local"].map((t) => (
            <span key={t} className="px-3 py-1 border border-[#2a2d3a] rounded-full">{t}</span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-10" role="group" aria-label="Filtrer par année">
        {filtres.map((f) => {
          const actif = annee === f.value;
          return (
            <button key={f.label} onClick={() => setAnnee(f.value)} aria-pressed={actif}
              className="px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer"
              style={actif
                ? { color: f.color, borderColor: f.color, background: `${f.color}18` }
                : { color: "#64748b", borderColor: "#2a2d3a" }}>
              {f.label} <span className="opacity-60 font-normal">· {f.n}</span>
            </button>
          );
        })}
      </div>

      {categories.map((cat) => (
        <div key={cat.label} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#2a2d3a]" />
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: cat.color }}>{cat.label}</h2>
            <div className="h-px flex-1 bg-[#2a2d3a]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cat.tools.map((t) => (
              <Link key={t.href} href={t.href}
                className="glass rounded-xl p-4 hover:scale-[1.02] transition-all border border-[#2a2d3a]">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-2xl">{t.icon}</span>
                  <YearBadge tool={t} />
                </div>
                <h3 className="font-semibold text-sm mb-1" style={{ color: cat.color }}>{t.label}</h3>
                <p className="text-[#64748b] text-xs leading-4">{t.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
