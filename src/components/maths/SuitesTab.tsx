"use client";
import { useState } from "react";

type SuiteType = "arithmetique" | "geometrique" | "recurrence" | "fibonacci";

function fmt(n: number): string {
  if (!isFinite(n)) return n > 0 ? "+∞" : "−∞";
  const r = Math.round(n * 10000) / 10000;
  return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, "");
}

function safeEval(expr: string, u: number, n: number): number {
  try {
    // Replace common math functions and variables
    const sanitized = expr
      .replace(/\bu\b/g, `(${u})`)
      .replace(/\bn\b/g, `(${n})`)
      .replace(/\^/g, "**")
      .replace(/Math\./g, "Math.")
      .replace(/\bsqrt\b/g, "Math.sqrt")
      .replace(/\babs\b/g, "Math.abs")
      .replace(/\bsin\b/g, "Math.sin")
      .replace(/\bcos\b/g, "Math.cos")
      .replace(/\bexp\b/g, "Math.exp")
      .replace(/\bln\b/g, "Math.log");
    // eslint-disable-next-line no-new-func
    return Function(`"use strict"; return (${sanitized})`)();
  } catch { return NaN; }
}

interface TermStep { n: number; value: number; computation: string; }

function computeArith(u0: number, r: number, N: number): { terms: TermStep[]; sum: number; formula: string; convInfo: string } {
  const terms: TermStep[] = [];
  let sum = 0;
  for (let n = 0; n < N; n++) {
    const v = u0 + n * r;
    sum += v;
    terms.push({ n, value: v, computation: n === 0 ? `u₀ = ${fmt(u0)}` : `u${n} = ${fmt(u0)} + ${n}×${fmt(r)} = ${fmt(v)}` });
  }
  return {
    terms, sum,
    formula: `uₙ = ${fmt(u0)} + n·${fmt(r)}`,
    convInfo: r === 0 ? "Suite constante (converge vers u₀)" : `Suite diverge (raison r = ${fmt(r)} ≠ 0)`,
  };
}

function computeGeo(u0: number, q: number, N: number): { terms: TermStep[]; sum: number; formula: string; convInfo: string } {
  const terms: TermStep[] = [];
  let sum = 0;
  for (let n = 0; n < N; n++) {
    const v = u0 * Math.pow(q, n);
    sum += v;
    terms.push({ n, value: v, computation: n === 0 ? `u₀ = ${fmt(u0)}` : `u${n} = ${fmt(u0)} × ${fmt(q)}^${n} = ${fmt(v)}` });
  }
  const sumFormula = Math.abs(q - 1) < 1e-10 ? `S = ${fmt(u0)} × ${N}` : `S = u₀ × (1 − qᴺ)/(1 − q) = ${fmt(u0)} × (1 − ${fmt(q)}^${N})/(1 − ${fmt(q)}) = ${fmt(sum)}`;
  return {
    terms, sum,
    formula: `uₙ = ${fmt(u0)} × ${fmt(q)}ⁿ`,
    convInfo: Math.abs(q) < 1
      ? `|q| = ${fmt(Math.abs(q))} < 1 → converge vers 0  |  Série converge vers ${fmt(u0 / (1 - q))}`
      : Math.abs(q) === 1 ? "q = ±1 → suite bornée mais non convergente"
      : `|q| = ${fmt(Math.abs(q))} > 1 → suite diverge vers ±∞`,
  };
}

function computeRecurrence(u0: number, expr: string, N: number): { terms: TermStep[]; convInfo: string } {
  const terms: TermStep[] = [];
  let u = u0;
  terms.push({ n: 0, value: u, computation: `u₀ = ${fmt(u)}` });
  for (let n = 1; n < N; n++) {
    const prev = u;
    u = safeEval(expr, prev, n - 1);
    if (isNaN(u) || !isFinite(u)) { terms.push({ n, value: u, computation: `u${n} = f(${fmt(prev)}) = ?` }); break; }
    terms.push({ n, value: u, computation: `u${n} = f(${fmt(prev)}) = ${fmt(u)}` });
  }
  const last = terms.at(-1)?.value ?? NaN;
  const prev2 = terms.at(-2)?.value ?? NaN;
  const converging = isFinite(last) && Math.abs(last - prev2) < 1e-6;
  return { terms, convInfo: converging ? `Semble converger vers ≈ ${fmt(last)}` : "Diverge ou non convergée en N termes" };
}

function computeFibo(N: number): TermStep[] {
  const terms: TermStep[] = [];
  let a = 0, b = 1;
  for (let n = 0; n < N; n++) {
    terms.push({ n, value: a, computation: n <= 1 ? `F${n} = ${a}` : `F${n} = F${n-1} + F${n-2} = ${b > a ? b : a-b} + ${b > a ? a-b : b} = ${a}` });
    [a, b] = [b, a + b];
  }
  return terms;
}

export default function SuitesTab() {
  const [type, setType] = useState<SuiteType>("arithmetique");
  const [u0, setU0] = useState(1);
  const [r, setR] = useState(3);      // raison arith
  const [q, setQ] = useState(2);      // raison géo
  const [expr, setExpr] = useState("u/2 + 1"); // récurrence
  const [N, setN] = useState(10);
  const [computed, setComputed] = useState(false);

  let terms: TermStep[] = [];
  let formula = "";
  let sumInfo = "";
  let convInfo = "";
  let sum = 0;

  if (computed) {
    if (type === "arithmetique") {
      const res = computeArith(u0, r, N);
      terms = res.terms; formula = res.formula; sum = res.sum; convInfo = res.convInfo;
      sumInfo = `S${N} = Σuₙ = ${fmt(sum)}  (formule: S = N·u₀ + N(N−1)/2·r = ${fmt(N * u0 + (N * (N - 1) / 2) * r)})`;
    } else if (type === "geometrique") {
      const res = computeGeo(u0, q, N);
      terms = res.terms; formula = res.formula; sum = res.sum; convInfo = res.convInfo;
      sumInfo = `S${N} = ${fmt(sum)}`;
    } else if (type === "recurrence") {
      const res = computeRecurrence(u0, expr, N);
      terms = res.terms; convInfo = res.convInfo;
      formula = `uₙ₊₁ = ${expr}`;
    } else {
      terms = computeFibo(N);
      formula = "Fₙ = Fₙ₋₁ + Fₙ₋₂, F₀=0, F₁=1";
      convInfo = `Ratio Fₙ/Fₙ₋₁ → φ = (1+√5)/2 ≈ ${fmt((1 + Math.sqrt(5)) / 2)}`;
    }
  }

  const TYPES: { id: SuiteType; label: string; color: string }[] = [
    { id: "arithmetique", label: "Arithmétique",  color: "#00d4ff" },
    { id: "geometrique",  label: "Géométrique",   color: "#22c55e" },
    { id: "recurrence",   label: "Récurrence",    color: "#f59e0b" },
    { id: "fibonacci",    label: "Fibonacci",     color: "#ec4899" },
  ];
  const color = TYPES.find(t => t.id === type)!.color;

  return (
    <div className="space-y-5">
      {/* Type + params */}
      <div className="glass rounded-xl p-5">
        <div className="flex gap-2 flex-wrap mb-5">
          {TYPES.map(t => (
            <button key={t.id} onClick={() => { setType(t.id); setComputed(false); }}
              className="px-3 py-1.5 text-sm rounded-lg border transition-all"
              style={type === t.id ? { color: t.color, borderColor: t.color, background: `${t.color}18` } : { borderColor: "#2a2d3a", color: "#64748b" }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <Field label="u₀ (premier terme)" value={u0} onChange={setU0} />
          {type === "arithmetique" && <Field label="Raison r" value={r} onChange={setR} />}
          {type === "geometrique"  && <Field label="Raison q" value={q} onChange={setQ} />}
          {type === "recurrence"   && (
            <div className="col-span-2">
              <label className="text-xs text-[#64748b] block mb-1">uₙ₊₁ = f(u, n) =</label>
              <input value={expr} onChange={e => setExpr(e.target.value)}
                className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-[#f59e0b]"
                placeholder="u/2 + 1" />
              <p className="text-[10px] text-[#64748b] mt-1">Variables : <code>u</code> (terme précédent), <code>n</code> (indice). Opérateurs : + − * / ^ sqrt ln exp</p>
            </div>
          )}
          <Field label={`Nombre de termes N`} value={N} onChange={v => setN(Math.max(1, Math.min(50, Math.round(v))))} />
        </div>

        <button onClick={() => setComputed(true)}
          className="px-5 py-2 text-sm font-medium rounded-lg border transition-all"
          style={{ color, borderColor: color, background: `${color}18` }}>
          Calculer →
        </button>
      </div>

      {computed && terms.length > 0 && (
        <>
          {/* Formule + convergence */}
          <div className="glass rounded-xl p-4 space-y-2">
            {formula && (
              <div className="font-mono text-sm" style={{ color }}>
                Formule : <strong>{formula}</strong>
              </div>
            )}
            {sumInfo && <div className="text-sm text-[#94a3b8] font-mono">{sumInfo}</div>}
            <div className={`text-sm font-medium ${convInfo.includes("converge") ? "text-[#22c55e]" : "text-[#f59e0b]"}`}>
              {convInfo}
            </div>
          </div>

          {/* Termes */}
          <div className="glass rounded-xl p-5">
            <p className="text-xs text-[#64748b] mb-4">Calcul des termes étape par étape</p>
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {terms.map((t, i) => (
                <div key={i} className="flex items-baseline gap-4 text-sm font-mono border-b border-[#2a2d3a]/30 pb-1.5">
                  <span className="w-8 text-[#64748b] shrink-0 text-right">{t.n}</span>
                  <span className="text-[#64748b] shrink-0">{t.computation}</span>
                  <span className="ml-auto shrink-0 font-bold" style={{ color }}>
                    {isFinite(t.value) ? fmt(t.value) : "∞"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Visualisation graphique */}
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-[#64748b] mb-3">Représentation graphique des {terms.length} premiers termes</p>
            <div className="flex items-end gap-1 h-32 overflow-x-auto">
              {terms.map((t, i) => {
                const vals = terms.map(t => t.value).filter(isFinite);
                const min = Math.min(...vals), max = Math.max(...vals);
                const range = max - min || 1;
                const h = Math.max(4, ((t.value - min) / range) * 100);
                return (
                  <div key={i} className="flex flex-col items-center shrink-0 group">
                    <div className="w-7 rounded-t transition-all" style={{ height: `${h}%`, background: color, opacity: 0.8 + 0.2 * (i / terms.length) }} />
                    <span className="text-[9px] font-mono text-[#64748b] mt-0.5">{i}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-[#64748b] block mb-1">{label}</label>
      <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-[#7c3aed]" />
    </div>
  );
}
