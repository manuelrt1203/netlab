"use client";
import { useMemo, useState } from "react";
import { Card, Field, Select, Slider, Result, Divider, Hint, si, fmt, num } from "@/components/ui/Calc";
import Plot, { Series } from "@/components/ui/Plot";

type Sig = "carre" | "impulsions" | "triangle" | "scie" | "redresse2" | "redresse1";

const SIGNAUX: { value: Sig; label: string; formule: string; note: string }[] = [
  { value: "carre", label: "Carré symétrique (±A)", formule: "x(t) = (4A/π) · Σ sin(2π(2k+1)f₀t) / (2k+1)",
    note: "Signal impair : seuls les bₙ existent, et uniquement pour n impair. Les harmoniques décroissent en 1/n." },
  { value: "impulsions", label: "Impulsions rectangulaires (0 / A, rapport cyclique α)", formule: "a₀ = αA   cₙ = (2A/nπ)·|sin(nπα)|",
    note: "La valeur moyenne vaut αA. L'enveloppe du spectre est un sinus cardinal : les harmoniques multiples de 1/α sont nulles." },
  { value: "triangle", label: "Triangle (±A)", formule: "x(t) = (8A/π²) · Σ cos(2π(2k+1)f₀t) / (2k+1)²",
    note: "Signal pair : seuls les aₙ existent (n impair). Décroissance en 1/n² : le triangle est bien plus « lisse » que le carré." },
  { value: "scie", label: "Dents de scie (−A → A)", formule: "x(t) = −(2A/π) · Σ (−1)ⁿ sin(2πnf₀t) / n",
    note: "Toutes les harmoniques sont présentes (paires et impaires), décroissance en 1/n." },
  { value: "redresse2", label: "Sinus redressé double alternance |A·sin|", formule: "a₀ = 2A/π   a₂ₖ = −4A / (π(4k²−1))",
    note: "Le fondamental du signal redressé est à 2f₀ : seules les harmoniques paires existent. Utilisé en alimentation." },
  { value: "redresse1", label: "Sinus redressé simple alternance", formule: "a₀ = A/π   b₁ = A/2   a₂ₖ = −2A / (π(4k²−1))",
    note: "Combine une valeur moyenne A/π, le fondamental à f₀ et des harmoniques paires." },
];

/** Signal normalisé sur une période (u ∈ [0, 1[), amplitude 1 */
function x(sig: Sig, u: number, alpha: number): number {
  const fr = u - Math.floor(u);
  switch (sig) {
    case "carre": return fr < 0.5 ? 1 : -1;
    case "impulsions": return fr < alpha ? 1 : 0;
    case "triangle": return 1 - 4 * Math.abs(((fr + 0.5) % 1) - 0.5);
    case "scie": return fr < 0.5 ? 2 * fr : 2 * fr - 2;
    case "redresse2": return Math.abs(Math.sin(2 * Math.PI * fr));
    case "redresse1": return Math.max(0, Math.sin(2 * Math.PI * fr));
  }
}

interface Coef { n: number; a: number; b: number; c: number; phi: number }

/** Coefficients de Fourier calculés par intégration numérique (méthode des rectangles milieux) */
function coefficients(sig: Sig, alpha: number, A: number, nMax: number) {
  const M = 4096;
  const xs = Array.from({ length: M }, (_, k) => A * x(sig, (k + 0.5) / M, alpha));
  const a0 = xs.reduce((s, v) => s + v, 0) / M;
  const puissance = xs.reduce((s, v) => s + v * v, 0) / M;
  const coefs: Coef[] = [];
  for (let n = 1; n <= nMax; n++) {
    let a = 0, b = 0;
    for (let k = 0; k < M; k++) {
      const th = (2 * Math.PI * n * (k + 0.5)) / M;
      a += xs[k] * Math.cos(th); b += xs[k] * Math.sin(th);
    }
    a = (2 * a) / M; b = (2 * b) / M;
    if (Math.abs(a) < 1e-9 * A) a = 0;
    if (Math.abs(b) < 1e-9 * A) b = 0;
    coefs.push({ n, a, b, c: Math.hypot(a, b), phi: (Math.atan2(-b, a) * 180) / Math.PI });
  }
  return { a0, puissance, coefs };
}

const N_SPECTRE = 25;

export default function FourierPage() {
  const [sig, setSig] = useState<Sig>("carre");
  const [A, setA] = useState("1");
  const [f0, setF0] = useState("1000");
  const [alpha, setAlpha] = useState(0.25);
  const [N, setN] = useState(5);

  const amp = num(A) || 1, F0 = num(f0) || 1;
  const info = SIGNAUX.find((s) => s.value === sig)!;
  const { a0, puissance, coefs } = useMemo(() => coefficients(sig, alpha, amp, N_SPECTRE), [sig, alpha, amp]);

  const { temporel, spectre, pN } = useMemo(() => {
    const P = 600;
    const us = Array.from({ length: P + 1 }, (_, k) => (k / P) * 2);
    const actifs = coefs.slice(0, N);
    const recon = us.map((u) => a0 + actifs.reduce((s, { n, a, b }) => s + a * Math.cos(2 * Math.PI * n * u) + b * Math.sin(2 * Math.PI * n * u), 0));
    const toMs = (u: number) => (u / F0) * 1000;
    const temporel: Series[] = [
      { data: us.map((u) => [toMs(u), amp * x(sig, u, alpha)]), color: "#475569", label: "signal x(t)", width: 1.5 },
      { data: us.map((u, k) => [toMs(u), recon[k]]), color: "#00d4ff", label: `somme de ${N} harmonique${N > 1 ? "s" : ""}` },
    ];
    const pt = (c: Coef) => [c.n * F0, c.c] as [number, number];
    const spectre: Series[] = [
      { data: coefs.slice(N).filter((c) => c.c > 0).map(pt), color: "#334155", stem: true, width: 2 },
      { data: [...(Math.abs(a0) > 1e-9 ? [[0, Math.abs(a0)] as [number, number]] : []), ...actifs.filter((c) => c.c > 0).map(pt)], color: "#ec4899", stem: true, width: 2.5 },
    ];
    const pN = a0 * a0 + actifs.reduce((s, c) => s + (c.c * c.c) / 2, 0);
    return { temporel, spectre, pN };
  }, [coefs, a0, N, F0, amp, sig, alpha]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#7c3aed] mb-2">🎼 Séries de Fourier</h1>
      <p className="text-[#64748b] text-sm mb-8">
        Tout signal périodique est une somme de sinusoïdes. Ajoute les harmoniques une par une et regarde le signal se reconstruire.
      </p>

      <div className="space-y-5">
        <Card color="#7c3aed" title="Décomposition en série de Fourier"
          formula="x(t) = a₀ + Σ [aₙ·cos(2πnf₀t) + bₙ·sin(2πnf₀t)]"
          explainer={<>
            <p><strong>a₀</strong> est la valeur moyenne du signal. Les coefficients s&apos;obtiennent par intégration sur une période T :</p>
            <p className="font-mono">aₙ = (2/T)∫x(t)·cos(2πnf₀t)dt     bₙ = (2/T)∫x(t)·sin(2πnf₀t)dt</p>
            <p>L&apos;harmonique de rang n a pour fréquence n·f₀ et pour amplitude cₙ = √(aₙ² + bₙ²). Le <strong>spectre d&apos;amplitude</strong> représente cₙ en fonction de la fréquence.</p>
            <p>Raccourcis : si x est <strong>pair</strong> tous les bₙ sont nuls, s&apos;il est <strong>impair</strong> tous les aₙ (et a₀) sont nuls.</p>
            <p>Au voisinage des discontinuités, la reconstruction dépasse d&apos;environ 9 % quel que soit le nombre d&apos;harmoniques : c&apos;est le <strong>phénomène de Gibbs</strong>.</p>
          </>}>
          <div className="grid sm:grid-cols-3 gap-2">
            <div className="sm:col-span-3"><Select label="Signal" value={sig} onChange={setSig} options={SIGNAUX} /></div>
            <Field label="Amplitude A" unit="V" value={A} onChange={setA} />
            <Field label="Fréquence f₀" unit="Hz" value={f0} onChange={setF0} />
            {sig === "impulsions"
              ? <Slider label="Rapport cyclique α" value={alpha} onChange={setAlpha} min={0.05} max={0.95} step={0.05} display={`${Math.round(alpha * 100)} %`} />
              : <div />}
          </div>
          <code className="block text-xs text-[#a78bfa] bg-black/20 rounded-lg p-2 break-words">{info.formule}</code>

          <Slider label="Nombre d'harmoniques N" value={N} onChange={setN} min={1} max={N_SPECTRE} display={`${N} (jusqu'à ${si(N * F0, "Hz")})`} />
          <Plot series={temporel} height={260} xLabel="t (ms)" yLabel="x(t) en V" xFmt={(v) => fmt(v, 3)} />
          <Plot series={spectre} height={200} xLabel="fréquence" yLabel="Spectre d'amplitude cₙ (V)" xMin={-F0 * 0.5} xMax={F0 * (N_SPECTRE + 0.5)} xFmt={(v) => si(v, "Hz", 2)} />
          <Hint>En rose : harmoniques utilisées pour la reconstruction. En gris : celles qui ne sont pas encore ajoutées.</Hint>

          <Divider />
          <Result label="Valeur moyenne a₀" value={`${fmt(a0, 4)} V`} />
          <Result label="Puissance totale ⟨x²⟩ (valeur efficace²)" value={`${fmt(puissance, 4)} V²  →  Veff = ${fmt(Math.sqrt(puissance), 4)} V`} />
          <Result label={`Puissance contenue dans a₀ + ${N} harmonique${N > 1 ? "s" : ""}`} value={`${fmt((pN / puissance) * 100, 4)} %`} accent />
          <Hint>{info.note}</Hint>
        </Card>

        <Card color="#ec4899" title="Tableau des coefficients" formula="cₙ = √(aₙ² + bₙ²)   φₙ = arg(aₙ − j·bₙ)"
          explainer={<p>Ce tableau permet de vérifier les calculs de TD : les coefficients sont calculés numériquement à partir du signal (intégration sur 4096 points), puis comparés à la formule du cours.</p>}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[#64748b] border-b border-[#2a2d3a]">
                  {["n", "fréquence", "aₙ", "bₙ", "cₙ", "cₙ (dB rel. c₁)", "φₙ"].map((h) => <th key={h} className="text-right py-1.5 px-2 font-normal">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#1c1f2a]">
                  <td className="text-right py-1 px-2">0</td><td className="text-right px-2">0 Hz</td>
                  <td className="text-right px-2 text-[#00d4ff]">{fmt(a0, 4)}</td><td className="text-right px-2">—</td>
                  <td className="text-right px-2">{fmt(Math.abs(a0), 4)}</td><td className="text-right px-2">—</td><td className="text-right px-2">—</td>
                </tr>
                {coefs.slice(0, 12).map((c) => {
                  const ref = coefs.find((k) => k.c > 0)?.c ?? 1;
                  return (
                    <tr key={c.n} className={`border-b border-[#1c1f2a] ${c.n <= N ? "" : "opacity-40"}`}>
                      <td className="text-right py-1 px-2">{c.n}</td>
                      <td className="text-right px-2">{si(c.n * F0, "Hz")}</td>
                      <td className="text-right px-2">{fmt(c.a, 4)}</td>
                      <td className="text-right px-2">{fmt(c.b, 4)}</td>
                      <td className="text-right px-2 text-[#ec4899]">{fmt(c.c, 4)}</td>
                      <td className="text-right px-2">{c.c > 0 ? fmt(20 * Math.log10(c.c / ref), 3) : "—"}</td>
                      <td className="text-right px-2">{c.c > 0 ? `${fmt(c.phi, 3)}°` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
