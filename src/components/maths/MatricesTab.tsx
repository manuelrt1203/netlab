"use client";
import { useState } from "react";

type Matrix = number[][];
type Op = "det" | "inverse" | "transpose" | "multiply" | "add" | "subtract" | "rank";
interface Step { desc: string; matrix?: Matrix; matrix2?: Matrix; highlight?: [number, number][]; }

/* ── Utilitaires ────────────────────────────────────────────────────── */
function cloneM(m: Matrix): Matrix { return m.map(r => [...r]); }
function fmt(n: number): string {
  const r = Math.round(n * 10000) / 10000;
  return Number.isInteger(r) ? String(r) : r.toFixed(4).replace(/\.?0+$/, "");
}

/* ── Déterminant (expansion de Laplace, récursif) ───────────────────── */
function detWithSteps(m: Matrix, steps: Step[], depth = 0): number {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) {
    const d = m[0][0] * m[1][1] - m[0][1] * m[1][0];
    if (depth === 0) {
      steps.push({ desc: `det = a·d − b·c = ${fmt(m[0][0])}·${fmt(m[1][1])} − ${fmt(m[0][1])}·${fmt(m[1][0])} = **${fmt(d)}**`, matrix: cloneM(m) });
    }
    return d;
  }
  let det = 0;
  const termLines: string[] = [];
  for (let j = 0; j < n; j++) {
    const sign = j % 2 === 0 ? 1 : -1;
    const minor = m.slice(1).map(row => row.filter((_, k) => k !== j));
    const minorDet = detWithSteps(minor, steps, depth + 1);
    const contrib = sign * m[0][j] * minorDet;
    det += contrib;
    const signStr = sign === 1 ? "+" : "−";
    termLines.push(`${signStr} ${fmt(m[0][j])} × det(M${j + 1}) = ${signStr} ${fmt(m[0][j])} × ${fmt(minorDet)} = ${fmt(contrib)}`);
  }
  if (depth === 0) {
    steps.push({ desc: `Développement selon la 1ère ligne :`, matrix: cloneM(m) });
    termLines.forEach(l => steps.push({ desc: `  ${l}` }));
    steps.push({ desc: `**det = ${fmt(det)}**` });
  } else if (depth === 1) {
    steps.push({ desc: `  Sous-déterminant (${n}×${n}) = ${fmt(det)}`, matrix: cloneM(m) });
  }
  return det;
}

/* ── Gauss-Jordan (inverse + rang) ─────────────────────────────────── */
function gaussJordan(m: Matrix, augmented: Matrix, steps: Step[]): Matrix | null {
  const n = m.length;
  const A = m.map((r, i) => [...r, ...augmented[i]]);
  const W = m[0].length + augmented[0].length;

  for (let col = 0; col < n; col++) {
    // Pivot search
    let maxRow = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > Math.abs(A[maxRow][col])) maxRow = r;
    }
    if (maxRow !== col) {
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
      steps.push({ desc: `Échange L${col + 1} ↔ L${maxRow + 1}`, matrix: A.map(r => r.slice(0, n)), matrix2: A.map(r => r.slice(n)) });
    }
    if (Math.abs(A[col][col]) < 1e-10) return null; // singular

    // Normalize pivot row
    const pivot = A[col][col];
    if (Math.abs(pivot - 1) > 1e-10) {
      for (let k = 0; k < W; k++) A[col][k] /= pivot;
      steps.push({ desc: `L${col + 1} ÷ ${fmt(pivot)}`, matrix: A.map(r => r.slice(0, n)), matrix2: A.map(r => r.slice(n)), highlight: [[col, col]] });
    }

    // Eliminate column
    for (let r = 0; r < n; r++) {
      if (r === col || Math.abs(A[r][col]) < 1e-10) continue;
      const factor = A[r][col];
      for (let k = 0; k < W; k++) A[r][k] -= factor * A[col][k];
      steps.push({ desc: `L${r + 1} ← L${r + 1} − ${fmt(factor)}·L${col + 1}`, matrix: A.map(r2 => r2.slice(0, n)), matrix2: A.map(r2 => r2.slice(n)) });
    }
  }
  return A.map(r => r.slice(n));
}

function rowEchelon(m: Matrix, steps: Step[]): number {
  const A = cloneM(m);
  const n = A.length, nc = A[0].length;
  let rank = 0, pivotRow = 0;
  for (let col = 0; col < nc && pivotRow < n; col++) {
    let maxRow = pivotRow;
    for (let r = pivotRow + 1; r < n; r++) if (Math.abs(A[r][col]) > Math.abs(A[maxRow][col])) maxRow = r;
    if (Math.abs(A[maxRow][col]) < 1e-10) continue;
    if (maxRow !== pivotRow) { [A[pivotRow], A[maxRow]] = [A[maxRow], A[pivotRow]]; steps.push({ desc: `Échange L${pivotRow+1} ↔ L${maxRow+1}`, matrix: cloneM(A) }); }
    const piv = A[pivotRow][col];
    for (let k = 0; k < nc; k++) A[pivotRow][k] /= piv;
    steps.push({ desc: `L${pivotRow+1} ÷ ${fmt(piv)}`, matrix: cloneM(A) });
    for (let r = pivotRow + 1; r < n; r++) {
      if (Math.abs(A[r][col]) < 1e-10) continue;
      const f = A[r][col];
      for (let k = 0; k < nc; k++) A[r][k] -= f * A[pivotRow][k];
      steps.push({ desc: `L${r+1} ← L${r+1} − ${fmt(f)}·L${pivotRow+1}`, matrix: cloneM(A) });
    }
    rank++; pivotRow++;
  }
  return rank;
}

function multiplyM(A: Matrix, B: Matrix, steps: Step[]): Matrix | null {
  if (A[0].length !== B.length) return null;
  const R: Matrix = Array(A.length).fill(0).map(() => Array(B[0].length).fill(0));
  steps.push({ desc: `C[i][j] = Σₖ A[i][k] · B[k][j]` });
  for (let i = 0; i < A.length; i++) {
    for (let j = 0; j < B[0].length; j++) {
      const terms = A[i].map((a, k) => `${fmt(a)}·${fmt(B[k][j])}`).join(" + ");
      R[i][j] = A[i].reduce((s, a, k) => s + a * B[k][j], 0);
      steps.push({ desc: `C[${i+1}][${j+1}] = ${terms} = ${fmt(R[i][j])}` });
    }
  }
  return R;
}

/* ── Composant matrice ─────────────────────────────────────────────── */
function MatrixInput({ M, setM, label, color }: { M: Matrix; setM: (m: Matrix) => void; label: string; color: string }) {
  return (
    <div>
      <p className="text-xs mb-2" style={{ color }}>{label}</p>
      <div className="inline-block">
        {M.map((row, i) => (
          <div key={i} className="flex gap-1 mb-1">
            {row.map((v, j) => (
              <input key={j} type="number" value={v}
                onChange={e => { const m = cloneM(M); m[i][j] = parseFloat(e.target.value) || 0; setM(m); }}
                className="w-12 h-9 text-center bg-[#0f1117] border border-[#2a2d3a] rounded text-sm font-mono outline-none focus:border-[#7c3aed]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatrixDisplay({ M, label, color, highlight }: { M: Matrix; label?: string; color?: string; highlight?: [number,number][] }) {
  return (
    <div className="inline-block">
      {label && <p className="text-xs mb-1" style={{ color: color || "#64748b" }}>{label}</p>}
      <div className="border-l-2 border-r-2 border-[#64748b] px-2 py-1">
        {M.map((row, i) => (
          <div key={i} className="flex gap-2">
            {row.map((v, j) => {
              const hi = highlight?.some(([r, c]) => r === i && c === j);
              return (
                <span key={j} className={`w-14 text-center text-xs font-mono py-0.5 ${hi ? "text-[#f59e0b] font-bold" : "text-[#e2e8f0]"}`}>
                  {fmt(v)}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function makeEmpty(n: number): Matrix { return Array(n).fill(0).map(() => Array(n).fill(0)); }
function makeIdentity(n: number): Matrix { return Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0)); }

const PRESETS: Record<string, Matrix> = {
  "2×2 simple": [[3, 2], [1, 4]],
  "3×3 det": [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
  "3×3 inv": [[2, 1, 0], [1, 3, 1], [0, 1, 2]],
  "Rotation 90°": [[0, -1], [1, 0]],
};

export default function MatricesTab() {
  const [size, setSize] = useState(3);
  const [A, setA] = useState<Matrix>([[2,1,0],[1,3,1],[0,1,2]]);
  const [B, setB] = useState<Matrix>([[1,0,0],[0,1,0],[0,0,1]]);
  const [op, setOp] = useState<Op>("inverse");
  const [steps, setSteps] = useState<Step[]>([]);
  const [result, setResult] = useState<Matrix | number | null>(null);
  const [error, setError] = useState("");

  const resizeMatrix = (n: number) => {
    const resize = (m: Matrix) => {
      const nm = makeEmpty(n);
      for (let i = 0; i < Math.min(n, m.length); i++)
        for (let j = 0; j < Math.min(n, m[0]?.length || 0); j++) nm[i][j] = m[i][j];
      return nm;
    };
    setSize(n); setA(resize(A)); setB(resize(B)); setSteps([]); setResult(null);
  };

  const applyPreset = (m: Matrix) => {
    const n = m.length;
    setSize(n); setA(m.map(r=>[...r])); setB(makeIdentity(n)); setSteps([]); setResult(null);
  };

  const compute = () => {
    setError(""); setSteps([]); setResult(null);
    const s: Step[] = [];
    try {
      if (op === "det") {
        const d = detWithSteps(A, s);
        setSteps(s); setResult(d);
      } else if (op === "inverse") {
        s.push({ desc: "Méthode de Gauss-Jordan : [A | I] → [I | A⁻¹]", matrix: cloneM(A), matrix2: makeIdentity(size) });
        const inv = gaussJordan(cloneM(A), makeIdentity(size), s);
        if (!inv) { setError("La matrice est singulière (det = 0) — pas d'inverse."); return; }
        s.push({ desc: "**Matrice inverse obtenue :**", matrix: makeIdentity(size), matrix2: inv });
        setSteps(s); setResult(inv);
      } else if (op === "transpose") {
        const T = A[0].map((_, j) => A.map(r => r[j]));
        s.push({ desc: "T[i][j] = A[j][i]  (lignes et colonnes échangées)", matrix: cloneM(A) });
        s.push({ desc: "**Transposée :**", matrix: T });
        setSteps(s); setResult(T);
      } else if (op === "multiply") {
        const R = multiplyM(A, B, s);
        if (!R) { setError(`Dimensions incompatibles : A est ${A.length}×${A[0].length}, B est ${B.length}×${B[0].length}`); return; }
        s.push({ desc: "**Résultat A × B :**", matrix: R });
        setSteps(s); setResult(R);
      } else if (op === "add" || op === "subtract") {
        const sign = op === "add" ? 1 : -1;
        const R = A.map((r, i) => r.map((v, j) => v + sign * B[i][j]));
        const opStr = op === "add" ? "+" : "−";
        s.push({ desc: `C[i][j] = A[i][j] ${opStr} B[i][j]  (terme à terme)` });
        A.forEach((r, i) => r.forEach((v, j) => s.push({ desc: `  C[${i+1}][${j+1}] = ${fmt(v)} ${opStr} ${fmt(B[i][j])} = ${fmt(R[i][j])}` })));
        s.push({ desc: `**Résultat :**`, matrix: R });
        setSteps(s); setResult(R);
      } else if (op === "rank") {
        s.push({ desc: "Réduction par échelonnage (Gauss) :", matrix: cloneM(A) });
        const rank = rowEchelon(cloneM(A), s);
        s.push({ desc: `**Rang = ${rank}** (nombre de lignes non nulles après échelonnage)` });
        setSteps(s); setResult(rank);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const OPS: { id: Op; label: string }[] = [
    { id:"det",      label:"Déterminant" },
    { id:"inverse",  label:"Inverse" },
    { id:"transpose",label:"Transposée" },
    { id:"rank",     label:"Rang" },
    { id:"multiply", label:"A × B" },
    { id:"add",      label:"A + B" },
    { id:"subtract", label:"A − B" },
  ];
  const needsB = ["multiply","add","subtract"].includes(op);

  return (
    <div className="space-y-5">
      {/* Config */}
      <div className="glass rounded-xl p-5">
        <div className="flex flex-wrap gap-4 items-start mb-4">
          <div>
            <p className="text-xs text-[#64748b] mb-2">Taille</p>
            <div className="flex gap-1.5">
              {[2,3,4,5].map(n=>(
                <button key={n} onClick={()=>resizeMatrix(n)}
                  className={`w-9 h-9 rounded-lg border text-sm font-mono transition-all ${size===n?"bg-[#7c3aed]/20 text-[#7c3aed] border-[#7c3aed]/40":"border-[#2a2d3a] text-[#64748b] hover:text-white"}`}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-[#64748b] mb-2">Présets</p>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(PRESETS).map(([label, m])=>(
                <button key={label} onClick={()=>applyPreset(m)}
                  className="px-2.5 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-[#7c3aed] hover:border-[#7c3aed]/30 transition-all">
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-8 flex-wrap items-start mb-4">
          <MatrixInput M={A} setM={setA} label="Matrice A" color="#7c3aed" />
          {needsB && <MatrixInput M={B} setM={setB} label="Matrice B" color="#00d4ff" />}
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {OPS.map(o=>(
            <button key={o.id} onClick={()=>setOp(o.id)}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${op===o.id?"bg-[#7c3aed]/20 text-[#7c3aed] border-[#7c3aed]/40":"border-[#2a2d3a] text-[#64748b] hover:text-white"}`}>
              {o.label}
            </button>
          ))}
        </div>

        <button onClick={compute}
          className="px-5 py-2 bg-[#7c3aed]/10 border border-[#7c3aed]/30 text-[#7c3aed] rounded-lg hover:bg-[#7c3aed]/20 transition-all text-sm font-medium">
          Calculer avec étapes →
        </button>
      </div>

      {error && <p className="text-red-400 text-sm px-1">{error}</p>}

      {/* Résultat rapide */}
      {result !== null && (
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-[#64748b] mb-3">Résultat</p>
          {typeof result === "number" && (
            <div className="text-2xl font-bold font-mono text-[#7c3aed]">{fmt(result)}</div>
          )}
          {Array.isArray(result) && (
            <MatrixDisplay M={result as Matrix} color="#7c3aed" />
          )}
        </div>
      )}

      {/* Étapes */}
      {steps.length > 0 && (
        <div className="glass rounded-xl p-5">
          <p className="text-xs text-[#64748b] mb-4">Étapes de calcul</p>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="border-l-2 border-[#2a2d3a] pl-4">
                <p className="text-sm text-[#94a3b8] mb-2 font-mono leading-5"
                  dangerouslySetInnerHTML={{ __html: step.desc.replace(/\*\*(.*?)\*\*/g, '<span class="text-[#7c3aed] font-bold">$1</span>') }} />
                {step.matrix && (
                  <div className="flex gap-6 flex-wrap items-start mt-2">
                    <MatrixDisplay M={step.matrix} label={step.matrix2 ? "A" : undefined} highlight={step.highlight} />
                    {step.matrix2 && (
                      <>
                        <div className="text-[#64748b] text-xl self-center">|</div>
                        <MatrixDisplay M={step.matrix2} label="Aug" color="#00d4ff" />
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
