"use client";
import { useState } from "react";
import { Card, Field, Select, Result, Divider, Hint, si, fmt, num } from "@/components/ui/Calc";
import Plot, { Series } from "@/components/ui/Plot";

/* ─── Bande passante VoIP ───────────────────────────────────────────── */
const CODECS = [
  { value: "g711", label: "G.711 (MIC, 64 kbit/s)", debit: 64000, mos: "4,1", note: "Qualité téléphone classique, aucune compression." },
  { value: "g722", label: "G.722 (HD voice, 64 kbit/s)", debit: 64000, mos: "4,5", note: "Bande élargie 50–7000 Hz : voix plus naturelle." },
  { value: "g726", label: "G.726 (ADPCM, 32 kbit/s)", debit: 32000, mos: "3,9", note: "Compression par différences : moitié de G.711." },
  { value: "g729", label: "G.729 (CS-ACELP, 8 kbit/s)", debit: 8000, mos: "3,9", note: "Très compressé, idéal pour les liens lents ; payant à l'origine." },
];
const COUCHE2 = [
  { value: "eth", label: "Ethernet (18 o)", o: 18 },
  { value: "eth8021q", label: "Ethernet + 802.1Q (22 o)", o: 22 },
  { value: "aucun", label: "Couche 3 seule", o: 0 },
];

function VoIP() {
  const [codec, setCodec] = useState("g711");
  const [ptime, setPtime] = useState("20");
  const [l2, setL2] = useState("eth");
  const [appels, setAppels] = useState("10");
  const c = CODECS.find((x) => x.value === codec)!;
  const couche2 = COUCHE2.find((x) => x.value === l2)!.o;
  const charge = (c.debit * num(ptime)) / 1000 / 8; // octets de voix par paquet
  const entetes = 12 + 8 + 20 + couche2; // RTP + UDP + IPv4 + L2
  const pps = 1000 / num(ptime);
  const bw = (charge + entetes) * 8 * pps;

  return (
    <Card color="#00d4ff" title="Bande passante d'un appel VoIP" formula="débit = (voix + RTP 12 + UDP 8 + IP 20 + L2) × 8 × paquets/s"
      explainer={<>
        <p>La voix numérisée est découpée en paquets toutes les 20 ms en général (paquétisation). Chaque paquet transporte les échantillons de voix, précédés des en-têtes <strong>RTP</strong> (12 o, numéro de séquence et horodatage), <strong>UDP</strong> (8 o) et <strong>IP</strong> (20 o), puis de la trame Ethernet.</p>
        <p>Avec un codec compressé, les en-têtes pèsent plus lourd que la voix : 8 kbit/s de G.729 deviennent environ 31 kbit/s sur Ethernet. Des paquets plus longs réduisent ce surcoût mais augmentent le délai. Le débit est à compter dans <strong>chaque sens</strong>. La signalisation, elle, passe par SIP (port 5060).</p>
      </>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Select label="Codec" value={codec} onChange={setCodec} options={CODECS} />
        <Field label="Paquétisation" unit="ms" value={ptime} onChange={setPtime} />
        <Select label="Couche 2" value={l2} onChange={setL2} options={COUCHE2} />
        <Field label="Appels simultanés" value={appels} onChange={setAppels} />
      </div>
      <div className="flex h-6 rounded overflow-hidden text-[9px] font-mono">
        {[["L2", couche2, "#475569"], ["IP", 20, "#7c3aed"], ["UDP", 8, "#ec4899"], ["RTP", 12, "#f59e0b"], ["voix", charge, "#22c55e"]].filter(([, o]) => (o as number) > 0).map(([n, o, col]) => (
          <div key={n as string} className="flex items-center justify-center text-[#0f1117] font-bold" style={{ width: `${((o as number) / (charge + entetes)) * 100}%`, background: col as string }}>{n} {fmt(o as number, 3)}</div>
        ))}
      </div>
      <Divider />
      <Result label="Voix par paquet" value={`${fmt(charge, 4)} octets`} />
      <Result label="En-têtes par paquet" value={`${entetes} octets (${fmt((entetes / (charge + entetes)) * 100, 3)} %)`} />
      <Result label="Paquets par seconde (par sens)" value={fmt(pps, 4)} />
      <Result label="Débit d'un appel, par sens" value={si(bw, "bit/s", 4)} accent />
      <Result label={`Débit pour ${appels} appels, par sens`} value={si(bw * num(appels), "bit/s", 4)} accent />
      <Hint>{c.note} MOS typique : {c.mos}/5.</Hint>
    </Card>
  );
}

/* ─── Erlang B ──────────────────────────────────────────────────────── */
/** Probabilité de blocage d'Erlang B, calcul récursif stable : B(0) = 1, B(n) = A·B(n−1) / (n + A·B(n−1)) */
function erlangB(A: number, N: number): number {
  let b = 1;
  for (let n = 1; n <= N; n++) b = (A * b) / (n + A * b);
  return b;
}
function lignesPour(A: number, gos: number): number {
  for (let n = 1; n <= 2000; n++) if (erlangB(A, n) <= gos) return n;
  return NaN;
}

function Erlang() {
  const [appelsH, setAppelsH] = useState("120"), [duree, setDuree] = useState("3");
  const [lignes, setLignes] = useState("10"), [gos, setGos] = useState("1");
  const A = (num(appelsH) * num(duree)) / 60;
  const pb = erlangB(A, Math.round(num(lignes)));
  const n = lignesPour(A, num(gos) / 100);
  const series: Series[] = [{
    data: Array.from({ length: Math.max(10, Math.ceil(A * 2.5)) }, (_, i) => [i + 1, erlangB(A, i + 1) * 100] as [number, number]),
    color: "#ec4899", label: "blocage (%)",
  }];

  return (
    <Card color="#ec4899" title="Dimensionnement : trafic en Erlang" formula="A = (appels à l'heure chargée × durée moyenne) / 3600 s      Erlang B : P(blocage) selon A et N lignes"
      explainer={<>
        <p>Un <strong>Erlang</strong> correspond à une ligne occupée en permanence pendant une heure. Le trafic A de l&apos;heure la plus chargée (heure de pointe) se calcule à partir du nombre d&apos;appels et de leur durée moyenne.</p>
        <p>Avec N lignes (circuits vers l&apos;opérateur, canaux SIP), un appel est refusé si toutes sont occupées. La formule d&apos;<strong>Erlang B</strong> donne cette probabilité de blocage, appelée <strong>taux de perte</strong> ou <strong>GoS</strong>. On vise typiquement 1 % : il faut plus de lignes que le trafic moyen pour absorber les pointes aléatoires.</p>
      </>}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Field label="Appels à l'heure chargée" value={appelsH} onChange={setAppelsH} />
        <Field label="Durée moyenne" unit="min" value={duree} onChange={setDuree} />
        <Field label="Nombre de lignes N" value={lignes} onChange={setLignes} />
        <Field label="GoS visé" unit="%" value={gos} onChange={setGos} />
      </div>
      <Divider />
      <Result label="Trafic offert A" value={`${fmt(A, 4)} Erlang`} accent />
      <Result label={`Probabilité de blocage avec ${lignes} lignes`} value={`${fmt(pb * 100, 3)} %`} accent />
      <Result label="Trafic écoulé" value={`${fmt(A * (1 - pb), 4)} Erlang (${fmt(A * (1 - pb) / Math.round(num(lignes)) * 100, 3)} % d'occupation par ligne)`} />
      <Result label={`Lignes nécessaires pour GoS ≤ ${gos} %`} value={isFinite(n) ? String(n) : "—"} accent />
      <Plot series={series} height={200} xLabel="nombre de lignes N" yLabel="blocage (%)" yMin={0} markers={[{ x: Math.round(num(lignes)), color: "#94a3b8" }]} hLines={[{ y: num(gos), color: "#22c55e", label: `GoS ${gos} %` }]} xFmt={(v) => fmt(v, 3)} />
    </Card>
  );
}

/* ─── Délai de bout en bout ─────────────────────────────────────────── */
function Delai() {
  const [ptime, setPtime] = useState("20"), [codecD, setCodecD] = useState("5"), [dist, setDist] = useState("1000"), [gigue, setGigue] = useState("40"), [reseau, setReseau] = useState("15");
  const prop = num(dist) / 200; // ~200 km/ms dans la fibre
  const total = num(ptime) + num(codecD) + prop + num(reseau) + num(gigue);
  return (
    <Card color="#22c55e" title="Délai de bouche à oreille" formula="délai = paquétisation + codec + propagation + réseau + tampon de gigue   (objectif ITU-T G.114 : < 150 ms)"
      explainer={<p>Au-delà de 150 ms de délai dans un sens, la conversation devient gênante (on se coupe la parole) ; au-delà de 400 ms, elle est inacceptable. Le <strong>tampon de gigue</strong> du récepteur absorbe les variations de délai entre paquets, mais ajoute lui-même du retard.</p>}>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Field label="Paquétisation" unit="ms" value={ptime} onChange={setPtime} />
        <Field label="Codage" unit="ms" value={codecD} onChange={setCodecD} />
        <Field label="Distance" unit="km" value={dist} onChange={setDist} />
        <Field label="Files d'attente" unit="ms" value={reseau} onChange={setReseau} />
        <Field label="Tampon de gigue" unit="ms" value={gigue} onChange={setGigue} />
      </div>
      <Result label="Propagation (≈ 200 km/ms)" value={`${fmt(prop, 3)} ms`} />
      <Result label="Délai total dans un sens" value={`${fmt(total, 4)} ms`} accent />
      <Hint>{total < 150 ? "✓ Conversation naturelle (< 150 ms)." : total < 400 ? "⚠ Acceptable mais perceptible (150–400 ms)." : "✗ Trop de délai (> 400 ms)."}</Hint>
    </Card>
  );
}

export default function TelephoniePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#ec4899] mb-2">☎️ Téléphonie & VoIP</h1>
      <p className="text-[#64748b] text-sm mb-8">Codecs, débit réel d&apos;un appel sur IP, dimensionnement en Erlang et délai de bout en bout.</p>
      <div className="space-y-5">
        <VoIP />
        <Erlang />
        <Delai />
      </div>
    </div>
  );
}
