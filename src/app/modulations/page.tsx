"use client";
import { useMemo, useState } from "react";
import { Card, Field, Select, Slider, Result, Divider, Hint, si, fmt, num } from "@/components/ui/Calc";
import Plot, { Series } from "@/components/ui/Plot";

type Mod = "bpsk" | "qpsk" | "8psk" | "16qam" | "64qam";
const MODS: { value: Mod; label: string; M: number; couleur: string }[] = [
  { value: "bpsk", label: "BPSK (2 états)", M: 2, couleur: "#00d4ff" },
  { value: "qpsk", label: "QPSK / 4-PSK", M: 4, couleur: "#22c55e" },
  { value: "8psk", label: "8-PSK", M: 8, couleur: "#f59e0b" },
  { value: "16qam", label: "16-QAM", M: 16, couleur: "#ec4899" },
  { value: "64qam", label: "64-QAM", M: 64, couleur: "#a78bfa" },
];

const gray = (n: number) => n ^ (n >> 1);

/** Points de la constellation (énergie moyenne par symbole = 1) avec leur étiquette binaire (code de Gray) */
function constellation(mod: Mod): { i: number; q: number; bits: string }[] {
  const M = MODS.find((m) => m.value === mod)!.M, k = Math.log2(M);
  if (mod.endsWith("psk")) {
    const decal = mod === "qpsk" ? Math.PI / 4 : 0;
    return Array.from({ length: M }, (_, n) => {
      const a = (2 * Math.PI * n) / M + decal;
      return { i: Math.cos(a), q: Math.sin(a), bits: gray(n).toString(2).padStart(k, "0") };
    });
  }
  const c = Math.sqrt(M), kk = k / 2;
  const norm = Math.sqrt((2 * (M - 1)) / 3); // énergie moyenne d'une QAM carrée
  const pts = [];
  for (let a = 0; a < c; a++) for (let b = 0; b < c; b++) {
    pts.push({ i: (2 * a - c + 1) / norm, q: (2 * b - c + 1) / norm, bits: gray(a).toString(2).padStart(kk, "0") + gray(b).toString(2).padStart(kk, "0") });
  }
  return pts;
}

/* Fonction erfc (approximation de Numerical Recipes, erreur < 1,2e-7) */
function erfc(x: number): number {
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}
const Q = (x: number) => 0.5 * erfc(x / Math.SQRT2);

/** Taux d'erreur binaire théorique (canal à bruit blanc gaussien, code de Gray) */
function teb(mod: Mod, ebn0dB: number): number {
  const M = MODS.find((m) => m.value === mod)!.M, k = Math.log2(M), g = 10 ** (ebn0dB / 10);
  if (M <= 4) return Q(Math.sqrt(2 * g));
  if (mod.endsWith("psk")) return (2 / k) * Q(Math.sqrt(2 * k * g) * Math.sin(Math.PI / M));
  return (4 / k) * (1 - 1 / Math.sqrt(M)) * Q(Math.sqrt((3 * k * g) / (M - 1)));
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) + Box-Muller */
function bruitGaussien(graine: number) {
  let a = graine;
  const u = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return () => Math.sqrt(-2 * Math.log(u() || 1e-12)) * Math.cos(2 * Math.PI * u());
}

function Constellation({ mod, ebn0 }: { mod: Mod; ebn0: number }) {
  const pts = useMemo(() => constellation(mod), [mod]);
  const M = pts.length, k = Math.log2(M);
  const couleur = MODS.find((m) => m.value === mod)!.couleur;
  // Es = 1 ⇒ N0 = 1/(k·Eb/N0) ; écart-type par axe = √(N0/2)
  const sigma = Math.sqrt(1 / (2 * k * 10 ** (ebn0 / 10)));
  const nuage = useMemo(() => {
    const g = bruitGaussien(42);
    return Array.from({ length: 1200 }, (_, n) => { const p = pts[n % M]; return [p.i + sigma * g(), p.q + sigma * g()]; });
  }, [pts, M, sigma]);
  const S = 320, C = S / 2, echelle = C / 1.7;
  const X = (v: number) => C + v * echelle, Y = (v: number) => C - v * echelle;
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[360px] mx-auto bg-[#0f1117] rounded-lg">
      <line x1={8} y1={C} x2={S - 8} y2={C} stroke="#475569" /><line x1={C} y1={8} x2={C} y2={S - 8} stroke="#475569" />
      <text x={S - 10} y={C - 5} fontSize={10} fill="#64748b" textAnchor="end">I</text><text x={C + 5} y={16} fontSize={10} fill="#64748b">Q</text>
      {mod.endsWith("psk") && <circle cx={C} cy={C} r={echelle} fill="none" stroke="#2a2d3a" strokeDasharray="3 3" />}
      {nuage.map(([i, q], n) => <circle key={n} cx={X(i)} cy={Y(q)} r={1.1} fill={couleur} opacity={0.35} />)}
      {pts.map((p) => (
        <g key={p.bits}>
          <circle cx={X(p.i)} cy={Y(p.q)} r={3.5} fill="#fff" />
          {M <= 16 && <text x={X(p.i)} y={Y(p.q) - 7} fontSize={M > 8 ? 8 : 10} fill="#e2e8f0" textAnchor="middle" fontFamily="monospace">{p.bits}</text>}
        </g>
      ))}
    </svg>
  );
}

export default function ModulationsPage() {
  const [mod, setMod] = useState<Mod>("16qam");
  const [ebn0, setEbn0] = useState(10);
  const [rs, setRs] = useState("1e6"), [roll, setRoll] = useState("0.35");
  const [bits, setBits] = useState("1011001110100101");

  const M = MODS.find((m) => m.value === mod)!.M, k = Math.log2(M);
  const courbes: Series[] = MODS.map((m) => ({
    data: Array.from({ length: 81 }, (_, i) => { const x = i * 0.25; return [x, Math.log10(Math.max(1e-12, teb(m.value, x)))] as [number, number]; }),
    color: m.couleur, label: m.label.split(" ")[0], width: m.value === mod ? 3 : 1.2, dashed: m.value !== mod,
  }));
  const p = teb(mod, ebn0);
  const pts = constellation(mod);
  const symboles = (bits.replace(/[^01]/g, "").match(new RegExp(`.{1,${k}}`, "g")) ?? []).map((b) => b.padEnd(k, "0"));
  const ebn0Pour = (cible: number) => { for (let x = 0; x <= 30; x += 0.05) if (teb(mod, x) <= cible) return x; return NaN; };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#ec4899] mb-2">✳️ Modulations numériques</h1>
      <p className="text-[#64748b] text-sm mb-8">Constellations PSK et QAM, effet du bruit, taux d&apos;erreur binaire et encombrement spectral.</p>
      <div className="space-y-5">
        <Card color="#ec4899" title="Constellation & bruit" formula="s(t) = I·cos(2πf₀t) − Q·sin(2πf₀t)   —   k = log₂(M) bits par symbole"
          explainer={<>
            <p>Chaque point du diagramme est un <strong>symbole</strong> : un couple (I, Q) qui fixe l&apos;amplitude et la phase de la porteuse. Avec M symboles, on transmet log₂(M) bits à chaque fois. Les étiquettes suivent un <strong>code de Gray</strong> : deux voisins ne diffèrent que d&apos;un bit, donc une erreur de symbole ne coûte qu&apos;un bit la plupart du temps.</p>
            <p>Le bruit disperse les points reçus autour de leur position idéale. Plus il y a de symboles, plus ils sont proches et plus le bruit provoque d&apos;erreurs : c&apos;est le compromis entre <strong>débit</strong> et <strong>robustesse</strong>. Le Wi-Fi et la 4G/5G changent de modulation selon la qualité du signal (modulation adaptative).</p>
          </>}>
          <div className="grid sm:grid-cols-2 gap-5 items-center">
            <div className="space-y-3">
              <Select label="Modulation" value={mod} onChange={setMod} options={MODS} />
              <Slider label="Eb/N0 (rapport énergie par bit / bruit)" value={ebn0} onChange={setEbn0} min={0} max={25} step={0.5} display={`${ebn0} dB`} />
              <Result label="Bits par symbole" value={String(k)} />
              <Result label="TEB théorique" value={p < 1e-12 ? "< 10⁻¹²" : p.toExponential(2)} accent />
              <Result label="Soit environ" value={p < 1e-12 ? "aucune erreur mesurable" : `1 bit faux sur ${si(1 / p, "", 3)}`} />
              <Result label="Eb/N0 requis pour TEB = 10⁻⁶" value={`${fmt(ebn0Pour(1e-6), 3)} dB`} />
              <Hint>Le nuage montre 1200 symboles reçus avec ce niveau de bruit.</Hint>
            </div>
            <Constellation mod={mod} ebn0={ebn0} />
          </div>
        </Card>

        <Card color="#00d4ff" title="Taux d'erreur binaire selon Eb/N0" formula="BPSK/QPSK : TEB = Q(√(2·Eb/N0))   —   M-QAM : TEB ≈ (4/k)(1 − 1/√M)·Q(√(3k·Eb/N0 / (M − 1)))"
          explainer={<p>Courbes théoriques pour un canal à bruit blanc gaussien, sans codage correcteur. À TEB égal, passer de QPSK à 16-QAM double le débit mais demande environ 4 dB de plus. BPSK et QPSK ont le même TEB par bit, mais QPSK transporte 2 bits par symbole.</p>}>
          <Plot series={courbes} height={280} xLabel="Eb/N0 (dB)" yLabel="TEB" yMin={-9} yMax={0} yFmt={(v) => `1e${Math.round(v)}`} markers={[{ x: ebn0, color: "#94a3b8" }]} />
        </Card>

        <Card color="#22c55e" title="Débit & bande occupée" formula="Db = Rs × log₂(M)      B = Rs × (1 + α)      efficacité = Db / B"
          explainer={<p>La rapidité de modulation Rs (en bauds) est le nombre de symboles par seconde. Un filtre de mise en forme en cosinus surélevé de facteur α (roll-off) occupe une bande Rs·(1 + α). Augmenter M augmente le débit sans élargir la bande : l&apos;efficacité spectrale (bit/s/Hz) grimpe, au prix de la robustesse.</p>}>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Rapidité de modulation Rs" unit="bauds" value={rs} onChange={setRs} hint="ex. 1e6 = 1 Mbaud" />
            <Field label="Facteur de roll-off α" value={roll} onChange={setRoll} />
          </div>
          <Divider />
          <Result label="Débit binaire" value={si(num(rs) * k, "bit/s")} accent />
          <Result label="Bande occupée" value={si(num(rs) * (1 + num(roll)), "Hz")} />
          <Result label="Efficacité spectrale" value={`${fmt(k / (1 + num(roll)), 3)} bit/s/Hz`} accent />
          <Divider />
          <label className="text-xs text-[#64748b] block">Suite binaire à moduler</label>
          <input value={bits} onChange={(e) => setBits(e.target.value.replace(/[^01]/g, ""))}
            className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono tracking-widest outline-none focus:border-[#22c55e]" />
          <div className="flex flex-wrap gap-1.5">
            {symboles.slice(0, 32).map((s, i) => {
              const pt = pts.find((q) => q.bits === s)!;
              return (
                <div key={i} className="bg-black/30 rounded px-2 py-1 text-center">
                  <div className="font-mono text-xs text-[#e2e8f0]">{s}</div>
                  <div className="font-mono text-[9px] text-[#64748b]">{mod.endsWith("psk") ? `${fmt((Math.atan2(pt.q, pt.i) * 180) / Math.PI, 3)}°` : `I${fmt(pt.i, 2)} Q${fmt(pt.q, 2)}`}</div>
                </div>
              );
            })}
          </div>
          <Hint>{symboles.length} symbole{symboles.length > 1 ? "s" : ""} pour {bits.length} bits{bits.length % k ? " (complété par des 0)" : ""}.</Hint>
        </Card>
      </div>
    </div>
  );
}
