"use client";
import { useState } from "react";
import { Card, Field, Result, Divider, Hint, si, fmt, num } from "@/components/ui/Calc";
import Plot, { Series } from "@/components/ui/Plot";

const C0 = 299_792_458;
const K_DBW = -228.6; // constante de Boltzmann en dBW/K/Hz

/* ─── Affaiblissement en espace libre ───────────────────────────────── */
function FSPL() {
  const [f, setF] = useState("12000"), [d, setD] = useState("38000");
  const L = 20 * Math.log10(num(d)) + 20 * Math.log10(num(f)) + 32.44;
  return (
    <Card color="#00d4ff" title="Affaiblissement en espace libre" formula="A(dB) = 20·log(d_km) + 20·log(f_MHz) + 32,44   =   20·log(4πd/λ)"
      explainer={<>
        <p>Une onde émise se répartit sur une sphère de plus en plus grande : la puissance reçue par une antenne diminue avec le carré de la distance. Cette perte, sans obstacle ni atmosphère, est l&apos;<strong>affaiblissement en espace libre</strong>.</p>
        <p>Doubler la distance ou la fréquence ajoute 6 dB de pertes. Un satellite géostationnaire est à 35 786 km au-dessus de l&apos;équateur, soit environ 38 000 km d&apos;une station en France.</p>
      </>}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Fréquence" unit="MHz" value={f} onChange={setF} />
        <Field label="Distance" unit="km" value={d} onChange={setD} />
      </div>
      <div className="flex flex-wrap gap-2">
        {[["Wi-Fi 2,4 GHz, 100 m", "2400", "0.1"], ["GSM 900, 5 km", "900", "5"], ["Satellite GEO bande Ku", "12000", "38000"], ["GPS L1, orbite MEO", "1575.42", "20200"]].map(([l, ff, dd]) => (
          <button key={l} onClick={() => { setF(ff); setD(dd); }} className="px-2 py-1 text-xs border border-[#2a2d3a] text-[#94a3b8] rounded hover:text-white">{l}</button>
        ))}
      </div>
      <Divider />
      <Result label="Longueur d'onde λ" value={si(C0 / (num(f) * 1e6), "m")} />
      <Result label="Affaiblissement" value={`${fmt(L, 4)} dB`} accent />
      <Result label="Temps de propagation (aller)" value={si((num(d) * 1e3) / C0, "s")} />
    </Card>
  );
}

/* ─── Antenne parabolique ───────────────────────────────────────────── */
function Antenne() {
  const [D, setD] = useState("0.6"), [f, setF] = useState("12"), [eta, setEta] = useState("0.65");
  const lam = C0 / (num(f) * 1e9);
  const G = 10 * Math.log10(num(eta) * (Math.PI * num(D) / lam) ** 2);
  return (
    <Card color="#22c55e" title="Gain d'une antenne parabolique" formula="G = η·(πD/λ)²   →   G(dBi) = 10·log(G)     θ₋₃dB ≈ 70·λ/D (en degrés)"
      explainer={<>
        <p>Une parabole concentre l&apos;énergie dans une direction : son gain, en dBi, compare sa puissance rayonnée dans l&apos;axe à celle d&apos;une antenne isotrope. Il augmente avec le diamètre et la fréquence.</p>
        <p>Plus le gain est élevé, plus le faisceau est étroit (angle d&apos;ouverture à −3 dB) : il faut alors pointer la parabole avec précision. Le rendement η vaut typiquement 0,55 à 0,7.</p>
      </>}>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Diamètre D" unit="m" value={D} onChange={setD} />
        <Field label="Fréquence" unit="GHz" value={f} onChange={setF} />
        <Field label="Rendement η" value={eta} onChange={setEta} />
      </div>
      <Divider />
      <Result label="Longueur d'onde" value={si(lam, "m")} />
      <Result label="Gain" value={`${fmt(G, 4)} dBi`} accent />
      <Result label="Ouverture à −3 dB" value={`${fmt((70 * lam) / num(D), 3)}°`} />
    </Card>
  );
}

/* ─── Bilan de liaison satellite ────────────────────────────────────── */
function BilanSat() {
  const [pire, setPire] = useState("52"), [f, setF] = useState("11.5"), [d, setD] = useState("38000");
  const [D, setDiam] = useState("0.6"), [eta, setEta] = useState("0.65"), [atm, setAtm] = useState("1");
  const [T, setT] = useState("150"), [B, setB] = useState("33"), [cnMin, setCnMin] = useState("8");

  const lam = C0 / (num(f) * 1e9);
  const Gr = 10 * Math.log10(num(eta) * (Math.PI * num(D) / lam) ** 2);
  const L = 20 * Math.log10(num(d)) + 20 * Math.log10(num(f) * 1e3) + 32.44;
  const C = num(pire) - L - num(atm) + Gr;
  const GT = Gr - 10 * Math.log10(num(T));
  const N = K_DBW + 10 * Math.log10(num(T)) + 10 * Math.log10(num(B) * 1e6);
  const CN = C - N;

  return (
    <Card color="#f59e0b" title="Bilan de liaison descendante satellite" formula="C = PIRE − A_esp.libre − A_atm + G_r      N = k·T·B      C/N = C − N (dB)"
      explainer={<>
        <p>La <strong>PIRE</strong> (puissance isotrope rayonnée équivalente) est la puissance d&apos;émission augmentée du gain de l&apos;antenne du satellite. Pour Astra 19,2°E (TNTSat, Canal+…), elle vaut environ 50 à 53 dBW sur la France.</p>
        <p>Le bruit du récepteur vaut N = k·T·B, avec k la constante de Boltzmann (−228,6 dBW/K/Hz), T la température de bruit du système (en kelvins) et B la bande du canal. Le facteur de mérite <strong>G/T</strong> résume la qualité de la station de réception.</p>
        <p>La réception est correcte si C/N dépasse le seuil du démodulateur : environ 5 à 10 dB en DVB-S2 selon la modulation et le codage.</p>
      </>}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Field label="PIRE du satellite" unit="dBW" value={pire} onChange={setPire} />
        <Field label="Fréquence" unit="GHz" value={f} onChange={setF} />
        <Field label="Distance" unit="km" value={d} onChange={setD} />
        <Field label="Diamètre parabole" unit="m" value={D} onChange={setDiam} />
        <Field label="Rendement" value={eta} onChange={setEta} />
        <Field label="Pertes atmosphériques" unit="dB" value={atm} onChange={setAtm} hint="pluie : jusqu'à 5 dB en bande Ku" />
        <Field label="Température de bruit T" unit="K" value={T} onChange={setT} />
        <Field label="Bande du canal B" unit="MHz" value={B} onChange={setB} />
        <Field label="C/N minimal requis" unit="dB" value={cnMin} onChange={setCnMin} />
      </div>
      <Divider />
      <Result label="Affaiblissement en espace libre" value={`${fmt(L, 4)} dB`} />
      <Result label="Gain de la parabole" value={`${fmt(Gr, 4)} dBi`} />
      <Result label="Puissance reçue C" value={`${fmt(C, 4)} dBW  (${fmt(C + 30, 4)} dBm)`} accent />
      <Result label="Facteur de mérite G/T" value={`${fmt(GT, 4)} dB/K`} />
      <Result label="Puissance de bruit N" value={`${fmt(N, 4)} dBW`} />
      <Result label="Rapport C/N" value={`${fmt(CN, 4)} dB`} accent />
      <Result label="Marge" value={`${fmt(CN - num(cnMin), 3)} dB`} accent />
      <Hint>{CN - num(cnMin) >= 3 ? "✓ Réception correcte, même avec un peu de pluie." : CN >= num(cnMin) ? "⚠ Réception possible, mais sensible aux intempéries." : "✗ C/N insuffisant : prendre une parabole plus grande ou un LNB moins bruyant."}</Hint>
    </Card>
  );
}

/* ─── Mélangeur ─────────────────────────────────────────────────────── */
function Melangeur() {
  const [fs, setFs] = useState("11.5"), [fol, setFol] = useState("10.6");
  const s = num(fs), o = num(fol);
  const fi = Math.abs(s - o), somme = s + o, image = o > s ? o + fi : o - fi;
  const series: Series[] = [
    { data: [[s, 1]], color: "#00d4ff", stem: true, label: "signal RF" },
    { data: [[o, 1]], color: "#f59e0b", stem: true, label: "oscillateur local" },
    { data: [[fi, 0.7], [somme, 0.7]], color: "#22c55e", stem: true, label: "sortie |fs − fOL| et fs + fOL" },
    { data: [[image, 0.4]], color: "#ef4444", stem: true, label: "fréquence image" },
  ];
  return (
    <Card color="#a78bfa" title="Mélangeur & changement de fréquence" formula="cos(a)·cos(b) = ½[cos(a − b) + cos(a + b)]   →   f_sortie = |fs − fOL| et fs + fOL"
      explainer={<>
        <p>Un mélangeur multiplie le signal reçu par une sinusoïde produite par un <strong>oscillateur local</strong> (OL). D&apos;après la formule de trigonométrie, on obtient deux fréquences : la différence et la somme. Un filtre garde la <strong>fréquence intermédiaire</strong> FI (souvent la différence), plus facile à transporter et à traiter.</p>
        <p>Exemple : le LNB d&apos;une parabole utilise un OL à 9,75 GHz (bande basse) ou 10,6 GHz (bande haute) pour ramener la bande Ku (10,7–12,75 GHz) entre 950 et 2150 MHz dans le câble coaxial.</p>
        <p>Attention à la <strong>fréquence image</strong>, située symétriquement de l&apos;autre côté de l&apos;OL : elle donnerait la même FI et doit être éliminée par un filtre avant le mélangeur.</p>
      </>}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Signal fs" unit="GHz" value={fs} onChange={setFs} />
        <Field label="Oscillateur local fOL" unit="GHz" value={fol} onChange={setFol} />
      </div>
      <div className="flex flex-wrap gap-2">
        {[["LNB bande basse", "11", "9.75"], ["LNB bande haute", "12", "10.6"], ["Radio FM (FI 10,7 MHz)", "0.1", "0.1107"]].map(([l, a, b]) => (
          <button key={l} onClick={() => { setFs(a); setFol(b); }} className="px-2 py-1 text-xs border border-[#2a2d3a] text-[#94a3b8] rounded hover:text-white">{l}</button>
        ))}
      </div>
      <Plot series={series} height={200} xMin={0} xMax={somme * 1.08} yMax={1.3} xLabel="fréquence (GHz)" xFmt={(v) => fmt(v, 3)} />
      <Divider />
      <Result label="Fréquence intermédiaire |fs − fOL|" value={si(fi * 1e9, "Hz", 4)} accent />
      <Result label="Fréquence somme fs + fOL" value={si(somme * 1e9, "Hz", 4)} />
      <Result label="Fréquence image (donne la même FI)" value={si(image * 1e9, "Hz", 4)} />
    </Card>
  );
}

/* ─── Multiplexage FDM ──────────────────────────────────────────────── */
function FDM() {
  const [n, setN] = useState("5"), [b, setB] = useState("4"), [g, setG] = useState("1"), [f0, setF0] = useState("100");
  const N = Math.max(1, Math.min(40, Math.round(num(n))));
  const porteuses = Array.from({ length: N }, (_, i) => num(f0) + num(b) / 2 + i * (num(b) + num(g)));
  const series: Series[] = porteuses.map((p, i) => ({
    data: [[p - num(b) / 2, 0], [p - num(b) / 2, 1], [p + num(b) / 2, 1], [p + num(b) / 2, 0]] as [number, number][],
    color: ["#00d4ff", "#ec4899", "#22c55e", "#f59e0b", "#a78bfa"][i % 5], label: i < 5 ? `canal ${i + 1}` : undefined,
  }));
  const total = N * num(b) + (N - 1) * num(g);
  return (
    <Card color="#06b6d4" title="Multiplexage fréquentiel (FDM)" formula="bande totale = N·B + (N − 1)·garde     porteuse k = f₀ + B/2 + k·(B + garde)"
      explainer={<p>Le multiplexage fréquentiel transmet plusieurs signaux en même temps sur un même support, en décalant chacun sur sa propre porteuse (à l&apos;aide d&apos;un mélangeur). Des <strong>bandes de garde</strong> entre les canaux laissent de la marge aux filtres du démultiplexeur. C&apos;est le principe de la radio FM, de la TNT et des transpondeurs satellites.</p>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Field label="Nombre de canaux" value={n} onChange={setN} />
        <Field label="Bande par canal" unit="kHz" value={b} onChange={setB} />
        <Field label="Bande de garde" unit="kHz" value={g} onChange={setG} />
        <Field label="Début de bande f₀" unit="kHz" value={f0} onChange={setF0} />
      </div>
      <Plot series={series} height={170} xLabel="fréquence (kHz)" yMin={0} yMax={1.4} xFmt={(v) => fmt(v, 4)} />
      <Result label="Bande totale occupée" value={`${fmt(total, 4)} kHz`} accent />
      <Result label="Efficacité (part utile)" value={`${fmt(((N * num(b)) / total) * 100, 3)} %`} />
      <Result label="Porteuses" value={porteuses.slice(0, 8).map((p) => fmt(p, 4)).join(" · ") + (N > 8 ? " …" : "") + " kHz"} />
    </Card>
  );
}

export default function TelecomsSpatialesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#ec4899] mb-2">🛰 Télécoms spatiales</h1>
      <p className="text-[#64748b] text-sm mb-8">Propagation en espace libre, antennes, bilan de liaison satellite, mélangeur et multiplexage fréquentiel.</p>
      <div className="space-y-5">
        <FSPL />
        <Antenne />
        <BilanSat />
        <Melangeur />
        <FDM />
      </div>
    </div>
  );
}
