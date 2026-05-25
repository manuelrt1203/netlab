"use client";
import { useRef, useEffect, useState } from "react";
import * as math from "mathjs";

// ── Normalisation ─────────────────────────────────────────────────────────────

function normalizeExpr(expr: string): string {
  return expr
    .toLowerCase()
    .replace(/([0-9])\s*([a-df-wyz(])/g, "$1*$2") // 2x→2*x, skip e (euler)
    .trim();
}

function evalAt(expr: string, xVal: number): number {
  try {
    return math.evaluate(normalizeExpr(expr), { x: xVal, e: Math.E, pi: Math.PI }) as number;
  } catch { return NaN; }
}

function symbolicDerivative(expr: string): string {
  try { return math.derivative(normalizeExpr(expr), "x").toString(); }
  catch { return ""; }
}

// ── Racines / zéros ──────────────────────────────────────────────────────────

function findZeros(expr: string, a: number, b: number, N = 800): number[] {
  if (!isFinite(a) || !isFinite(b) || a >= b) return [];
  const h = (b - a) / N;
  const zeros: number[] = [];
  let prev = evalAt(expr, a);

  for (let i = 1; i <= N; i++) {
    const x = a + i * h;
    const curr = evalAt(expr, x);
    if (Math.abs(curr) < 1e-10 && isFinite(curr)) {
      if (zeros.every(z => Math.abs(z - x) > 1e-5)) zeros.push(x);
    } else if (isFinite(prev) && isFinite(curr) && prev * curr < 0) {
      let lo = x - h, hi = x;
      for (let j = 0; j < 60; j++) {
        const m = (lo + hi) / 2;
        const fm = evalAt(expr, m);
        if (Math.abs(fm) < 1e-12) { lo = hi = m; break; }
        if (evalAt(expr, lo) * fm < 0) hi = m; else lo = m;
      }
      const z = (lo + hi) / 2;
      if (zeros.every(r => Math.abs(r - z) > 1e-5)) zeros.push(z);
    }
    prev = curr;
  }
  return zeros.sort((a, b) => a - b);
}

// ── Limites numériques ────────────────────────────────────────────────────────

function fmtVal(v: number, d = 4): string {
  if (!isFinite(v)) return v > 0 ? "+∞" : "−∞";
  if (isNaN(v)) return "?";
  return parseFloat(v.toFixed(d)).toString();
}

function numLimit(expr: string, xVal: number): string {
  const v = evalAt(expr, xVal);
  if (!isFinite(v)) return v > 0 ? "+∞" : "−∞";
  if (isNaN(v)) return "indéfinie";
  return fmtVal(v);
}

// ── Domaine de définition ─────────────────────────────────────────────────────

function detectDomain(expr: string): string {
  const n = normalizeExpr(expr);
  const constraints: string[] = [];
  if (/log\(|ln\(/.test(n)) constraints.push("argument du logarithme > 0");
  if (/sqrt\(/.test(n)) constraints.push("argument de √ ≥ 0");
  if (/asin\(|acos\(/.test(n)) constraints.push("argument ∈ [−1, 1]");
  if (/[^*e]\//.test(n)) constraints.push("dénominateur ≠ 0");
  return constraints.length ? "ℝ sous contraintes : " + constraints.join(" ; ") : "ℝ";
}

// ── Primitive (formes simples) ────────────────────────────────────────────────

function findPrimitive(expr: string): string {
  const n = normalizeExpr(expr).replace(/\s/g, "");
  const simple: Record<string, string> = {
    "x":          "x² / 2 + C",
    "1":          "x + C",
    "sin(x)":     "−cos(x) + C",
    "cos(x)":     "sin(x) + C",
    "exp(x)":     "exp(x) + C",
    "e^x":        "exp(x) + C",
    "1/x":        "ln|x| + C",
    "tan(x)":     "−ln|cos(x)| + C",
    "sqrt(x)":    "(2/3)·x^(3/2) + C",
    "1/(1+x^2)":  "arctan(x) + C",
  };
  if (simple[n]) return simple[n];

  const pow = n.match(/^x\^([\d.]+)$/);
  if (pow) { const p = parseFloat(pow[1]); return `x^${p + 1} / ${p + 1} + C`; }

  const cpow = n.match(/^([\d.]+)\*x\^([\d.]+)$/);
  if (cpow) { const c = cpow[1], p = parseFloat(cpow[2]); return `${c}·x^${p + 1} / ${p + 1} + C`; }

  const cst = n.match(/^([\d.]+)$/);
  if (cst) return `${cst[1]}·x + C`;

  return "Forme complexe → utiliser l'onglet Intégrales";
}

// ── Tableau de variation ──────────────────────────────────────────────────────

type VarTableData = {
  boundaries:      number[];
  fAtBoundaries:   number[];
  intervalSigns:   ("+" | "-" | "?")[];
  criticalIndices: number[];
};

function buildVariationTable(expr: string, derivExpr: string, a: number, b: number): VarTableData {
  const crits = derivExpr
    ? findZeros(derivExpr, a, b).filter(x => x > a + 1e-6 && x < b - 1e-6)
    : [];
  const boundaries = [a, ...crits, b];
  const fAtBoundaries = boundaries.map(x => evalAt(expr, x));

  const intervalSigns: ("+" | "-" | "?")[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const mid = (boundaries[i] + boundaries[i + 1]) / 2;
    const fp = evalAt(derivExpr, mid);
    intervalSigns.push(isFinite(fp) && !isNaN(fp) ? (fp >= 0 ? "+" : "-") : "?");
  }

  return {
    boundaries,
    fAtBoundaries,
    intervalSigns,
    criticalIndices: crits.map((_, i) => i + 1),
  };
}

// ── Étapes de dérivation ──────────────────────────────────────────────────────

function derivSteps(expr: string): string[] {
  const steps: string[] = [];
  try {
    const norm = normalizeExpr(expr);
    const node = math.parse(norm);
    steps.push(`f(x) = ${node.toString()}`);
    const d = math.derivative(norm, "x");
    const simp = math.simplify(d);
    const s = norm;
    steps.push("Règles appliquées :");
    if (/\^/.test(s))                    steps.push("  · Puissance : d/dx[xⁿ] = n·xⁿ⁻¹");
    if (/sin|cos|tan/.test(s))           steps.push("  · d/dx[sin(x)] = cos(x)  |  d/dx[cos(x)] = −sin(x)");
    if (/exp|e\*\*/.test(s))             steps.push("  · d/dx[eˣ] = eˣ");
    if (/log|ln/.test(s))                steps.push("  · d/dx[ln(x)] = 1/x");
    if (/sqrt/.test(s))                  steps.push("  · d/dx[√x] = 1/(2√x)");
    if (/[+\-]/.test(s))                 steps.push("  · Somme : (f+g)' = f' + g'");
    if (/\*/.test(s) && !/\*\*/.test(s)) steps.push("  · Produit : (f·g)' = f'·g + f·g'");
    if (/\//.test(s))                    steps.push("  · Quotient : (f/g)' = (f'g − fg') / g²");
    steps.push(`f'(x) = ${d.toString()}`);
    if (d.toString() !== simp.toString()) steps.push(`      = ${simp.toString()}  (simplifiée)`);
  } catch (e) {
    steps.push(`Erreur : ${e}`);
  }
  return steps;
}

// ── Type résultat analyse ─────────────────────────────────────────────────────

type Analysis = {
  expr:         string;
  domain:       string;
  limMinus:     string;
  limPlus:      string;
  derivative:   string;
  dSteps:       string[];
  roots:        number[];
  varTable:     VarTableData;
  primitive:    string;
  evalX0:       { fx: number; fpx: number };
};

function runAnalysis(expr: string, a: number, b: number, x0: number): Analysis {
  const deriv = symbolicDerivative(expr);
  return {
    expr,
    domain:     detectDomain(expr),
    limMinus:   numLimit(expr, -1e14),
    limPlus:    numLimit(expr, 1e14),
    derivative: deriv,
    dSteps:     derivSteps(expr),
    roots:      findZeros(expr, a, b),
    varTable:   buildVariationTable(expr, deriv, a, b),
    primitive:  findPrimitive(expr),
    evalX0:     { fx: evalAt(expr, x0), fpx: evalAt(deriv, x0) },
  };
}

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESETS = [
  { label:"x²−1",      expr:"x^2 - 1",      a:-3,          b:3           },
  { label:"sin(x)",    expr:"sin(x)",         a:-2*Math.PI,  b:2*Math.PI  },
  { label:"x³−x",     expr:"x^3 - x",        a:-2,          b:2           },
  { label:"e^x−2",    expr:"exp(x) - 2",     a:-1,          b:3           },
  { label:"ln(x+1)",  expr:"log(x+1)",       a:-0.5,        b:5           },
  { label:"x·sin(x)", expr:"x * sin(x)",     a:-6,          b:6           },
];

// ── Composant principal ───────────────────────────────────────────────────────

export default function FonctionsTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [expr, setExpr]             = useState("x^2 - 1");
  const [studyA, setStudyA]         = useState(-3);
  const [studyB, setStudyB]         = useState(3);
  const [xMin, setXMin]             = useState(-4);
  const [xMax, setXMax]             = useState(4);
  const [x0, setX0]                 = useState(1);
  const [showDeriv, setShowDeriv]   = useState(true);
  const [showTangent, setShowTangent] = useState(true);
  const [analysis, setAnalysis]     = useState<Analysis | null>(null);

  const dExpr = analysis?.derivative ?? symbolicDerivative(expr);

  const draw = (an: Analysis | null = analysis) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height, PAD = 42;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f1117"; ctx.fillRect(0, 0, W, H);

    const de = dExpr;
    const N = 500, step = (xMax - xMin) / N;
    const ys: number[] = [], yds: number[] = [];
    for (let i = 0; i <= N; i++) {
      ys.push(evalAt(expr, xMin + i * step));
      yds.push(evalAt(de, xMin + i * step));
    }
    const cap = (v: number) => isFinite(v) && Math.abs(v) < 5e5;
    const validY = [...ys, ...(showDeriv ? yds : [])].filter(cap);
    if (!validY.length) return;
    const yLo = Math.min(0, ...validY) * 1.15;
    const yHi = (Math.max(0, ...validY) * 1.15) || 1;
    const tX = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (W - 2 * PAD);
    const tY = (y: number) => H - PAD - ((y - yLo) / (yHi - yLo)) * (H - 2 * PAD);

    // Grid
    ctx.strokeStyle = "#1a1d27"; ctx.lineWidth = 0.5;
    for (let xi = Math.ceil(xMin); xi <= Math.floor(xMax); xi++) {
      ctx.beginPath(); ctx.moveTo(tX(xi), PAD); ctx.lineTo(tX(xi), H - PAD); ctx.stroke();
    }
    for (let yi = Math.ceil(yLo); yi <= Math.floor(yHi); yi++) {
      const py = tY(yi); if (!isFinite(py)) continue;
      ctx.beginPath(); ctx.moveTo(PAD, py); ctx.lineTo(W - PAD, py); ctx.stroke();
    }

    // Study domain highlight
    const sa = Math.max(studyA, xMin), sb = Math.min(studyB, xMax);
    if (sa < sb) {
      ctx.fillStyle = "rgba(0,212,255,0.04)";
      ctx.fillRect(tX(sa), PAD, tX(sb) - tX(sa), H - 2 * PAD);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = "rgba(0,212,255,0.2)"; ctx.lineWidth = 1;
      [sa, sb].forEach(xi => {
        ctx.beginPath(); ctx.moveTo(tX(xi), PAD); ctx.lineTo(tX(xi), H - PAD); ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    // Axes
    ctx.strokeStyle = "#2a2d3a"; ctx.lineWidth = 1;
    const ax0 = tY(0); if (isFinite(ax0)) { ctx.beginPath(); ctx.moveTo(PAD, ax0); ctx.lineTo(W - PAD, ax0); ctx.stroke(); }
    const ay0 = tX(0); if (isFinite(ay0)) { ctx.beginPath(); ctx.moveTo(ay0, PAD); ctx.lineTo(ay0, H - PAD); ctx.stroke(); }

    // Labels axes
    ctx.fillStyle = "#64748b"; ctx.font = "9px monospace"; ctx.textAlign = "center";
    for (let xi = Math.ceil(xMin); xi <= Math.floor(xMax); xi++) {
      if (xi !== 0) ctx.fillText(String(xi), tX(xi), H - PAD + 13);
    }
    ctx.textAlign = "right";
    for (let yi = Math.floor(yLo); yi <= Math.ceil(yHi); yi++) {
      const py = tY(yi);
      if (yi !== 0 && isFinite(py) && py > PAD && py < H - PAD)
        ctx.fillText(String(yi), PAD - 4, py + 3);
    }

    // f'(x) dashed
    if (showDeriv) {
      ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.beginPath();
      yds.forEach((y, i) => {
        const px = tX(xMin + i * step), py = tY(y);
        if (!cap(py)) { ctx.moveTo(px, py); return; }
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      });
      ctx.stroke(); ctx.setLineDash([]);
    }

    // f(x) solid
    ctx.strokeStyle = "#00d4ff"; ctx.lineWidth = 2;
    ctx.shadowColor = "#00d4ff"; ctx.shadowBlur = 6;
    ctx.beginPath();
    ys.forEach((y, i) => {
      const px = tX(xMin + i * step), py = tY(y);
      if (!cap(py)) { ctx.moveTo(px, py); return; }
      i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    });
    ctx.stroke(); ctx.shadowBlur = 0;

    // Roots
    if (an?.roots.length) {
      ctx.setLineDash([3, 3]); ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 1;
      an.roots.forEach(r => {
        if (r < xMin || r > xMax) return;
        ctx.beginPath(); ctx.moveTo(tX(r), PAD); ctx.lineTo(tX(r), H - PAD); ctx.stroke();
        const py0 = tY(0); if (isFinite(py0)) {
          ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(tX(r), py0, 4, 0, Math.PI * 2); ctx.fill();
        }
      });
      ctx.setLineDash([]);
    }

    // Extrema
    if (an?.varTable.criticalIndices.length) {
      an.varTable.criticalIndices.forEach(ci => {
        const xc = an.varTable.boundaries[ci];
        const fc = an.varTable.fAtBoundaries[ci];
        if (!isFinite(fc) || xc < xMin || xc > xMax) return;
        ctx.fillStyle = "#ec4899"; ctx.shadowColor = "#ec4899"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(tX(xc), tY(fc), 5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });
    }

    // Tangent at x0
    if (showTangent) {
      const fx0 = evalAt(expr, x0), fpx0 = evalAt(de, x0);
      if (isFinite(fx0) && isFinite(fpx0)) {
        const tan = (x: number) => fx0 + fpx0 * (x - x0);
        ctx.strokeStyle = "#ec4899"; ctx.lineWidth = 1.5; ctx.setLineDash([6, 3]);
        ctx.beginPath();
        ctx.moveTo(tX(xMin), tY(tan(xMin))); ctx.lineTo(tX(xMax), tY(tan(xMax)));
        ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = "#ec4899"; ctx.shadowColor = "#ec4899"; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(tX(x0), tY(fx0), 5, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Légende
    ctx.textAlign = "left"; ctx.font = "10px monospace";
    ctx.fillStyle = "#00d4ff"; ctx.fillText("─ f(x)", W - PAD - 58, PAD + 14);
    if (showDeriv) { ctx.fillStyle = "#f59e0b"; ctx.fillText("-- f'(x)", W - PAD - 64, PAD + 28); }
    if (showTangent) { ctx.fillStyle = "#ec4899"; ctx.fillText("-- tangente", W - PAD - 78, PAD + 42); }
    if (an?.roots.length) { ctx.fillStyle = "#22c55e"; ctx.fillText("| racines", W - PAD - 68, PAD + 56); }
  };

  const doAnalyze = () => {
    const an = runAnalysis(expr, studyA, studyB, x0);
    setAnalysis(an);
    requestAnimationFrame(() => draw(an));
  };

  // Auto-analyse dès le chargement et à chaque changement de paramètre
  useEffect(() => {
    const t = setTimeout(() => {
      const an = runAnalysis(expr, studyA, studyB, x0);
      setAnalysis(an);
      requestAnimationFrame(() => draw(an));
    }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expr, studyA, studyB, x0]);

  // Redessiner si fenêtre ou options visuelles changent
  useEffect(() => {
    requestAnimationFrame(() => draw(analysis));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xMin, xMax, showDeriv, showTangent]);

  return (
    <div className="space-y-4">

      {/* ── Saisie ─────────────────────────────────────────────── */}
      <div className="glass rounded-xl p-5">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
          <div>
            <label className="text-xs text-[#64748b] block mb-1">f(x) =</label>
            <input value={expr} onChange={e => { setExpr(e.target.value); setAnalysis(null); }}
              className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-[#00d4ff]" />
          </div>
          <NF label="Étude : a" value={studyA} onChange={v => { setStudyA(v); setAnalysis(null); }} />
          <NF label="Étude : b" value={studyB} onChange={v => { setStudyB(v); setAnalysis(null); }} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <NF label="Fenêtre : x min" value={xMin} onChange={setXMin} />
          <NF label="Fenêtre : x max" value={xMax} onChange={setXMax} />
          <NF label="x₀ (tangente)" value={x0}   onChange={setX0}   />
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => {
              setExpr(p.expr); setStudyA(p.a); setStudyB(p.b);
              setXMin(p.a - 1); setXMax(p.b + 1); setAnalysis(null);
            }}
              className="px-2.5 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded font-mono hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-all">
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex gap-4 items-center flex-wrap">
          <label className="flex items-center gap-1.5 text-xs text-[#64748b] cursor-pointer">
            <input type="checkbox" checked={showDeriv} onChange={e => setShowDeriv(e.target.checked)} className="accent-[#f59e0b]" />
            Afficher f&apos;(x)
          </label>
          <label className="flex items-center gap-1.5 text-xs text-[#64748b] cursor-pointer">
            <input type="checkbox" checked={showTangent} onChange={e => setShowTangent(e.target.checked)} className="accent-[#ec4899]" />
            Tangente en x₀
          </label>
          <button onClick={doAnalyze}
            className="ml-auto px-4 py-1.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg hover:bg-[#00d4ff]/20 transition-all text-xs font-medium">
            ↺ Recalculer
          </button>
        </div>
      </div>

      {/* ── Graphe ─────────────────────────────────────────────── */}
      <canvas ref={canvasRef} width={600} height={320} className="glass rounded-xl w-full" />

      {/* ── Résultats ──────────────────────────────────────────── */}
      {analysis && (
        <div className="space-y-4">

          {/* Domaine & Limites */}
          <div className="glass rounded-xl p-5">
            <SectionTitle color="#00d4ff">Domaine & Limites</SectionTitle>
            <div className="space-y-2 text-sm font-mono">
              <Row label="𝒟f">{analysis.domain}</Row>
              <Row label="lim f(x), x → −∞"><span className="text-[#a78bfa]">{analysis.limMinus}</span></Row>
              <Row label="lim f(x), x → +∞"><span className="text-[#a78bfa]">{analysis.limPlus}</span></Row>
            </div>
          </div>

          {/* Dérivée */}
          <div className="glass rounded-xl p-5">
            <SectionTitle color="#f59e0b">Dérivée f&apos;(x)</SectionTitle>
            <div className="space-y-1.5">
              {analysis.dSteps.map((s, i) => (
                <div key={i} className={`text-sm font-mono leading-5
                  ${s.startsWith("f'") ? "text-[#f59e0b] font-bold" :
                    s.startsWith("  =") ? "text-[#22c55e]" :
                    s.startsWith("  ·") ? "text-[#94a3b8]" : "text-[#e2e8f0]"}`}>
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Tableau de variation */}
          <div className="glass rounded-xl p-5 overflow-x-auto">
            <SectionTitle color="#22c55e">
              Tableau de variation sur [{fmtVal(studyA)}, {fmtVal(studyB)}]
            </SectionTitle>
            <VariationTable data={analysis.varTable} />
          </div>

          {/* Racines */}
          <div className="glass rounded-xl p-5">
            <SectionTitle color="#22c55e">
              Racines de f sur [{fmtVal(studyA)}, {fmtVal(studyB)}]
            </SectionTitle>
            {analysis.roots.length === 0
              ? <p className="text-sm text-[#64748b] font-mono">Aucune racine détectée dans l&apos;intervalle.</p>
              : (
                <div className="space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    {analysis.roots.map((r, i) => (
                      <span key={i} className="px-3 py-1 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded font-mono text-sm text-[#22c55e]">
                        x{analysis.roots.length > 1 ? `${i+1}` : ""} ≈ {r.toFixed(6)}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#64748b]">Calculées par méthode de la bissection (précision 10⁻¹²)</p>
                </div>
              )
            }
          </div>

          {/* Évaluation + Primitive */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-4">
              <SectionTitle color="#ec4899">Évaluation en x₀ = {x0}</SectionTitle>
              <div className="space-y-2 text-sm font-mono">
                <div>
                  <span className="text-[#64748b]">f({x0}) = </span>
                  <span className="text-[#00d4ff] font-bold">
                    {isFinite(analysis.evalX0.fx) ? analysis.evalX0.fx.toFixed(6) : "indéfini"}
                  </span>
                </div>
                <div>
                  <span className="text-[#64748b]">f&apos;({x0}) = </span>
                  <span className="text-[#f59e0b] font-bold">
                    {isFinite(analysis.evalX0.fpx) ? analysis.evalX0.fpx.toFixed(6) : "indéfini"}
                  </span>
                </div>
                {isFinite(analysis.evalX0.fx) && isFinite(analysis.evalX0.fpx) && (
                  <div className="text-[#64748b] text-xs pt-1 leading-4">
                    Tangente : y = {analysis.evalX0.fx.toFixed(4)} + {analysis.evalX0.fpx.toFixed(4)}·(x − {x0})
                  </div>
                )}
              </div>
            </div>

            <div className="glass rounded-xl p-4">
              <SectionTitle color="#a78bfa">Primitive F(x)</SectionTitle>
              <p className="text-sm font-mono text-[#a78bfa] leading-6">{analysis.primitive}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tableau de variation ──────────────────────────────────────────────────────

function VariationTable({ data }: { data: VarTableData }) {
  const { boundaries, fAtBoundaries, intervalSigns, criticalIndices } = data;

  // colonnes : boundary, interval, boundary, interval, ..., boundary
  type Col = { type: "b"; idx: number } | { type: "i"; idx: number };
  const cols: Col[] = [];
  for (let i = 0; i < boundaries.length; i++) {
    cols.push({ type: "b", idx: i });
    if (i < boundaries.length - 1) cols.push({ type: "i", idx: i });
  }
  const isCrit = (idx: number) => criticalIndices.includes(idx);

  const cellBase = "border border-[#2a2d3a] text-center";
  const tdB = "px-3 py-2";
  const tdI = "px-4 py-2";

  return (
    <div>
      <table className="border-collapse text-xs font-mono w-full" style={{ minWidth: cols.length * 55 }}>
        <tbody>
          {/* x */}
          <tr>
            <td className={`${cellBase} ${tdB} bg-[#0f1117] text-[#64748b] font-bold`}>x</td>
            {cols.map((c, i) => c.type === "b"
              ? <td key={i} className={`${cellBase} ${tdB} ${isCrit(c.idx) ? "text-[#ec4899] font-bold" : "text-[#94a3b8]"}`}>
                  {fmtVal(boundaries[c.idx], 3)}
                </td>
              : <td key={i} className={`${cellBase} ${tdI} text-[#2a2d3a]`}>···</td>
            )}
          </tr>
          {/* f'(x) */}
          <tr>
            <td className={`${cellBase} ${tdB} bg-[#0f1117] text-[#f59e0b] font-bold whitespace-nowrap`}>f&apos;(x)</td>
            {cols.map((c, i) => c.type === "b"
              ? <td key={i} className={`${cellBase} ${tdB} text-[#ec4899] font-bold`}>
                  {isCrit(c.idx) ? "0" : ""}
                </td>
              : <td key={i} className={`${cellBase} ${tdI} font-bold text-sm
                  ${intervalSigns[c.idx] === "+" ? "text-[#22c55e]" : "text-red-400"}`}>
                  {intervalSigns[c.idx]}
                </td>
            )}
          </tr>
          {/* f(x) */}
          <tr>
            <td className={`${cellBase} ${tdB} bg-[#0f1117] text-[#00d4ff] font-bold`}>f(x)</td>
            {cols.map((c, i) => {
              if (c.type === "b") {
                const fy = fAtBoundaries[c.idx];
                return (
                  <td key={i} className={`${cellBase} ${tdB} font-bold
                    ${isCrit(c.idx) ? "text-[#ec4899]" : "text-[#94a3b8]"}`}>
                    {isFinite(fy) ? fmtVal(fy, 3) : fy > 0 ? "+∞" : "−∞"}
                  </td>
                );
              } else {
                return (
                  <td key={i} className={`${cellBase} ${tdI} text-lg font-bold
                    ${intervalSigns[c.idx] === "+" ? "text-[#22c55e]" : "text-red-400"}`}>
                    {intervalSigns[c.idx] === "+" ? "↗" : "↘"}
                  </td>
                );
              }
            })}
          </tr>
        </tbody>
      </table>
      <p className="text-[10px] text-[#64748b] mt-2">
        Points en rose = points critiques (f&apos; = 0, extrema locaux)
      </p>
    </div>
  );
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

function SectionTitle({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color }}>
      {children}
    </h3>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 flex-wrap">
      <span className="text-[#64748b] shrink-0">{label} =</span>
      <span className="text-[#e2e8f0]">{children}</span>
    </div>
  );
}

function NF({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="text-xs text-[#64748b] block mb-1">{label}</label>
      <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-[#00d4ff]" />
    </div>
  );
}
