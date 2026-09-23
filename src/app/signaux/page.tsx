"use client";
import { useMemo, useState } from "react";
import { Card, Field, Select, Slider, Result, Divider, Hint, si, fmt, num } from "@/components/ui/Calc";
import Plot, { Series } from "@/components/ui/Plot";

type Forme = "sinus" | "carre" | "triangle" | "scie";

const FORMES: { value: Forme; label: string }[] = [
  { value: "sinus", label: "Sinusoïdal" },
  { value: "carre", label: "Carré" },
  { value: "triangle", label: "Triangle" },
  { value: "scie", label: "Dents de scie" },
];

/** Facteur Veff / amplitude pour un signal alternatif (valeur moyenne nulle) */
const FACTEUR_EFF: Record<Forme, number> = { sinus: 1 / Math.SQRT2, carre: 1, triangle: 1 / Math.sqrt(3), scie: 1 / Math.sqrt(3) };

/** Forme d'onde normalisée (amplitude 1, calée sur cos : maximum en u = 0) */
function onde(forme: Forme, u: number): number {
  const fr = u - Math.floor(u);
  switch (forme) {
    case "sinus": return Math.cos(2 * Math.PI * u);
    case "carre": return fr < 0.25 || fr >= 0.75 ? 1 : -1;
    case "triangle": return 1 - 4 * Math.abs(((fr + 0.5) % 1) - 0.5);
    case "scie": return 2 * fr - 1;
  }
}

interface Comp { on: boolean; forme: Forme; A: string; f: string; phi: string; off: string }

const COULEURS = ["#00d4ff", "#ec4899", "#22c55e"];
const DEFAUT: Comp[] = [
  { on: true, forme: "sinus", A: "2", f: "50", phi: "0", off: "0" },
  { on: true, forme: "sinus", A: "1", f: "50", phi: "-60", off: "0" },
  { on: false, forme: "sinus", A: "0.5", f: "150", phi: "0", off: "0" },
];

function valeur(c: Comp, t: number) {
  return num(c.off) + num(c.A) * onde(c.forme, num(c.f) * t + num(c.phi) / 360);
}

/* ─── Représentation de Fresnel ─────────────────────────────────────── */
function Fresnel({ comps }: { comps: Comp[] }) {
  const R = 90, C = 110;
  const Amax = Math.max(...comps.map((c) => num(c.A)), 0.001);
  const vec = (c: Comp) => {
    const a = (num(c.phi) * Math.PI) / 180, r = (num(c.A) / Amax) * R;
    return { x: C + r * Math.cos(a), y: C - r * Math.sin(a) };
  };
  return (
    <svg viewBox="0 0 220 220" className="w-full max-w-[240px] mx-auto">
      <circle cx={C} cy={C} r={R} fill="none" stroke="#2a2d3a" />
      <line x1={C - R - 8} y1={C} x2={C + R + 8} y2={C} stroke="#475569" />
      <line x1={C} y1={C - R - 8} x2={C} y2={C + R + 8} stroke="#475569" />
      {comps.map((c, i) => {
        const p = vec(c);
        return (
          <g key={i}>
            <line x1={C} y1={C} x2={p.x} y2={p.y} stroke={COULEURS[i]} strokeWidth={2.5} />
            <circle cx={p.x} cy={p.y} r={3.5} fill={COULEURS[i]} />
          </g>
        );
      })}
      <text x={C + R - 4} y={C - 5} fontSize={9} fill="#64748b" textAnchor="end">axe réel (φ = 0)</text>
    </svg>
  );
}

export default function SignauxPage() {
  const [comps, setComps] = useState<Comp[]>(DEFAUT);
  const [periodes, setPeriodes] = useState(2);
  const [montrerSomme, setMontrerSomme] = useState(true);

  const actifs = comps.map((c, i) => ({ c, i })).filter(({ c }) => c.on && num(c.f) > 0);
  const fMin = actifs.length ? Math.min(...actifs.map(({ c }) => num(c.f))) : 1;
  const duree = periodes / fMin;

  const { series, stats } = useMemo(() => {
    const N = 800;
    const ts = Array.from({ length: N + 1 }, (_, k) => (k / N) * duree);
    const s: Series[] = actifs.map(({ c, i }) => ({
      data: ts.map((t) => [t * 1000, valeur(c, t)] as [number, number]),
      color: COULEURS[i], label: `s${i + 1}(t)`, width: montrerSomme && actifs.length > 1 ? 1.5 : 2,
      dashed: montrerSomme && actifs.length > 1,
    }));
    let stats = null;
    if (actifs.length) {
      const somme = ts.map((t) => actifs.reduce((acc, { c }) => acc + valeur(c, t), 0));
      if (montrerSomme && actifs.length > 1)
        s.push({ data: ts.map((t, k) => [t * 1000, somme[k]]), color: "#f59e0b", label: "somme", width: 2.5 });
      const moy = somme.slice(0, -1).reduce((a, b) => a + b, 0) / N;
      const eff = Math.sqrt(somme.slice(0, -1).reduce((a, b) => a + b * b, 0) / N);
      stats = { moy, eff, max: Math.max(...somme), min: Math.min(...somme) };
    }
    return { series: s, stats };
  }, [actifs, duree, montrerSomme]);

  const maj = (i: number, patch: Partial<Comp>) => setComps((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  const c1 = comps[0], c2 = comps[1];
  const memeFreq = c1.on && c2.on && num(c1.f) === num(c2.f) && num(c1.f) > 0;
  const dphi = ((((num(c2.phi) - num(c1.phi)) % 360) + 540) % 360) - 180;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">〰️ Signaux périodiques</h1>
      <p className="text-[#64748b] text-sm mb-8">
        Construis jusqu&apos;à 3 signaux <code className="text-[#94a3b8]">s(t) = S·cos(2πft + φ)</code>, observe leur somme, leur déphasage et leurs valeurs caractéristiques.
      </p>

      <div className="space-y-5">
        <Card color="#00d4ff" title="Générateur de signaux" formula="s(t) = S₀ + S·cos(2π·f·t + φ)"
          explainer={<>
            <p>Un signal périodique se répète toutes les <strong>T</strong> secondes : s(t) = s(t + T). Sa fréquence est f = 1/T (en Hz) et sa pulsation ω = 2πf (en rad/s).</p>
            <p><strong>S</strong> est l&apos;amplitude (valeur crête), <strong>φ</strong> la phase à l&apos;origine et <strong>S₀</strong> la composante continue (offset). Pour les formes non sinusoïdales, l&apos;onde est calée pour avoir son maximum en t = 0 quand φ = 0, comme le cosinus.</p>
          </>}>
          <div className="grid sm:grid-cols-3 gap-3">
            {comps.map((c, i) => (
              <div key={i} className="rounded-lg p-3 space-y-2 border" style={{ borderColor: c.on ? `${COULEURS[i]}55` : "#2a2d3a", opacity: c.on ? 1 : 0.55 }}>
                <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer" style={{ color: COULEURS[i] }}>
                  <input type="checkbox" checked={c.on} onChange={(e) => maj(i, { on: e.target.checked })} className="accent-current" />
                  s{i + 1}(t)
                </label>
                <Select label="Forme" value={c.forme} onChange={(v) => maj(i, { forme: v })} options={FORMES} />
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Amplitude S" unit="V" value={c.A} onChange={(v) => maj(i, { A: v })} />
                  <Field label="Fréquence f" unit="Hz" value={c.f} onChange={(v) => maj(i, { f: v })} />
                  <Field label="Phase φ" unit="°" value={c.phi} onChange={(v) => maj(i, { phi: v })} />
                  <Field label="Offset S₀" unit="V" value={c.off} onChange={(v) => maj(i, { off: v })} />
                </div>
                {c.on && num(c.f) > 0 && (
                  <div className="text-[11px] font-mono text-[#94a3b8] space-y-0.5 pt-1">
                    <div>T = {si(1 / num(c.f), "s")}</div>
                    <div>ω = {fmt(2 * Math.PI * num(c.f))} rad/s</div>
                    <div>φ = {fmt((num(c.phi) * Math.PI) / 180)} rad</div>
                    <div>Veff = {si(Math.sqrt(num(c.off) ** 2 + (num(c.A) * FACTEUR_EFF[c.forme]) ** 2), "V")}</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 items-end">
            <Slider label="Périodes affichées (du signal le plus lent)" value={periodes} onChange={setPeriodes} min={1} max={10} />
            <label className="flex items-center gap-2 text-sm text-[#94a3b8] cursor-pointer pb-1">
              <input type="checkbox" checked={montrerSomme} onChange={(e) => setMontrerSomme(e.target.checked)} />
              Afficher la somme des signaux
            </label>
          </div>

          <Plot series={series} height={300} xLabel="t (ms)" yLabel="s(t) en V" />

          {stats && (
            <>
              <Divider />
              <p className="text-xs text-[#64748b]">Signal {montrerSomme && actifs.length > 1 ? "somme" : "affiché"} — mesures sur la fenêtre affichée :</p>
              <Result label="Valeur moyenne" value={`${fmt(stats.moy, 3)} V`} />
              <Result label="Valeur efficace (RMS)" value={`${fmt(stats.eff, 4)} V`} accent />
              <Result label="Valeur max / min" value={`${fmt(stats.max, 3)} V / ${fmt(stats.min, 3)} V`} />
              <Result label="Crête à crête" value={`${fmt(stats.max - stats.min, 4)} V`} />
            </>
          )}
        </Card>

        <Card color="#ec4899" title="Déphasage & représentation de Fresnel" formula="Δt = Δφ / (360° · f)"
          explainer={<>
            <p>Deux signaux sinusoïdaux de <strong>même fréquence</strong> ne diffèrent que par leur amplitude et leur phase. On les représente par des vecteurs tournants (vecteurs de Fresnel) de longueur S et d&apos;angle φ.</p>
            <p>Le déphasage Δφ = φ₂ − φ₁ correspond à un décalage temporel Δt = Δφ/(2πf). Si Δφ &gt; 0, s₂ est <strong>en avance</strong> sur s₁ ; si Δφ &lt; 0, il est <strong>en retard</strong>.</p>
            <p>La somme de deux sinusoïdes de même fréquence est encore une sinusoïde : son vecteur de Fresnel est la somme des deux vecteurs.</p>
          </>}>
          {memeFreq ? (
            <div className="grid sm:grid-cols-2 gap-4 items-center">
              <Fresnel comps={[c1, c2]} />
              <div className="space-y-2">
                <Result label="Déphasage Δφ = φ₂ − φ₁" value={`${fmt(dphi, 4)}° (${fmt((dphi * Math.PI) / 180, 3)} rad)`} accent />
                <Result label="Décalage temporel Δt" value={si(Math.abs(dphi) / (360 * num(c1.f)), "s")} />
                <Hint>
                  {dphi === 0 ? "s₁ et s₂ sont en phase." : Math.abs(dphi) === 180 ? "s₁ et s₂ sont en opposition de phase." :
                    Math.abs(dphi) === 90 ? `s₁ et s₂ sont en quadrature (s₂ ${dphi > 0 ? "en avance" : "en retard"}).` :
                    `s₂ est ${dphi > 0 ? "en avance" : "en retard"} sur s₁.`}
                </Hint>
                {c1.forme === "sinus" && c2.forme === "sinus" && (() => {
                  const a1 = (num(c1.phi) * Math.PI) / 180, a2 = (num(c2.phi) * Math.PI) / 180;
                  const re = num(c1.A) * Math.cos(a1) + num(c2.A) * Math.cos(a2);
                  const im = num(c1.A) * Math.sin(a1) + num(c2.A) * Math.sin(a2);
                  return <>
                    <Divider />
                    <p className="text-xs text-[#64748b]">Somme s₁ + s₂ (addition des vecteurs) :</p>
                    <Result label="Amplitude résultante" value={`${fmt(Math.hypot(re, im), 4)} V`} accent />
                    <Result label="Phase résultante" value={`${fmt((Math.atan2(im, re) * 180) / Math.PI, 4)}°`} />
                  </>;
                })()}
              </div>
            </div>
          ) : (
            <Hint>Active s₁ et s₂ avec la même fréquence pour voir leur déphasage.</Hint>
          )}
        </Card>
      </div>
    </div>
  );
}
