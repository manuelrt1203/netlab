"use client";
import { useState } from "react";
import { Card, Field, Select, Result, Divider, Hint, si, fmt, num } from "@/components/ui/Calc";

const C0 = 299_792_458;

/* ─── Convertisseur d'unités logarithmiques ─────────────────────────── */
type UP = "W" | "mW" | "dBW" | "dBm" | "dBµW";
type UV = "V" | "mV" | "µV" | "dBV" | "dBmV" | "dBµV";

const versWatts: Record<UP, (x: number) => number> = {
  W: (x) => x, mW: (x) => x / 1e3,
  dBW: (x) => 10 ** (x / 10), dBm: (x) => 10 ** (x / 10) / 1e3, dBµW: (x) => 10 ** (x / 10) / 1e6,
};
const versVolts: Record<UV, (x: number) => number> = {
  V: (x) => x, mV: (x) => x / 1e3, µV: (x) => x / 1e6,
  dBV: (x) => 10 ** (x / 20), dBmV: (x) => 10 ** (x / 20) / 1e3, dBµV: (x) => 10 ** (x / 20) / 1e6,
};

function Convertisseur() {
  const [p, setP] = useState("13"), [up, setUp] = useState<UP>("dBm");
  const [v, setV] = useState("1"), [uv, setUv] = useState<UV>("mV");
  const [R, setR] = useState("50");

  const W = versWatts[up](num(p));
  const V = versVolts[uv](num(v));
  const Pv = (V * V) / num(R);

  return (
    <Card color="#00d4ff" title="Convertisseur dBm / dBW / dBµV" formula="P(dBm) = 10·log(P / 1 mW)   U(dBµV) = 20·log(U / 1 µV)"
      explainer={<>
        <p>Le décibel exprime un <strong>rapport</strong>. Quand on ajoute une référence, on obtient une valeur absolue : dBm = référence 1 mW, dBW = 1 W, dBµV = 1 µV…</p>
        <p>Pour une <strong>puissance</strong> on utilise 10·log, pour une <strong>tension</strong> 20·log (car P ∝ U²). Repères : 0 dBm = 1 mW, 30 dBm = 1 W, +3 dB ≈ ×2 en puissance, +10 dB = ×10.</p>
        <p>Pour passer d&apos;une tension à une puissance il faut l&apos;impédance : P = U²/R (50 Ω en radio et coaxial, 75 Ω en TV).</p>
      </>}>
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#94a3b8]">Puissance</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Valeur" value={p} onChange={setP} />
            <Select label="Unité" value={up} onChange={setUp} options={(Object.keys(versWatts) as UP[]).map((u) => ({ value: u, label: u }))} />
          </div>
          <Result label="Watts" value={si(W, "W")} accent />
          <Result label="dBW" value={fmt(10 * Math.log10(W))} />
          <Result label="dBm" value={fmt(10 * Math.log10(W * 1e3))} accent />
          <Result label="dBµW" value={fmt(10 * Math.log10(W * 1e6))} />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[#94a3b8]">Tension</p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Valeur" value={v} onChange={setV} />
            <Select label="Unité" value={uv} onChange={setUv} options={(Object.keys(versVolts) as UV[]).map((u) => ({ value: u, label: u }))} />
            <Field label="Impédance" unit="Ω" value={R} onChange={setR} />
          </div>
          <Result label="Volts" value={si(V, "V")} accent />
          <Result label="dBV" value={fmt(20 * Math.log10(V))} />
          <Result label="dBmV" value={fmt(20 * Math.log10(V * 1e3))} />
          <Result label="dBµV" value={fmt(20 * Math.log10(V * 1e6))} accent />
          <Result label={`Puissance sur ${R} Ω`} value={`${si(Pv, "W")} = ${fmt(10 * Math.log10(Pv * 1e3))} dBm`} />
        </div>
      </div>
    </Card>
  );
}

/* ─── Atténuation d'une ligne ───────────────────────────────────────── */
function Attenuation() {
  const [mode, setMode] = useState<"mesure" | "prevision">("mesure");
  const [ve, setVe] = useState("2"), [vs, setVs] = useState("1.3"), [L, setL] = useState("70");
  const [alpha, setAlpha] = useState("6"), [pe, setPe] = useState("0");

  const A = 20 * Math.log10(num(ve) / num(vs));
  const aM = A / num(L);
  const Aprev = (num(alpha) / 100) * num(L);

  return (
    <Card color="#ec4899" title="Atténuation d'un câble" formula="A(dB) = 20·log(Ve / Vs) = 10·log(Pe / Ps)   α = A / L"
      explainer={<>
        <p>Un câble réel perd de l&apos;énergie (effet Joule dans les conducteurs, pertes dans l&apos;isolant). L&apos;atténuation A est positive quand le signal s&apos;affaiblit.</p>
        <p>Le constructeur la donne en <strong>dB/100 m</strong> à une fréquence précise : elle augmente avec la fréquence (effet de peau). C&apos;est la mesure du TP R105 sur les câbles coaxiaux de 70 m et 65 m.</p>
      </>}>
      <Select label="Calcul" value={mode} onChange={setMode} options={[
        { value: "mesure", label: "À partir d'une mesure (Ve, Vs)" },
        { value: "prevision", label: "À partir de la fiche technique (α)" },
      ]} />
      {mode === "mesure" ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Tension entrée Ve" unit="V" value={ve} onChange={setVe} />
            <Field label="Tension sortie Vs" unit="V" value={vs} onChange={setVs} />
            <Field label="Longueur L" unit="m" value={L} onChange={setL} />
          </div>
          <Divider />
          <Result label="Atténuation totale" value={`${fmt(A)} dB`} accent />
          <Result label="Rapport Vs/Ve" value={`${fmt((num(vs) / num(ve)) * 100, 3)} %`} />
          <Result label="Rapport Ps/Pe" value={`${fmt((num(vs) / num(ve)) ** 2 * 100, 3)} %`} />
          <Result label="α linéique" value={`${fmt(aM)} dB/m`} />
          <Result label="α linéique" value={`${fmt(aM * 100)} dB/100 m`} accent />
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Field label="α" unit="dB/100 m" value={alpha} onChange={setAlpha} />
            <Field label="Longueur L" unit="m" value={L} onChange={setL} />
            <Field label="Puissance entrée" unit="dBm" value={pe} onChange={setPe} />
          </div>
          <Divider />
          <Result label="Atténuation totale" value={`${fmt(Aprev)} dB`} accent />
          <Result label="Puissance en sortie" value={`${fmt(num(pe) - Aprev)} dBm`} accent />
          <Result label="Puissance restante" value={`${fmt(10 ** (-Aprev / 10) * 100, 3)} %`} />
          <Result label="Longueur pour perdre 3 dB (moitié)" value={`${fmt(300 / num(alpha))} m`} />
        </>
      )}
    </Card>
  );
}

/* ─── Propagation dans un câble ─────────────────────────────────────── */
const DIELECTRIQUES = [
  { value: "2.25", label: "Polyéthylène (εr ≈ 2,25)" },
  { value: "1.5", label: "Polyéthylène expansé (εr ≈ 1,5)" },
  { value: "2.1", label: "Téflon PTFE (εr ≈ 2,1)" },
  { value: "3.5", label: "PVC (εr ≈ 3,5)" },
  { value: "1", label: "Vide / air (εr = 1)" },
];

function Propagation() {
  const [er, setEr] = useState("2.25"), [L, setL] = useState("70"), [f, setF] = useState("10e6");
  const [D, setD] = useState("2.95"), [d, setDd] = useState("0.9");

  const v = C0 / Math.sqrt(num(er));
  const t = num(L) / v;
  const Z0 = (60 / Math.sqrt(num(er))) * Math.log(num(D) / num(d));

  return (
    <Card color="#22c55e" title="Propagation & impédance caractéristique" formula="v = c / √εr   t = L / v   λ = v / f   Z₀ = (60/√εr)·ln(D/d)"
      explainer={<>
        <p>Dans un câble, l&apos;onde électromagnétique se propage dans l&apos;isolant, moins vite que dans le vide : v = c/√εr. Le rapport v/c est le <strong>coefficient de vélocité</strong> (NVP), environ 0,66 pour du polyéthylène.</p>
        <p>En TP, on envoie une impulsion et on mesure le temps aller-retour sur l&apos;oscilloscope pour retrouver v, puis εr.</p>
        <p>Les « 50 Ω » d&apos;un coaxial sont son <strong>impédance caractéristique</strong> Z₀ : elle ne dépend que de la géométrie (diamètre intérieur du blindage D, diamètre de l&apos;âme d) et de l&apos;isolant, pas de la longueur.</p>
      </>}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Select label="Isolant" value={DIELECTRIQUES.some((x) => x.value === er) ? er : "2.25"} onChange={setEr} options={DIELECTRIQUES} />
        <Field label="εr" value={er} onChange={setEr} />
        <Field label="Longueur L" unit="m" value={L} onChange={setL} />
        <Field label="Fréquence f" unit="Hz" value={f} onChange={setF} hint="ex. 10e6 = 10 MHz" />
        <Field label="Diamètre blindage D" unit="mm" value={D} onChange={setD} />
        <Field label="Diamètre âme d" unit="mm" value={d} onChange={setDd} />
      </div>
      <Divider />
      <Result label="Vitesse de propagation v" value={`${si(v, "m/s")}`} accent />
      <Result label="Coefficient de vélocité v/c" value={fmt(v / C0, 3)} />
      <Result label="Temps de propagation (aller)" value={si(t, "s")} accent />
      <Result label="Temps aller-retour (écho)" value={si(2 * t, "s")} />
      <Result label="Longueur d'onde dans le câble λ" value={si(v / num(f), "m")} />
      <Result label="Longueur d'onde dans le vide λ₀" value={si(C0 / num(f), "m")} />
      <Result label="Impédance caractéristique Z₀" value={`${fmt(Z0, 4)} Ω`} accent />
      <Hint>RG58 : D ≈ 2,95 mm, d ≈ 0,9 mm, polyéthylène ⇒ Z₀ ≈ 50 Ω.</Hint>
    </Card>
  );
}

/* ─── Réflexion & adaptation ────────────────────────────────────────── */
function Reflexion() {
  const [z0, setZ0] = useState("50"), [zl, setZl] = useState("75");
  const Z0 = num(z0), ZL = num(zl);
  const ouvert = !isFinite(ZL) || zl.trim() === "";
  const G = ouvert ? 1 : (ZL - Z0) / (ZL + Z0);
  const ros = Math.abs(G) >= 1 ? Infinity : (1 + Math.abs(G)) / (1 - Math.abs(G));

  return (
    <Card color="#f59e0b" title="Réflexion en bout de ligne" formula="Γ = (Z_L − Z₀) / (Z_L + Z₀)   ROS = (1 + |Γ|) / (1 − |Γ|)"
      explainer={<>
        <p>Si la charge Z_L n&apos;a pas la même impédance que la ligne Z₀, une partie de l&apos;onde est <strong>réfléchie</strong> vers la source. Le coefficient Γ mesure cette part (en tension).</p>
        <p>Cas typiques : charge adaptée (Z_L = Z₀) ⇒ Γ = 0, aucune réflexion. Circuit ouvert ⇒ Γ = +1 (écho de même signe). Court-circuit ⇒ Γ = −1 (écho inversé). C&apos;est ce qu&apos;on observe à l&apos;oscilloscope en TP.</p>
        <p>Le <strong>ROS</strong> (rapport d&apos;ondes stationnaires, VSWR) vaut 1 pour une adaptation parfaite.</p>
      </>}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Impédance de la ligne Z₀" unit="Ω" value={z0} onChange={setZ0} />
        <Field label="Impédance de charge Z_L" unit="Ω" value={zl} onChange={setZl} hint="0 = court-circuit, vide = circuit ouvert" />
      </div>
      <div className="flex flex-wrap gap-2">
        {[["Adaptée", z0], ["Court-circuit", "0"], ["Circuit ouvert", ""], ["75 Ω", "75"]].map(([l, val]) => (
          <button key={l} onClick={() => setZl(val)} className="px-2 py-1 text-xs border border-[#2a2d3a] text-[#94a3b8] rounded hover:text-white">{l}</button>
        ))}
      </div>
      <Divider />
      <Result label="Coefficient de réflexion Γ" value={fmt(G, 4)} accent />
      <Result label="Puissance réfléchie |Γ|²" value={`${fmt(G * G * 100, 3)} %`} />
      <Result label="Puissance transmise" value={`${fmt((1 - G * G) * 100, 3)} %`} />
      <Result label="ROS (VSWR)" value={isFinite(ros) ? fmt(ros, 4) : "∞"} accent />
      <Result label="Affaiblissement de réflexion (return loss)" value={G === 0 ? "∞" : `${fmt(-20 * Math.log10(Math.abs(G)), 4)} dB`} />
      <Hint>{G === 0 ? "✓ Ligne adaptée : toute la puissance est absorbée par la charge." : G > 0 ? "Écho positif (même signe que l'impulsion émise)." : "Écho négatif (impulsion inversée)."}</Hint>
    </Card>
  );
}

/* ─── Onde électromagnétique ────────────────────────────────────────── */
function Onde() {
  const [E0, setE0] = useState("2"), [w, setW] = useState("15e6"), [k, setK] = useState("0.05");
  const f = num(w) / (2 * Math.PI), lam = (2 * Math.PI) / num(k), v = num(w) / num(k);
  const er = (C0 / v) ** 2;

  return (
    <Card color="#a78bfa" title="Onde électromagnétique plane" formula="E(t, y) = E₀·sin(ωt − ky)"
      explainer={<>
        <p>Une onde plane se propageant selon +y s&apos;écrit E₀·sin(ωt − ky) : ω (rad/s) est la pulsation temporelle, k (rad/m) le nombre d&apos;onde. Le signe « − » indique une propagation vers les y croissants.</p>
        <p>On en déduit f = ω/2π, λ = 2π/k et la vitesse v = ω/k = λ·f. Si v = c, l&apos;onde se propage dans le vide. Le champ magnétique associé a pour amplitude B₀ = E₀/v.</p>
      </>}>
      <div className="grid grid-cols-3 gap-2">
        <Field label="E₀" unit="V/m" value={E0} onChange={setE0} />
        <Field label="ω" unit="rad/s" value={w} onChange={setW} />
        <Field label="k" unit="rad/m" value={k} onChange={setK} />
      </div>
      <Divider />
      <Result label="Fréquence f" value={si(f, "Hz")} accent />
      <Result label="Période T" value={si(1 / f, "s")} />
      <Result label="Longueur d'onde λ" value={si(lam, "m")} accent />
      <Result label="Vitesse v = ω/k" value={si(v, "m/s")} />
      <Result label="Amplitude B₀ = E₀/v" value={si(num(E0) / v, "T")} />
      <Hint>
        {Math.abs(v / C0 - 1) < 0.01 ? "v ≈ c : l'onde se propage dans le vide (ou l'air)." :
          v < C0 ? `v < c : l'onde se propage dans un milieu d'εr ≈ ${fmt(er, 3)}.` : "v > c : valeurs incohérentes, vérifie ω et k."}
      </Hint>
    </Card>
  );
}

export default function SupportsTransmissionPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#ec4899] mb-2">🔌 Supports de transmission</h1>
      <p className="text-[#64748b] text-sm mb-8">
        Décibels, atténuation, propagation dans les câbles et adaptation d&apos;impédance — cliquez <strong>&ldquo;C&apos;est quoi ?&rdquo;</strong> pour le rappel de cours.
      </p>
      <div className="space-y-5">
        <Convertisseur />
        <Attenuation />
        <Propagation />
        <Reflexion />
        <Onde />
      </div>
    </div>
  );
}
