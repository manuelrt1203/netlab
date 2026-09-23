"use client";
import { useMemo, useState } from "react";
import { Card, Field, Select, Slider, Result, Divider, Hint, Tabs, si, fmt, num } from "@/components/ui/Calc";
import Plot, { Series } from "@/components/ui/Plot";

/* ─── Complexes minimalistes ────────────────────────────────────────── */
interface Z { re: number; im: number }
const cx = (re: number, im = 0): Z => ({ re, im });
const add = (a: Z, b: Z): Z => cx(a.re + b.re, a.im + b.im);
const div = (a: Z, b: Z): Z => { const d = b.re ** 2 + b.im ** 2; return cx((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d); };
const inv = (a: Z) => div(cx(1), a);
const mod = (a: Z) => Math.hypot(a.re, a.im);
const argDeg = (a: Z) => (Math.atan2(a.im, a.re) * 180) / Math.PI;
const alg = (z: Z) => `${si(z.re, "", 4)} ${z.im < 0 ? "−" : "+"} j·${si(Math.abs(z.im), "", 4)}`;

/* ═══ Onglet 1 : impédances ═════════════════════════════════════════ */
type Dip = "R" | "L" | "C";
interface Comp { id: number; type: Dip; val: string }
const UNITE: Record<Dip, string> = { R: "Ω", L: "H", C: "F" };
const COUL: Record<Dip, string> = { R: "#f59e0b", L: "#22c55e", C: "#00d4ff" };

function zDipole(c: Comp, w: number): Z {
  const v = num(c.val);
  if (c.type === "R") return cx(v);
  if (c.type === "L") return cx(0, v * w);
  return cx(0, -1 / (v * w));
}

function Impedances() {
  const [comps, setComps] = useState<Comp[]>([
    { id: 1, type: "R", val: "1000" }, { id: 2, type: "C", val: "100e-9" }, { id: 3, type: "L", val: "10e-3" },
  ]);
  const [assoc, setAssoc] = useState<"serie" | "parallele">("serie");
  const [f, setF] = useState("1000");
  const [nextId, setNextId] = useState(4);

  const w = 2 * Math.PI * num(f);
  const zs = comps.map((c) => zDipole(c, w));
  const zeq = assoc === "serie" ? zs.reduce(add, cx(0)) : inv(zs.map(inv).reduce(add, cx(0)));

  // Équivalents « même type » (règles du TD R205)
  const parType = (t: Dip) => comps.filter((c) => c.type === t).map((c) => num(c.val));
  const somme = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const inverse = (xs: number[]) => 1 / somme(xs.map((x) => 1 / x));
  const eqType = (t: Dip) => {
    const xs = parType(t);
    if (xs.length < 2) return null;
    const serieAdd = t !== "C";
    return (assoc === "serie") === serieAdd ? somme(xs) : inverse(xs);
  };

  const maj = (id: number, p: Partial<Comp>) => setComps((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));

  return (
    <Card color="#f59e0b" title="Impédances complexes & associations" formula="Z_R = R   Z_L = jLω   Z_C = 1/(jCω) = −j/(Cω)"
      explainer={<>
        <p>En <strong>série</strong>, les impédances s&apos;additionnent : Z = Z₁ + Z₂ + … En <strong>parallèle</strong>, ce sont les admittances (1/Z) qui s&apos;additionnent.</p>
        <p>Conséquence : les résistances et bobines s&apos;additionnent en série, alors que les condensateurs s&apos;additionnent en parallèle (C = C₁ + C₂) et suivent la règle des inverses en série.</p>
        <p>Le module |Z| donne le rapport U/I, l&apos;argument donne le déphasage de u par rapport à i.</p>
      </>}>
      <div className="grid grid-cols-2 gap-2">
        <Select label="Association" value={assoc} onChange={setAssoc} options={[{ value: "serie", label: "Série" }, { value: "parallele", label: "Parallèle" }]} />
        <Field label="Fréquence f" unit="Hz" value={f} onChange={setF} />
      </div>
      <div className="space-y-2">
        {comps.map((c, i) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 bg-black/20 rounded-lg p-2">
            <select value={c.type} onChange={(e) => maj(c.id, { type: e.target.value as Dip })}
              className="bg-[#0f1117] border border-[#2a2d3a] px-2 py-1 rounded text-xs font-bold" style={{ color: COUL[c.type] }}>
              <option value="R">R</option><option value="L">L</option><option value="C">C</option>
            </select>
            <input type="number" value={c.val} onChange={(e) => maj(c.id, { val: e.target.value })}
              className="w-28 bg-[#0f1117] border border-[#2a2d3a] px-2 py-1 rounded text-xs font-mono" />
            <span className="text-[10px] text-[#64748b] w-16">{si(num(c.val), UNITE[c.type])}</span>
            <span className="text-[11px] font-mono text-[#94a3b8]">Z = {alg(zs[i])} Ω</span>
            <button onClick={() => setComps((cs) => cs.filter((x) => x.id !== c.id))} className="ml-auto text-xs text-[#ef4444] px-2">✕</button>
          </div>
        ))}
        <button onClick={() => { setComps((cs) => [...cs, { id: nextId, type: "R", val: "100" }]); setNextId((n) => n + 1); }}
          className="w-full py-1.5 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all">+ Ajouter un dipôle</button>
      </div>
      {comps.length > 0 && <>
        <Divider />
        <Result label="Z équivalente" value={`${alg(zeq)} Ω`} accent />
        <Result label="|Z|" value={si(mod(zeq), "Ω", 4)} accent />
        <Result label="Déphasage φ(u/i)" value={`${fmt(argDeg(zeq))}°`} />
        <Hint>{Math.abs(zeq.im) < 1e-9 * mod(zeq) ? "Comportement purement résistif." : zeq.im > 0 ? "Comportement inductif (u en avance sur i)." : "Comportement capacitif (u en retard sur i)."}</Hint>
        {(["R", "L", "C"] as Dip[]).map((t) => {
          const e = eqType(t);
          return e === null ? null : <Result key={t} label={`${t} équivalente (${t}s seules, en ${assoc === "serie" ? "série" : "parallèle"})`} value={si(e, UNITE[t], 4)} />;
        })}
      </>}
    </Card>
  );
}

/* ═══ Onglet 2 : filtres & Bode ═════════════════════════════════════ */
type Filtre = "rc_pb" | "rc_ph" | "rl_pb" | "rl_ph" | "rlc_pbande" | "rlc_pb" | "rlc_ph" | "deriv" | "integ";

const FILTRES: { value: Filtre; label: string; ordre: 1 | 2; schema: string; H: string }[] = [
  { value: "rc_pb", label: "RC passe-bas (sortie sur C)", ordre: 1, schema: "Ve ─R─┬─ Vs\n      C\n      ⏚", H: "H = 1 / (1 + jRCω)" },
  { value: "rc_ph", label: "CR passe-haut (sortie sur R)", ordre: 1, schema: "Ve ─C─┬─ Vs\n      R\n      ⏚", H: "H = jRCω / (1 + jRCω)" },
  { value: "rl_pb", label: "LR passe-bas (sortie sur R)", ordre: 1, schema: "Ve ─L─┬─ Vs\n      R\n      ⏚", H: "H = 1 / (1 + jLω/R)" },
  { value: "rl_ph", label: "RL passe-haut (sortie sur L)", ordre: 1, schema: "Ve ─R─┬─ Vs\n      L\n      ⏚", H: "H = (jLω/R) / (1 + jLω/R)" },
  { value: "rlc_pbande", label: "RLC série passe-bande (sortie sur R)", ordre: 2, schema: "Ve ─L─C─┬─ Vs\n        R\n        ⏚", H: "H = jRCω / (1 − LCω² + jRCω)" },
  { value: "rlc_pb", label: "RLC série passe-bas (sortie sur C)", ordre: 2, schema: "Ve ─R─L─┬─ Vs\n        C\n        ⏚", H: "H = 1 / (1 − LCω² + jRCω)" },
  { value: "rlc_ph", label: "RLC série passe-haut (sortie sur L)", ordre: 2, schema: "Ve ─R─C─┬─ Vs\n        L\n        ⏚", H: "H = −LCω² / (1 − LCω² + jRCω)" },
  { value: "deriv", label: "Dérivateur idéal (τ = RC)", ordre: 1, schema: "y(t) = τ · du/dt", H: "H = jωτ" },
  { value: "integ", label: "Intégrateur idéal (τ = RC)", ordre: 1, schema: "y(t) = (1/τ) · ∫u dt", H: "H = 1 / (jωτ)" },
];

function transfert(type: Filtre, R: number, L: number, C: number, w: number): Z {
  const den2 = cx(1 - L * C * w * w, R * C * w);
  switch (type) {
    case "rc_pb": return inv(cx(1, R * C * w));
    case "rc_ph": return div(cx(0, R * C * w), cx(1, R * C * w));
    case "rl_pb": return inv(cx(1, (L * w) / R));
    case "rl_ph": return div(cx(0, (L * w) / R), cx(1, (L * w) / R));
    case "rlc_pbande": return div(cx(0, R * C * w), den2);
    case "rlc_pb": return inv(den2);
    case "rlc_ph": return div(cx(-L * C * w * w), den2);
    case "deriv": return cx(0, R * C * w);
    case "integ": return inv(cx(0, R * C * w));
  }
}

/** Fréquence caractéristique (coupure pour l'ordre 1, résonance pour l'ordre 2) */
function fCarac(type: Filtre, R: number, L: number, C: number) {
  if (type.startsWith("rlc")) return 1 / (2 * Math.PI * Math.sqrt(L * C));
  if (type.startsWith("rl")) return R / (2 * Math.PI * L);
  return 1 / (2 * Math.PI * R * C);
}

/** Diagramme asymptotique du gain (dB), x = f / fc */
function asymptote(type: Filtre, x: number, Q: number): number {
  const l = 20 * Math.log10(x);
  switch (type) {
    case "rc_pb": case "rl_pb": return x < 1 ? 0 : -l;
    case "rc_ph": case "rl_ph": return x < 1 ? l : 0;
    case "rlc_pb": return x < 1 ? 0 : -2 * l;
    case "rlc_ph": return x < 1 ? 2 * l : 0;
    case "rlc_pbande": return -20 * Math.log10(Q) + (x < 1 ? l : -l);
    case "deriv": return l;
    case "integ": return -l;
  }
}

function Filtres() {
  const [type, setType] = useState<Filtre>("rc_pb");
  const [R, setR] = useState("1000"), [L, setL] = useState("10e-3"), [C, setC] = useState("100e-9");
  const [sonde, setSonde] = useState(0); // log10(f/fc)
  const [asym, setAsym] = useState(true);

  const info = FILTRES.find((f) => f.value === type)!;
  const r = num(R), l = num(L), c = num(C);
  const utiliseL = type.includes("rl");
  const utiliseC = !type.startsWith("rl_");
  const fc = fCarac(type, r, l, c);
  const Q = type.startsWith("rlc") ? Math.sqrt(l / c) / r : NaN;

  const { gain, phase, coupures } = useMemo(() => {
    const N = 400, f0 = fc / 1000, f1 = fc * 1000;
    const fs = Array.from({ length: N + 1 }, (_, k) => f0 * Math.pow(f1 / f0, k / N));
    const H = fs.map((f) => transfert(type, r, l, c, 2 * Math.PI * f));
    const G = H.map(mod);
    const gain: Series[] = [{ data: fs.map((f, k) => [f, 20 * Math.log10(G[k])]), color: "#00d4ff", label: "G_dB réel" }];
    if (asym) gain.push({ data: fs.map((f) => [f, asymptote(type, f / fc, Q)]), color: "#f59e0b", dashed: true, width: 1.5, label: "asymptotes" });
    let prev = -Infinity;
    const phase: Series[] = [{ data: fs.map((f, k) => {
      let p = argDeg(H[k]);
      if (isFinite(prev)) while (p - prev > 180) p -= 360;
      if (isFinite(prev)) while (prev - p > 180) p += 360;
      prev = p;
      return [f, p] as [number, number];
    }), color: "#ec4899", label: "φ (°)" }];

    // Fréquences de coupure à −3 dB (si le filtre a un maximum fini)
    const Gmax = Math.max(...G);
    const coupures: number[] = [];
    if (type !== "deriv" && type !== "integ") {
      const seuil = Gmax / Math.SQRT2;
      for (let k = 1; k < fs.length; k++)
        if ((G[k - 1] - seuil) * (G[k] - seuil) < 0) {
          // interpolation linéaire en log(f) entre les deux points qui encadrent le seuil
          const t = (seuil - G[k - 1]) / (G[k] - G[k - 1]);
          coupures.push(fs[k - 1] * Math.pow(fs[k] / fs[k - 1], t));
        }
    }
    return { gain, phase, coupures };
  }, [type, r, l, c, fc, Q, asym]);

  const fs = fc * Math.pow(10, sonde);
  const Hs = transfert(type, r, l, c, 2 * Math.PI * fs);
  const Gs = mod(Hs), phis = argDeg(Hs);

  const ts = Array.from({ length: 301 }, (_, k) => (k / 300) * (2 / fs));
  const temporel: Series[] = [
    { data: ts.map((t) => [t * 1000, Math.sin(2 * Math.PI * fs * t)]), color: "#94a3b8", label: "entrée", width: 1.5 },
    { data: ts.map((t) => [t * 1000, Gs * Math.sin(2 * Math.PI * fs * t + (phis * Math.PI) / 180)]), color: "#22c55e", label: "sortie" },
  ];

  const markers = [
    ...coupures.map((f) => ({ x: f, color: "#ef4444", label: `fc ${si(f, "Hz")}` })),
    { x: fs, color: "#22c55e", label: "" },
  ];
  const xFmt = (v: number) => si(v, "Hz", 2);

  return (
    <Card color="#00d4ff" title="Filtres passifs & diagramme de Bode" formula={`${info.H}   G_dB = 20·log|H|   φ = arg(H)`}
      explainer={<>
        <p>La <strong>fonction de transfert</strong> H(jω) = Vs/Ve se calcule avec les impédances complexes (pont diviseur de tension). Son module donne le gain, son argument le déphasage entre sortie et entrée.</p>
        <p>Le <strong>diagramme de Bode</strong> trace G_dB et φ en fonction de f sur une échelle logarithmique. Un filtre du 1er ordre a une pente de ±20 dB/décade, un 2e ordre ±40 dB/décade. À la fréquence de coupure, le gain vaut −3 dB (soit ×1/√2).</p>
        <p>Pour le RLC : ω₀ = 1/√(LC) et Q = (1/R)·√(L/C). Si Q est grand, la résonance est aiguë et le passe-bande est sélectif (bande passante Δf = f₀/Q).</p>
      </>}>
      <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
        <div className="space-y-2">
          <Select label="Filtre" value={type} onChange={setType} options={FILTRES} />
          <div className="grid grid-cols-3 gap-2">
            <Field label="R" unit="Ω" value={R} onChange={setR} />
            {utiliseL ? <Field label="L" unit="H" value={L} onChange={setL} /> : <div />}
            {utiliseC ? <Field label="C" unit="F" value={C} onChange={setC} /> : <div />}
          </div>
        </div>
        <pre className="text-[11px] leading-4 text-[#94a3b8] bg-black/30 rounded-lg p-3 font-mono">{info.schema}</pre>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        {[
          [info.ordre === 2 ? "f₀ (résonance)" : type === "deriv" || type === "integ" ? "f(τ) = 1/2πτ" : "fc (coupure)", si(fc, "Hz")],
          [info.ordre === 2 ? "ω₀" : "ωc", `${si(2 * Math.PI * fc, "rad/s")}`],
          ["Ordre", String(info.ordre)],
          [info.ordre === 2 ? "Facteur Q" : "τ", info.ordre === 2 ? fmt(Q, 3) : si(utiliseL ? l / r : r * c, "s")],
        ].map(([k, v]) => (
          <div key={k} className="bg-black/20 rounded-lg p-2">
            <div className="text-[10px] text-[#64748b]">{k}</div>
            <div className="font-mono text-sm text-[#00d4ff] font-bold">{v}</div>
          </div>
        ))}
      </div>
      {type === "rlc_pbande" && coupures.length === 2 && (
        <Result label="Bande passante à −3 dB" value={`${si(coupures[0], "Hz")} → ${si(coupures[1], "Hz")} (Δf = ${si(coupures[1] - coupures[0], "Hz")})`} />
      )}

      <label className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer">
        <input type="checkbox" checked={asym} onChange={(e) => setAsym(e.target.checked)} /> Afficher le diagramme asymptotique
      </label>
      <Plot series={gain} xLog height={240} xFmt={xFmt} yLabel="Gain (dB)" markers={markers}
        hLines={type === "deriv" || type === "integ" ? [] : [{ y: 20 * Math.log10(Math.max(...gain[0].data.map((p) => 10 ** (p[1] / 20)))) - 3, color: "#ef4444", label: "−3 dB" }]} />
      <Plot series={phase} xLog height={180} xFmt={xFmt} yLabel="Phase (°)" markers={markers} />

      <Divider />
      <Slider label="Fréquence de test" value={sonde} onChange={setSonde} min={-3} max={3} step={0.01} display={si(fs, "Hz")} />
      <div className="grid sm:grid-cols-2 gap-4 items-center">
        <div className="space-y-2">
          <Result label="H(jω)" value={alg(Hs)} />
          <Result label="Gain |H|" value={fmt(Gs, 4)} accent />
          <Result label="Gain en dB" value={`${fmt(20 * Math.log10(Gs), 4)} dB`} accent />
          <Result label="Déphasage φ" value={`${fmt(phis, 4)}°`} />
          <Hint>Pour une entrée sinusoïdale d&apos;amplitude 1 V, la sortie a une amplitude de {fmt(Gs, 3)} V et est {phis > 0 ? "en avance" : phis < 0 ? "en retard" : "en phase"}{phis !== 0 ? ` de ${fmt(Math.abs(phis), 3)}°` : ""}.</Hint>
        </div>
        <Plot series={temporel} height={170} xFmt={(v) => fmt(v, 2)} xLabel="t (ms)" />
      </div>
    </Card>
  );
}

/* ═══ Page ═══════════════════════════════════════════════════════════ */
type Onglet = "filtres" | "impedances";
const ONGLETS: { id: Onglet; icon: string; label: string; desc: string; color: string }[] = [
  { id: "filtres", icon: "📉", label: "Filtres & Bode", desc: "RC, RL, RLC, dérivateur, intégrateur", color: "#00d4ff" },
  { id: "impedances", icon: "Ω", label: "Impédances", desc: "R, L, C en série ou parallèle", color: "#f59e0b" },
];

export default function FiltresPage() {
  const [onglet, setOnglet] = useState<Onglet>("filtres");
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🎛 Électronique & filtres</h1>
      <p className="text-[#64748b] text-sm mb-6">Impédances complexes, fonctions de transfert et diagrammes de Bode tracés en direct.</p>
      <Tabs tabs={ONGLETS} value={onglet} onChange={setOnglet} />
      {onglet === "filtres" ? <Filtres /> : <Impedances />}
    </div>
  );
}
