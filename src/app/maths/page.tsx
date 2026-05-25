"use client";
import { useState } from "react";
import dynamic from "next/dynamic";

const MatricesTab   = dynamic(() => import("@/components/maths/MatricesTab"),   { ssr:false });
const SuitesTab     = dynamic(() => import("@/components/maths/SuitesTab"),     { ssr:false });
const IntegraesTab  = dynamic(() => import("@/components/maths/IntegraesTab"),  { ssr:false });
const FonctionsTab  = dynamic(() => import("@/components/maths/FonctionsTab"),  { ssr:false });

type Tab = "matrices" | "suites" | "integrales" | "fonctions";

const TABS: { id: Tab; label: string; icon: string; desc: string; color: string }[] = [
  { id:"fonctions",  icon:"📈", label:"Fonctions & Dérivées", desc:"Tracé, dérivée symbolique, tangente, racines",   color:"#00d4ff" },
  { id:"integrales", icon:"∫",  label:"Intégrales",           desc:"Méthodes numériques avec étapes et visualisation", color:"#ec4899" },
  { id:"suites",     icon:"∑",  label:"Suites",               desc:"Arithmétiques, géométriques, récurrence, Fibonacci",color:"#22c55e" },
  { id:"matrices",   icon:"⊞",  label:"Matrices",             desc:"Déterminant, inverse, Gauss-Jordan pas à pas",    color:"#7c3aed" },
];

export default function MathsPage() {
  const [tab, setTab] = useState<Tab>("fonctions");
  const active = TABS.find(t => t.id === tab)!;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold mb-1" style={{ color: active.color }}>
        Calculateur Mathématiques
      </h1>
      <p className="text-[#64748b] text-sm mb-6">Chaque calcul est détaillé étape par étape.</p>

      {/* Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-7">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="p-3 rounded-xl border text-left transition-all"
            style={tab === t.id
              ? { borderColor: t.color, background: `${t.color}12`, boxShadow: `0 0 16px ${t.color}22` }
              : { borderColor: "#2a2d3a", background: "rgba(26,29,39,0.6)" }}>
            <div className="text-xl mb-1">{t.icon}</div>
            <div className="text-xs font-semibold" style={{ color: tab === t.id ? t.color : "#94a3b8" }}>{t.label}</div>
            <div className="text-[10px] text-[#64748b] leading-3 mt-0.5">{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "fonctions"  && <FonctionsTab />}
      {tab === "integrales" && <IntegraesTab />}
      {tab === "suites"     && <SuitesTab />}
      {tab === "matrices"   && <MatricesTab />}
    </div>
  );
}
