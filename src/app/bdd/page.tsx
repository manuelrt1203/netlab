"use client";
import { useMemo, useState } from "react";

/* ══════════════════════════════════════════════════════════════════════
   Algèbre relationnelle
   ══════════════════════════════════════════════════════════════════════ */
type Row = Record<string, string | number>;

const ETUDIANT: Row[] = [
  { id: 1, nom: "Dupont", classe: "RT2A" },
  { id: 2, nom: "Martin", classe: "RT2B" },
  { id: 3, nom: "Durand", classe: "RT2A" },
  { id: 4, nom: "Petit", classe: "RT2B" },
  { id: 5, nom: "Bernard", classe: "RT2A" },
];
const NOTE: Row[] = [
  { etudiant_id: 1, matiere: "R301", note: 14 },
  { etudiant_id: 1, matiere: "R305", note: 9 },
  { etudiant_id: 2, matiere: "R301", note: 16 },
  { etudiant_id: 3, matiere: "R305", note: 11 },
  { etudiant_id: 4, matiere: "R301", note: 8 },
  { etudiant_id: 5, matiere: "R305", note: 17 },
];

function naturalJoin(a: Row[], b: Row[], onA: string, onB: string): Row[] {
  const out: Row[] = [];
  for (const ra of a) for (const rb of b) if (ra[onA] === rb[onB]) out.push({ ...ra, ...rb });
  return out;
}
const JOINED = naturalJoin(ETUDIANT, NOTE, "id", "etudiant_id");

const SOURCES: { id: string; label: string; rows: Row[]; cols: string[] }[] = [
  { id: "etudiant", label: "Étudiant", rows: ETUDIANT, cols: ["id", "nom", "classe"] },
  { id: "note", label: "Note", rows: NOTE, cols: ["etudiant_id", "matiere", "note"] },
  { id: "join", label: "Étudiant ⋈ Note (jointure naturelle)", rows: JOINED, cols: ["id", "nom", "classe", "etudiant_id", "matiere", "note"] },
];

type Op = "=" | "≠" | "<" | ">" | "≤" | "≥";

function applyOp(cell: string | number, op: Op, value: string): boolean {
  const numCell = typeof cell === "number" ? cell : parseFloat(cell as string);
  const numVal = parseFloat(value);
  const bothNum = !isNaN(numCell) && !isNaN(numVal) && value.trim() !== "";
  if (op === "=") return bothNum ? numCell === numVal : String(cell) === value;
  if (op === "≠") return bothNum ? numCell !== numVal : String(cell) !== value;
  if (!bothNum) return false;
  if (op === "<") return numCell < numVal;
  if (op === ">") return numCell > numVal;
  if (op === "≤") return numCell <= numVal;
  return numCell >= numVal;
}

function Table({ cols, rows }: { cols: string[]; rows: Row[] }) {
  if (rows.length === 0) return <p className="text-xs text-[#64748b] italic py-3">Aucune ligne — le résultat est vide.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-[#2a2d3a]">
            {cols.map((c) => <th key={c} className="text-left px-2 py-1.5 text-[#00d4ff]">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[#2a2d3a]/50">
              {cols.map((c) => <td key={c} className="px-2 py-1 text-[#e2e8f0]">{String(r[c] ?? "")}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AlgebraTab() {
  const [srcId, setSrcId] = useState("join");
  const src = SOURCES.find((s) => s.id === srcId)!;

  const [selAttr, setSelAttr] = useState(src.cols[0]);
  const [selOp, setSelOp] = useState<Op>("=");
  const [selVal, setSelVal] = useState("");
  const [selActive, setSelActive] = useState(false);

  const selected = useMemo(
    () => (selActive && selVal !== "" ? src.rows.filter((r) => applyOp(r[selAttr], selOp, selVal)) : src.rows),
    [src, selActive, selVal, selAttr, selOp]
  );

  const [projCols, setProjCols] = useState<string[]>(src.cols);
  const toggleProj = (c: string) => setProjCols((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  const projected = useMemo(() => {
    const rows = selected.map((r) => Object.fromEntries(projCols.map((c) => [c, r[c]])) as Row);
    const seen = new Set<string>();
    return rows.filter((r) => { const k = JSON.stringify(r); if (seen.has(k)) return false; seen.add(k); return true; });
  }, [selected, projCols]);

  const changeSrc = (id: string) => {
    setSrcId(id);
    const s = SOURCES.find((x) => x.id === id)!;
    setSelAttr(s.cols[0]); setSelVal(""); setSelActive(false); setProjCols(s.cols);
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-4">
        <label className="text-xs text-[#64748b] mb-2 block">Table de base</label>
        <div className="flex flex-wrap gap-2">
          {SOURCES.map((s) => (
            <button key={s.id} onClick={() => changeSrc(s.id)}
              className="px-3 py-1.5 text-xs rounded-lg border transition-all"
              style={srcId === s.id ? { borderColor: "#00d4ff", color: "#00d4ff", background: "#00d4ff14" } : { borderColor: "#2a2d3a", color: "#64748b" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <input type="checkbox" checked={selActive} onChange={(e) => setSelActive(e.target.checked)} className="accent-[#ec4899]" />
          <label className="text-sm font-bold text-[#ec4899]">σ Sélection (filtre les lignes)</label>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={selAttr} onChange={(e) => setSelAttr(e.target.value)} disabled={!selActive}
            className="bg-[#0f1117] border border-[#2a2d3a] px-2 py-1.5 rounded text-xs font-mono disabled:opacity-40">
            {src.cols.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={selOp} onChange={(e) => setSelOp(e.target.value as Op)} disabled={!selActive}
            className="bg-[#0f1117] border border-[#2a2d3a] px-2 py-1.5 rounded text-xs font-mono disabled:opacity-40">
            {(["=", "≠", "<", ">", "≤", "≥"] as Op[]).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <input value={selVal} onChange={(e) => setSelVal(e.target.value)} disabled={!selActive} placeholder="valeur"
            className="bg-[#0f1117] border border-[#2a2d3a] px-2 py-1.5 rounded text-xs font-mono disabled:opacity-40 w-24" />
        </div>
        <code className="text-[10px] text-[#64748b] mt-2 block">σ<sub>{selAttr} {selOp} {selVal || "…"}</sub>({src.label})</code>
      </div>

      <div className="glass rounded-xl p-4">
        <p className="text-sm font-bold text-[#7c3aed] mb-3">π Projection (choisit les colonnes)</p>
        <div className="flex flex-wrap gap-3">
          {src.cols.map((c) => (
            <label key={c} className="flex items-center gap-1.5 text-xs font-mono text-[#94a3b8]">
              <input type="checkbox" checked={projCols.includes(c)} onChange={() => toggleProj(c)} className="accent-[#7c3aed]" />
              {c}
            </label>
          ))}
        </div>
        <code className="text-[10px] text-[#64748b] mt-2 block">π<sub>{projCols.join(",") || "∅"}</sub>(...)</code>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="p-3 border-b border-[#2a2d3a]">
          <p className="text-sm font-bold text-[#22c55e]">Résultat ({projected.length} ligne{projected.length !== 1 ? "s" : ""})</p>
        </div>
        <div className="p-3"><Table cols={projCols} rows={projected} /></div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   Normalisation (1FN/2FN/3FN) à partir de dépendances fonctionnelles
   ══════════════════════════════════════════════════════════════════════ */
interface FD { lhs: string[]; rhs: string[]; }
interface GroupedFD { lhs: string[]; rhs: string[]; }

function parseFDs(text: string): FD[] {
  return text.split("\n").map((line) => {
    const [l, r] = line.split("->");
    if (!l || !r) return null;
    const lhs = l.split(",").map((s) => s.trim()).filter(Boolean);
    const rhs = r.split(",").map((s) => s.trim()).filter(Boolean);
    if (lhs.length === 0 || rhs.length === 0) return null;
    return { lhs, rhs } as FD;
  }).filter((x): x is FD => x !== null);
}

function attrsFromFDs(fds: FD[]): string[] {
  const set = new Set<string>();
  fds.forEach((f) => { f.lhs.forEach((a) => set.add(a)); f.rhs.forEach((a) => set.add(a)); });
  return [...set];
}

function closure(attrs: string[], fds: FD[]): string[] {
  const result = new Set(attrs);
  let changed = true;
  while (changed) {
    changed = false;
    for (const fd of fds) {
      if (fd.lhs.every((a) => result.has(a)) && !fd.rhs.every((a) => result.has(a))) {
        fd.rhs.forEach((a) => { if (!result.has(a)) { result.add(a); changed = true; } });
      }
    }
  }
  return [...result];
}

function combinations<T>(arr: T[], k: number): T[][] {
  const res: T[][] = []; const combo: T[] = [];
  const rec = (start: number) => {
    if (combo.length === k) { res.push([...combo]); return; }
    for (let i = start; i < arr.length; i++) { combo.push(arr[i]); rec(i + 1); combo.pop(); }
  };
  rec(0); return res;
}

function candidateKeys(attrs: string[], fds: FD[]): string[][] {
  const keys: string[][] = [];
  for (let size = 1; size <= attrs.length; size++) {
    for (const combo of combinations(attrs, size)) {
      if (keys.some((k) => k.every((a) => combo.includes(a)))) continue;
      if (closure(combo, fds).length === attrs.length) keys.push(combo);
    }
  }
  return keys;
}

function properSubsets(arr: string[]): string[][] {
  const res: string[][] = [];
  for (let size = 1; size < arr.length; size++) res.push(...combinations(arr, size));
  return res;
}

function groupFDs(fds: FD[]): GroupedFD[] {
  const map = new Map<string, { lhs: string[]; rhs: Set<string> }>();
  for (const fd of fds) {
    const key = [...fd.lhs].sort().join(",");
    if (!map.has(key)) map.set(key, { lhs: fd.lhs, rhs: new Set() });
    fd.rhs.forEach((a) => map.get(key)!.rhs.add(a));
  }
  return [...map.values()].map((v) => ({ lhs: v.lhs, rhs: [...v.rhs] }));
}

function sameSet(a: string[], b: string[]) { return a.length === b.length && a.every((x) => b.includes(x)); }

interface Relation { name: string; attrs: Set<string>; key: string[]; }
interface NormStep { relName: string; lhs: string[]; extracted: string[]; newRelName: string; }

function normalize(attrs: string[], fds: FD[], keys: string[][]) {
  const grouped = groupFDs(fds);
  const mainKey = keys[0] ?? attrs;
  const relations: Relation[] = [{ name: "R0", attrs: new Set(attrs), key: mainKey }];
  const usedGroups = new Set<number>();
  const steps: NormStep[] = [];

  let changed = true, guard = 0;
  while (changed && guard++ < 50) {
    changed = false;
    for (const rel of relations) {
      for (let gi = 0; gi < grouped.length; gi++) {
        if (usedGroups.has(gi)) continue;
        const g = grouped[gi];
        if (!g.lhs.every((a) => rel.attrs.has(a))) continue;
        if (sameSet(g.lhs, rel.key)) continue;
        const reach = closure(g.lhs, fds).filter((a) => rel.attrs.has(a) && !g.lhs.includes(a));
        if (reach.length === 0) continue;
        const newName = `R${relations.length}`;
        relations.push({ name: newName, attrs: new Set([...g.lhs, ...reach]), key: [...g.lhs] });
        reach.forEach((a) => rel.attrs.delete(a));
        usedGroups.add(gi);
        steps.push({ relName: rel.name, lhs: g.lhs, extracted: reach, newRelName: newName });
        changed = true;
      }
    }
  }
  return { relations, steps };
}

const DEFAULT_FD_TEXT = `NumEleve -> NomEleve, NumClasse
NumClasse -> NomClasse
NumMatiere -> NomMatiere
NumEleve, NumMatiere -> Note`;

function NormalisationTab() {
  const [fdText, setFdText] = useState(DEFAULT_FD_TEXT);
  const fds = useMemo(() => parseFDs(fdText), [fdText]);
  const attrs = useMemo(() => attrsFromFDs(fds), [fds]);
  const keys = useMemo(() => (attrs.length ? candidateKeys(attrs, fds) : []), [attrs, fds]);
  const primeAttrs = useMemo(() => new Set(keys.flat()), [keys]);

  const violations2NF = useMemo(() => {
    const out: { lhs: string[]; rhs: string[] }[] = [];
    for (const key of keys) for (const sub of properSubsets(key)) {
      const cl = closure(sub, fds).filter((a) => !sub.includes(a) && !primeAttrs.has(a));
      if (cl.length) out.push({ lhs: sub, rhs: cl });
    }
    return out;
  }, [keys, fds, primeAttrs]);

  const violations3NF = useMemo(() => {
    const out: { lhs: string[]; rhs: string[] }[] = [];
    for (const g of groupFDs(fds)) {
      if (closure(g.lhs, fds).length === attrs.length) continue; // superkey, OK
      const bad = g.rhs.filter((a) => !g.lhs.includes(a) && !primeAttrs.has(a));
      if (bad.length) out.push({ lhs: g.lhs, rhs: bad });
    }
    return out;
  }, [fds, attrs, primeAttrs]);

  const { relations, steps } = useMemo(() => (attrs.length ? normalize(attrs, fds, keys) : { relations: [], steps: [] }), [attrs, fds, keys]);

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-4">
        <label className="text-xs text-[#64748b] mb-1 block">Dépendances fonctionnelles (une par ligne : <code>A, B -&gt; C, D</code>)</label>
        <textarea value={fdText} onChange={(e) => setFdText(e.target.value)} rows={5}
          className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-xs font-mono outline-none focus:border-[#00d4ff] transition-colors" />
        <p className="text-[10px] text-[#64748b] mt-1">Les attributs sont déduits automatiquement des dépendances saisies. Exemple par défaut : gestion des notes d&apos;un lycée.</p>
      </div>

      <div className="glass rounded-xl p-4">
        <p className="text-sm font-bold text-[#00d4ff] mb-2">Analyse de la relation initiale R0({attrs.join(", ")})</p>
        <div className="text-xs text-[#94a3b8] space-y-1">
          <p><strong>Clé(s) candidate(s) :</strong> {keys.length ? keys.map((k) => `{${k.join(", ")}}`).join(" ou ") : "—"}</p>
          <p><strong>Attributs premiers (dans une clé) :</strong> {primeAttrs.size ? [...primeAttrs].join(", ") : "—"}</p>
          <p className={violations2NF.length ? "text-[#ef4444]" : "text-[#22c55e]"}>
            <strong>2FN :</strong> {violations2NF.length
              ? `violée — dépendance partielle : ${violations2NF.map((v) => `{${v.lhs.join(",")}} → ${v.rhs.join(",")}`).join(" ; ")}`
              : "respectée"}
          </p>
          <p className={violations3NF.length ? "text-[#ef4444]" : "text-[#22c55e]"}>
            <strong>3FN :</strong> {violations3NF.length
              ? `violée — dépendance transitive : ${violations3NF.map((v) => `{${v.lhs.join(",")}} → ${v.rhs.join(",")}`).join(" ; ")}`
              : "respectée"}
          </p>
        </div>
      </div>

      {steps.length > 0 && (
        <div className="glass rounded-xl p-4">
          <p className="text-sm font-bold text-[#f59e0b] mb-3">Décomposition pas à pas</p>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="bg-black/20 rounded-lg p-3 text-xs">
                <span className="text-[#64748b]">Dans <strong className="text-[#e2e8f0]">{s.relName}</strong>, la dépendance </span>
                <code className="text-[#f59e0b]">{s.lhs.join(",")} → {s.extracted.join(",")}</code>
                <span className="text-[#64748b]"> n&apos;est pas une dépendance élémentaire de la clé complète → extraction vers </span>
                <strong className="text-[#22c55e]">{s.newRelName}({[...s.lhs, ...s.extracted].join(", ")})</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-xl p-4">
        <p className="text-sm font-bold text-[#22c55e] mb-3">Schéma final (3FN)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {relations.map((r) => {
            const attrList = [...r.attrs];
            return (
              <div key={r.name} className="bg-black/20 rounded-lg p-3">
                <p className="text-xs font-bold text-[#00d4ff] mb-1">{r.name}</p>
                <p className="text-[11px] font-mono text-[#e2e8f0]">
                  {attrList.map((a, i) => (
                    <span key={a} className={r.key.includes(a) ? "underline decoration-[#00d4ff]" : ""}>
                      {a}{i < attrList.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </p>
                <p className="text-[10px] text-[#64748b] mt-1">Clé : {r.key.join(", ")}</p>
              </div>
            );
          })}
        </div>
        {attrs.length === 0 && <p className="text-xs text-[#64748b]">Saisissez au moins une dépendance fonctionnelle valide.</p>}
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
type Tab = "algebre" | "normalisation";

export default function BddPage() {
  const [tab, setTab] = useState<Tab>("normalisation");
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#3b82f6] mb-2">🗄 Bases de données</h1>
      <p className="text-[#64748b] text-sm mb-6">Algèbre relationnelle interactive et normalisation pas à pas à partir de dépendances fonctionnelles.</p>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <button onClick={() => setTab("normalisation")}
          className="p-3 rounded-xl border text-left transition-all"
          style={tab === "normalisation" ? { borderColor: "#3b82f6", background: "#3b82f612", boxShadow: "0 0 16px #3b82f622" } : { borderColor: "#2a2d3a", background: "rgba(26,29,39,0.6)" }}>
          <div className="text-xl mb-1">🧩</div>
          <div className="text-xs font-semibold" style={{ color: tab === "normalisation" ? "#3b82f6" : "#94a3b8" }}>Normalisation</div>
          <div className="text-[10px] text-[#64748b] leading-3 mt-0.5">1FN, 2FN, 3FN — clés, dépendances, décomposition</div>
        </button>
        <button onClick={() => setTab("algebre")}
          className="p-3 rounded-xl border text-left transition-all"
          style={tab === "algebre" ? { borderColor: "#3b82f6", background: "#3b82f612", boxShadow: "0 0 16px #3b82f622" } : { borderColor: "#2a2d3a", background: "rgba(26,29,39,0.6)" }}>
          <div className="text-xl mb-1">Σ</div>
          <div className="text-xs font-semibold" style={{ color: tab === "algebre" ? "#3b82f6" : "#94a3b8" }}>Algèbre relationnelle</div>
          <div className="text-[10px] text-[#64748b] leading-3 mt-0.5">Sélection σ, projection π, jointure ⋈</div>
        </button>
      </div>

      {tab === "normalisation" ? <NormalisationTab /> : <AlgebraTab />}
    </div>
  );
}
