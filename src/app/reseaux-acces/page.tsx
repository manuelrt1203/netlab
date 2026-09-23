"use client";
import { useState } from "react";
import { Card, Field, Select, Result, Divider, Hint, si, fmt, num } from "@/components/ui/Calc";
import Plot, { Series } from "@/components/ui/Plot";

/* ═══ GPON ═══════════════════════════════════════════════════════════ */
// Pertes typiques d'un coupleur optique 1:N (valeurs max usuelles, ITU-T G.671)
const COUPLEURS: Record<string, number> = { "2": 3.7, "4": 7.3, "8": 10.7, "16": 14.1, "32": 17.5, "64": 21 };

const CLASSES = [
  { value: "B+", label: "Classe B+ (13 à 28 dB)", min: 13, max: 28 },
  { value: "C+", label: "Classe C+ (17 à 32 dB)", min: 17, max: 32 },
];

function GPON() {
  const [classe, setClasse] = useState("B+");
  const [n1, setN1] = useState("8"), [n2, setN2] = useState("8");
  const [L, setL] = useState("12");
  const [conn, setConn] = useState("4"), [soud, setSoud] = useState("6");
  const [sens, setSens] = useState<"desc" | "mont">("desc");

  const cl = CLASSES.find((c) => c.value === classe)!;
  const alpha = sens === "desc" ? 0.25 : 0.35; // 1490 nm descendant, 1310 nm montant
  const pCoupl = COUPLEURS[n1] + (n2 === "1" ? 0 : COUPLEURS[n2]);
  const pertes = pCoupl + alpha * num(L) + num(conn) * 0.3 + num(soud) * 0.1;
  const clients = Number(n1) * Number(n2);
  const marge = cl.max - pertes;
  const Lmax = (cl.max - pCoupl - num(conn) * 0.3 - num(soud) * 0.1) / alpha;

  return (
    <Card color="#00d4ff" title="Budget optique d'un réseau GPON (FTTH)" formula="pertes = coupleurs + α·L + connecteurs + soudures   ≤   budget de la classe optique"
      explainer={<>
        <p>Un réseau <strong>PON</strong> (passif) relie un équipement central, l&apos;<strong>OLT</strong>, à de nombreux abonnés, les <strong>ONT/ONU</strong>, à travers une seule fibre divisée par des <strong>coupleurs</strong> passifs, sans aucun élément alimenté sur le trajet. Chaque division par 2 coûte environ 3,5 dB.</p>
        <p>En GPON (ITU-T G.984), le sens descendant utilise 1490 nm à 2,488 Gbit/s, diffusé à tous les ONT et chiffré. Le sens montant utilise 1310 nm à 1,244 Gbit/s, partagé en TDMA : chaque ONT émet dans son intervalle de temps. La classe B+ garantit un budget de 28 dB.</p>
      </>}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Select label="Classe optique" value={classe} onChange={setClasse} options={CLASSES} />
        <Select label="Sens" value={sens} onChange={setSens} options={[{ value: "desc", label: "Descendant 1490 nm (0,25 dB/km)" }, { value: "mont", label: "Montant 1310 nm (0,35 dB/km)" }]} />
        <Field label="Longueur de fibre" unit="km" value={L} onChange={setL} />
        <Select label="Coupleur niveau 1" value={n1} onChange={setN1} options={Object.keys(COUPLEURS).map((k) => ({ value: k, label: `1:${k} (${COUPLEURS[k]} dB)` }))} />
        <Select label="Coupleur niveau 2" value={n2} onChange={setN2} options={[{ value: "1", label: "aucun" }, ...Object.keys(COUPLEURS).map((k) => ({ value: k, label: `1:${k} (${COUPLEURS[k]} dB)` }))]} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Connecteurs" value={conn} onChange={setConn} hint="0,3 dB" />
          <Field label="Soudures" value={soud} onChange={setSoud} hint="0,1 dB" />
        </div>
      </div>
      <Divider />
      <Result label="Taux de partage" value={`1:${clients} abonnés par port OLT`} />
      <Result label="Pertes des coupleurs" value={`${fmt(pCoupl, 3)} dB`} />
      <Result label="Pertes totales" value={`${fmt(pertes, 3)} dB`} accent />
      <Result label={`Marge vis-à-vis de la classe ${classe}`} value={`${fmt(marge, 3)} dB`} accent />
      <Result label="Distance max avec ce découpage" value={Lmax > 0 ? `${fmt(Math.min(Lmax, 20), 3)} km${Lmax > 20 ? " (limitée à 20 km par la norme)" : ""}` : "impossible"} />
      <Result label="Débit moyen par abonné (tous actifs)" value={`↓ ${si(2.488e9 / clients, "bit/s")}   ↑ ${si(1.244e9 / clients, "bit/s")}`} />
      <Hint>{pertes < cl.min ? `⚠ Pertes inférieures au minimum de ${cl.min} dB : le récepteur risque la saturation, il faut ajouter un atténuateur.` : marge >= 3 ? "✓ Budget respecté avec une marge confortable." : marge >= 0 ? "⚠ Budget respecté mais marge faible (vieillissement, réparations)." : "✗ Budget dépassé : réduire le taux de partage ou la distance."}</Hint>
    </Card>
  );
}

/* ═══ xDSL ═══════════════════════════════════════════════════════════ */
// Débits descendants indicatifs (Mbit/s) selon la longueur de ligne en km (paire 0,4 mm, conditions moyennes)
const COURBES: Record<string, { nom: string; couleur: string; pts: [number, number][] }> = {
  adsl: { nom: "ADSL (G.992.1)", couleur: "#f59e0b", pts: [[0, 8], [1, 8], [2, 7], [3, 4.5], [4, 2], [5, 1], [6, 0.5], [7, 0]] },
  adsl2p: { nom: "ADSL2+ (G.992.5)", couleur: "#ec4899", pts: [[0, 24], [0.5, 22], [1, 18], [1.5, 14], [2, 10], [3, 5], [4, 2.2], [5, 1], [6, 0.5], [7, 0]] },
  vdsl2: { nom: "VDSL2 17a (G.993.2)", couleur: "#00d4ff", pts: [[0, 100], [0.3, 90], [0.5, 70], [1, 40], [1.5, 20], [2, 10], [2.5, 6], [3, 4], [4, 1.5], [5, 0]] },
};
const interp = (pts: [number, number][], x: number) => {
  for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return 0;
};

function XDSL() {
  const [d, setD] = useState("1.5");
  const [diam, setDiam] = useState("0.4");
  const km = num(d);
  const attKm = diam === "0.4" ? 13.8 : 10.8; // affaiblissement à 300 kHz, dB/km
  const series: Series[] = Object.values(COURBES).map((c) => ({
    data: Array.from({ length: 141 }, (_, i) => { const x = i * 0.05; return [x, interp(c.pts, x)] as [number, number]; }), color: c.couleur, label: c.nom,
  }));

  return (
    <Card color="#ec4899" title="xDSL : débit selon la longueur de ligne" formula="affaiblissement ≈ 13,8 dB/km à 300 kHz (paire 0,4 mm) — plus la ligne est longue, moins les hautes fréquences passent"
      explainer={<>
        <p>Le xDSL réutilise la paire de cuivre téléphonique entre l&apos;abonné et le <strong>DSLAM</strong> (au central ou dans un sous-répartiteur). Il transmet sur des fréquences bien plus hautes que la voix (jusqu&apos;à 1,1 MHz en ADSL, 2,2 MHz en ADSL2+, 17,6 MHz en VDSL2 17a), découpées en sous-porteuses de 4,3125 kHz (modulation DMT).</p>
        <p>L&apos;affaiblissement du cuivre augmente avec la fréquence et la longueur : les sous-porteuses hautes deviennent inutilisables et le débit chute vite. C&apos;est pourquoi le VDSL2 n&apos;apporte un gain qu&apos;à moins de 1 km environ. Le filtre (splitter) sépare la voix (0–4 kHz) des données.</p>
      </>}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Longueur de la ligne" unit="km" value={d} onChange={setD} />
        <Select label="Diamètre de la paire" value={diam} onChange={setDiam} options={[{ value: "0.4", label: "0,4 mm" }, { value: "0.5", label: "0,5 mm" }]} />
      </div>
      <Plot series={series} height={250} xLabel="longueur de ligne (km)" yLabel="débit descendant (Mbit/s)" xMin={0} xMax={7} yMin={0} markers={[{ x: km, color: "#94a3b8", label: `${fmt(km, 3)} km` }]} />
      <Hint>Débits indicatifs pour une paire de 0,4 mm en conditions moyennes : ils varient avec le bruit, la diaphonie et la qualité de la ligne.</Hint>
      <Divider />
      <Result label="Affaiblissement à 300 kHz" value={`${fmt(attKm * km, 3)} dB`} />
      {Object.values(COURBES).map((c) => (
        <Result key={c.nom} label={c.nom} value={interp(c.pts, km * (diam === "0.5" ? 0.8 : 1)) > 0 ? `≈ ${fmt(interp(c.pts, km * (diam === "0.5" ? 0.8 : 1)), 3)} Mbit/s` : "hors portée"} />
      ))}
    </Card>
  );
}

export default function ReseauxAccesPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#ec4899] mb-2">🏠 Réseaux d&apos;accès</h1>
      <p className="text-[#64748b] text-sm mb-8">Le dernier kilomètre jusqu&apos;à l&apos;abonné : fibre partagée (GPON) et cuivre (xDSL).</p>
      <div className="space-y-5">
        <GPON />
        <XDSL />
      </div>
    </div>
  );
}
