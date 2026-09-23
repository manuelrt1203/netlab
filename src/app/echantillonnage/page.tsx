"use client";
import { useMemo, useState } from "react";
import { Card, Field, Slider, Result, Divider, Hint, si, fmt, num } from "@/components/ui/Calc";
import Plot, { Series } from "@/components/ui/Plot";

/* ─── Échantillonnage & repliement ──────────────────────────────────── */
function Echantillonnage() {
  const [f, setF] = useState("1000");
  const [fe, setFe] = useState("3000");
  const F = num(f), Fe = num(fe);
  const valide = F > 0 && Fe > 0;

  const fAlias = valide ? Math.abs(F - Fe * Math.round(F / Fe)) : NaN;
  const ok = Fe > 2 * F;

  const { temporel, spectre } = useMemo(() => {
    if (!valide) return { temporel: [], spectre: [] };
    const duree = 3 / Math.min(F, fAlias || F);
    const N = 900;
    const ts = Array.from({ length: N + 1 }, (_, k) => (k / N) * duree);
    // Phase de l'alias : même valeur aux instants d'échantillonnage (cos pair ⇒ signe sans importance)
    const temporel: Series[] = [
      { data: ts.map((t) => [t * 1000, Math.cos(2 * Math.PI * F * t)]), color: "#475569", label: `signal ${si(F, "Hz")}`, width: 1.5 },
    ];
    if (!ok) temporel.push({ data: ts.map((t) => [t * 1000, Math.cos(2 * Math.PI * fAlias * t)]), color: "#ef4444", label: `alias ${si(fAlias, "Hz")}`, dashed: true, width: 2 });
    const nEch = Math.min(400, Math.floor(duree * Fe));
    temporel.push({ data: Array.from({ length: nEch + 1 }, (_, k) => [(k / Fe) * 1000, Math.cos(2 * Math.PI * F * (k / Fe))]), color: "#00d4ff", stem: true, label: "échantillons" });

    // Spectre de x échantillonné : raies en |±f + k·fe|
    const fMax = Math.max(3 * Fe, 1.5 * F);
    const raies: [number, number][] = [];
    for (let k = -Math.ceil(fMax / Fe) - 1; k <= Math.ceil(fMax / Fe) + 1; k++)
      for (const s of [F, -F]) {
        const r = s + k * Fe;
        if (r >= 0 && r <= fMax) raies.push([r, k === 0 && s > 0 ? 1 : 0.6]);
      }
    const spectre: Series[] = [
      { data: raies.filter(([, a]) => a < 1), color: "#7c3aed", stem: true, label: "copies (motifs répétés à k·fe)" },
      { data: raies.filter(([, a]) => a === 1), color: "#00d4ff", stem: true, label: "spectre d'origine" },
    ];
    return { temporel, spectre };
  }, [F, Fe, fAlias, ok, valide]);

  return (
    <Card color="#00d4ff" title="Échantillonnage & repliement de spectre" formula="Shannon-Nyquist : fe > 2·fmax     f_alias = |f − k·fe|"
      explainer={<>
        <p>Échantillonner, c&apos;est relever la valeur du signal toutes les Te = 1/fe secondes. Le spectre du signal échantillonné est le spectre d&apos;origine <strong>répété tous les fe</strong>.</p>
        <p>Si fe &gt; 2·fmax, les copies ne se chevauchent pas et un filtre passe-bas (coupure fe/2) retrouve le signal exact. Sinon, une copie tombe dans la bande [0, fe/2] : c&apos;est le <strong>repliement</strong> (aliasing), les échantillons décrivent alors une sinusoïde de fréquence plus basse, impossible à distinguer de l&apos;originale.</p>
        <p>En pratique, on place un <strong>filtre anti-repliement</strong> avant le CAN (ex. téléphonie : voix filtrée à 3,4 kHz, fe = 8 kHz).</p>
      </>}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Fréquence du signal f" unit="Hz" value={f} onChange={setF} />
        <Field label="Fréquence d'échantillonnage fe" unit="Hz" value={fe} onChange={setFe} />
      </div>
      {valide && <>
        <Plot series={temporel} height={240} xLabel="t (ms)" xFmt={(v) => fmt(v, 3)} />
        <Plot series={spectre} height={170} xLabel="fréquence" xFmt={(v) => si(v, "Hz", 2)} xMin={0} yMax={1.3}
          markers={[{ x: Fe / 2, color: "#f59e0b", label: "fe/2" }, { x: Fe, color: "#475569", label: "fe" }]} />
        <Divider />
        <Result label="Fréquence de Nyquist fe/2" value={si(Fe / 2, "Hz")} />
        <Result label="fe minimale pour ce signal (2f)" value={si(2 * F, "Hz")} />
        <Result label="Période d'échantillonnage Te" value={si(1 / Fe, "s")} />
        <Result label="Échantillons par période du signal" value={fmt(Fe / F, 3)} />
        <Result label="Fréquence perçue après reconstruction" value={si(ok ? F : fAlias, "Hz")} accent />
        <Hint>{ok ? "✓ Condition de Shannon respectée : le signal est reconstructible." : F * 2 === Fe ? "⚠ Cas limite fe = 2f : selon la phase, les échantillons peuvent tous tomber sur des zéros." : `✗ Repliement : le signal à ${si(F, "Hz")} est vu comme une sinusoïde à ${si(fAlias, "Hz")}.`}</Hint>
      </>}
    </Card>
  );
}

/* ─── Quantification ────────────────────────────────────────────────── */
function Quantification() {
  const [n, setN] = useState(3);
  const [vmin, setVmin] = useState("-5"), [vmax, setVmax] = useState("5");
  const [v, setV] = useState("2.1");

  const lo = num(vmin), hi = num(vmax), niveaux = 2 ** n, q = (hi - lo) / niveaux;
  const code = Math.min(niveaux - 1, Math.max(0, Math.floor((num(v) - lo) / q)));
  const vq = lo + (code + 0.5) * q;

  const series: Series[] = useMemo(() => {
    const N = 600;
    const ts = Array.from({ length: N + 1 }, (_, k) => k / N);
    const amp = (hi - lo) / 2 * 0.95, mid = (hi + lo) / 2;
    const sig = ts.map((t) => mid + amp * Math.sin(2 * Math.PI * t));
    const quant = sig.map((s) => lo + (Math.min(niveaux - 1, Math.max(0, Math.floor((s - lo) / q))) + 0.5) * q);
    return [
      { data: ts.map((t, k) => [t, sig[k]]), color: "#475569", label: "analogique", width: 1.5 },
      { data: ts.map((t, k) => [t, quant[k]]), color: "#22c55e", label: `quantifié ${n} bits` },
      { data: ts.map((t, k) => [t, (quant[k] - sig[k]) * 3 + lo + (hi - lo) * 0.08]), color: "#ef4444", label: "erreur ×3", width: 1 },
    ];
  }, [n, hi, lo, niveaux, q]);

  return (
    <Card color="#22c55e" title="Quantification (CAN)" formula="q = (Vmax − Vmin) / 2ᴺ     RSB_q ≈ 6,02·N + 1,76 dB"
      explainer={<>
        <p>Le convertisseur analogique-numérique (CAN) remplace chaque échantillon par le plus proche des 2ᴺ niveaux disponibles. L&apos;écart entre deux niveaux est le <strong>quantum</strong> q (ou pas de quantification, LSB).</p>
        <p>L&apos;erreur de quantification reste comprise entre −q/2 et +q/2 : elle se comporte comme un bruit. Chaque bit supplémentaire divise q par 2 et améliore le rapport signal/bruit d&apos;environ 6 dB.</p>
      </>}>
      <Slider label="Résolution N" value={n} onChange={setN} min={1} max={16} display={`${n} bits → ${niveaux} niveaux`} />
      <div className="grid grid-cols-3 gap-2">
        <Field label="Vmin" unit="V" value={vmin} onChange={setVmin} />
        <Field label="Vmax" unit="V" value={vmax} onChange={setVmax} />
        <Field label="Tension à convertir" unit="V" value={v} onChange={setV} />
      </div>
      <Plot series={series} height={220} xFmt={(x) => fmt(x, 2)} xLabel="t / T" />
      <Divider />
      <Result label="Quantum q" value={si(q, "V", 4)} accent />
      <Result label="Erreur max ±q/2" value={si(q / 2, "V", 4)} />
      <Result label="RSB de quantification (sinus pleine échelle)" value={`${fmt(6.02 * n + 1.76, 4)} dB`} accent />
      <Divider />
      <Result label={`Code de ${fmt(num(v))} V`} value={`${code} = ${code.toString(2).padStart(n, "0")}₂`} accent />
      <Result label="Tension restituée (milieu du palier)" value={`${fmt(vq, 4)} V`} />
      <Hint>{num(v) < lo || num(v) > hi ? "⚠ Tension hors plage : le CAN sature." : `Erreur commise : ${si(vq - num(v), "V", 3)}.`}</Hint>
    </Card>
  );
}

/* ─── Débit numérique ───────────────────────────────────────────────── */
const PRESETS = [
  { nom: "Téléphonie (G.711)", fe: "8000", n: "8", voies: "1" },
  { nom: "CD audio", fe: "44100", n: "16", voies: "2" },
  { nom: "Studio", fe: "96000", n: "24", voies: "2" },
];

function Debit() {
  const [fe, setFe] = useState("8000"), [n, setN] = useState("8"), [voies, setVoies] = useState("1"), [duree, setDuree] = useState("60");
  const D = num(fe) * num(n) * num(voies);
  return (
    <Card color="#f59e0b" title="Débit d'un signal numérisé (MIC / PCM)" formula="D = fe × N × nombre de voies"
      explainer={<>
        <p>Après échantillonnage et quantification, chaque échantillon est codé sur N bits : c&apos;est la <strong>modulation par impulsions codées</strong> (MIC, ou PCM en anglais).</p>
        <p>La voix téléphonique (bande 300–3400 Hz) est échantillonnée à 8 kHz sur 8 bits : 64 kbit/s, soit un canal B du RNIS ou un intervalle de temps d&apos;une trame E1.</p>
      </>}>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.nom} onClick={() => { setFe(p.fe); setN(p.n); setVoies(p.voies); }}
            className="px-2 py-1 text-xs border border-[#2a2d3a] text-[#94a3b8] rounded hover:text-white">{p.nom}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Field label="fe" unit="Hz" value={fe} onChange={setFe} />
        <Field label="Bits par échantillon N" value={n} onChange={setN} />
        <Field label="Voies" value={voies} onChange={setVoies} />
        <Field label="Durée" unit="s" value={duree} onChange={setDuree} />
      </div>
      <Divider />
      <Result label="Débit" value={si(D, "bit/s", 5)} accent />
      <Result label="Bande max. du signal (fe/2)" value={si(num(fe) / 2, "Hz")} />
      <Result label="Volume pour la durée" value={`${si((D * num(duree)) / 8, "o", 4)} (${si(D * num(duree), "bit", 4)})`} />
    </Card>
  );
}

export default function EchantillonnagePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#06b6d4] mb-2">📶 Échantillonnage & numérisation</h1>
      <p className="text-[#64748b] text-sm mb-8">
        De l&apos;analogique au numérique : théorème de Shannon, repliement, quantification et débit PCM.
      </p>
      <div className="space-y-5">
        <Echantillonnage />
        <Quantification />
        <Debit />
      </div>
    </div>
  );
}
