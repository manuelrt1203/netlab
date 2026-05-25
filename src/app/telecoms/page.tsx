"use client";
import { useState } from "react";

/* ─── Shannon ─────────────────────────────────────────────────────── */
function ShannonCalc() {
  const [bw, setBw] = useState("1000000");
  const [snrDb, setSnrDb] = useState("20");
  const snr = Math.pow(10, parseFloat(snrDb) / 10);
  const capacity = parseFloat(bw) * Math.log2(1 + snr);

  return (
    <Card
      color="#ec4899"
      title="Théorème de Shannon"
      formula="C = B · log₂(1 + S/N)"
      explainer={
        <>
          <p>Donne le <strong>débit maximum théorique</strong> qu&apos;on peut atteindre sur un canal bruité, quelles que soient les techniques de codage utilisées.</p>
          <p className="mt-1">Exemple concret : un câble téléphonique avec B = 4 kHz et un SNR de 30 dB ne peut pas dépasser ~40 kbit/s — c&apos;est pourquoi le modem 56k était une limite physique.</p>
        </>
      }
    >
      <Field label="Bande passante B" unit="Hz" value={bw} onChange={setBw}
        hint="Largeur du canal (Hz). Wi-Fi 2.4 GHz ≈ 20 000 000 Hz, câble téléphonique ≈ 4 000 Hz" />
      <Field label="Rapport signal/bruit (SNR)" unit="dB" value={snrDb} onChange={setSnrDb}
        hint="Plus c'est élevé, moins il y a de bruit. 0 dB = signal = bruit. Fibre ≈ 40 dB, Wi-Fi moyen ≈ 20 dB" />
      <Divider />
      <Result label="Capacité maximale" value={`${(capacity / 1e6).toFixed(3)} Mbit/s`} accent />
      <Result label="SNR linéaire (S/N)" value={`${snr.toFixed(0)} fois`} />
      <Hint>Cette capacité est une <em>borne supérieure</em> — en pratique on atteint 50 à 80 % de cette valeur.</Hint>
    </Card>
  );
}

/* ─── Débit ────────────────────────────────────────────────────────── */
function DebitCalc() {
  const [size, setSize] = useState("700");
  const [unit, setUnit] = useState("MB");
  const [time, setTime] = useState("56");
  const units: Record<string, number> = { B: 1, KB: 1e3, MB: 1e6, GB: 1e9 };
  const bytes = parseFloat(size) * (units[unit] || 1);
  const debitBps = (bytes * 8) / parseFloat(time);

  return (
    <Card
      color="#22c55e"
      title="Calcul de débit réel"
      formula="D = (taille × 8) / temps"
      explainer={
        <>
          <p>Calcule le débit effectif observé lors d&apos;un transfert. Utile pour diagnostiquer une connexion ou comparer à la capacité de Shannon.</p>
          <p className="mt-1">Attention : le débit en réseau se mesure en <strong>bits/s</strong> (Mbit/s), pas en octets/s (MB/s). 1 octet = 8 bits.</p>
        </>
      }
    >
      <div className="flex gap-2">
        <div className="flex-1">
          <Field label="Taille du fichier" unit="" value={size} onChange={setSize} hint="" />
        </div>
        <div>
          <label className="text-xs text-[#64748b] mb-1 block">Unité</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}
            className="bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm h-[38px]">
            {Object.keys(units).map((u) => <option key={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <Field label="Temps de transfert" unit="secondes" value={time} onChange={setTime}
        hint="Durée mesurée du téléchargement ou de l'envoi" />
      <Divider />
      <Result label="Débit binaire" value={`${(debitBps / 1e6).toFixed(2)} Mbit/s`} accent />
      <Result label="Débit octet" value={`${(debitBps / 8 / 1e3).toFixed(0)} KB/s`} />
      <Hint>ADSL classique ≈ 8 Mbit/s · Fibre ≈ 1 000 Mbit/s · Wi-Fi N ≈ 150 Mbit/s</Hint>
    </Card>
  );
}

/* ─── Atténuation ──────────────────────────────────────────────────── */
function AttenuationCalc() {
  const [pe, setPe] = useState("100");
  const [pr, setPr] = useState("0.01");
  const att = 10 * Math.log10(parseFloat(pe) / parseFloat(pr));
  const ratio = parseFloat(pe) / parseFloat(pr);

  return (
    <Card
      color="#f59e0b"
      title="Atténuation du signal"
      formula="A (dB) = 10 · log₁₀(Pe / Pr)"
      explainer={
        <>
          <p>Mesure combien un signal <strong>perd en puissance</strong> entre l&apos;émetteur et le récepteur (câble, fibre, air…).</p>
          <p className="mt-1">L&apos;échelle dB est logarithmique : +3 dB = doubler la puissance, −10 dB = diviser par 10, −20 dB = diviser par 100.</p>
        </>
      }
    >
      <Field label="Puissance émise Pe" unit="mW" value={pe} onChange={setPe}
        hint="Puissance envoyée par l'émetteur (routeur, antenne, carte réseau…)" />
      <Field label="Puissance reçue Pr" unit="mW" value={pr} onChange={setPr}
        hint="Puissance mesurée au récepteur après passage dans le médium" />
      <Divider />
      <Result label="Atténuation" value={`${att.toFixed(2)} dB`} accent />
      <Result label="Rapport Pe/Pr" value={`× ${ratio.toFixed(0)}`} />
      <Hint>
        {att < 10 ? "✓ Perte faible (câble court ou fibre)" :
          att < 30 ? "⚠ Perte modérée (Wi-Fi standard)" :
          "✗ Forte perte — signal dégradé, amplificateur nécessaire"}
      </Hint>
    </Card>
  );
}

/* ─── Modulation ───────────────────────────────────────────────────── */
function ModulationCalc() {
  const [M, setM] = useState("16");
  const [fs, setFs] = useState("1000");
  const bitsPerSymbol = Math.log2(parseInt(M));
  const debit = bitsPerSymbol * parseFloat(fs);
  const modNames: Record<string, string> = {
    "2": "BPSK / 2-PSK", "4": "QPSK / 4-QAM", "8": "8-QAM",
    "16": "16-QAM", "32": "32-QAM", "64": "64-QAM", "256": "256-QAM",
  };

  return (
    <Card
      color="#7c3aed"
      title="Modulation QAM / PSK"
      formula="R = log₂(M) × Fs"
      explainer={
        <>
          <p>La modulation encode plusieurs bits dans un seul symbole transmis. Avec M = 16 (16-QAM), on envoie 4 bits à chaque top d&apos;horloge au lieu de 1.</p>
          <p className="mt-1">C&apos;est ce que fait le Wi-Fi 6 avec 1024-QAM pour atteindre plusieurs Gbit/s sur la même bande de fréquences.</p>
        </>
      }
    >
      <div>
        <label className="text-xs text-[#64748b] mb-1 block">Ordre de modulation M</label>
        <select value={M} onChange={(e) => setM(e.target.value)}
          className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm">
          {[2, 4, 8, 16, 32, 64, 256].map((m) => (
            <option key={m} value={m}>{m} — {modNames[String(m)]}</option>
          ))}
        </select>
        <p className="text-[#64748b] text-xs mt-1">Plus M est grand, plus on encode de bits par symbole (mais plus on est sensible au bruit).</p>
      </div>
      <Field label="Fréquence de symbole Fs" unit="symboles/s" value={fs} onChange={setFs}
        hint="Nombre de symboles transmis par seconde (= baud rate)" />
      <Divider />
      <Result label="Bits par symbole" value={`${bitsPerSymbol} bits`} accent />
      <Result label="Débit binaire résultant" value={`${(debit / 1e3).toFixed(2)} kbit/s`} accent />
      <Hint>Wi-Fi 6 utilise 1024-QAM (10 bits/symbole). La 4G utilise 64-QAM.</Hint>
    </Card>
  );
}

/* ─── Bilan de liaison ──────────────────────────────────────────────── */
function BilanCalc() {
  const [pe, setPe] = useState("20");
  const [ge, setGe] = useState("15");
  const [gr, setGr] = useState("10");
  const [pertes, setPertes] = useState("120");
  const [bruit, setBruit] = useState("-100");
  const prDbm = parseFloat(pe) + parseFloat(ge) + parseFloat(gr) - parseFloat(pertes);
  const snrDb = prDbm - parseFloat(bruit);

  return (
    <Card
      color="#00d4ff"
      title="Bilan de liaison (Link Budget)"
      formula="Pr = Pe + Ge + Gr − Pertes"
      explainer={
        <>
          <p>Calcule si un <strong>lien radio</strong> (satellite, 4G, Wi-Fi longue distance) peut fonctionner, en additionnant toutes les pertes et gains du trajet.</p>
          <p className="mt-1">Utilisé pour dimensionner les antennes, calculer la portée d&apos;un émetteur, ou analyser une liaison satellitaire.</p>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Puissance émise Pe" unit="dBm" value={pe} onChange={setPe} hint="" />
        <Field label="Gain antenne émission Ge" unit="dBi" value={ge} onChange={setGe} hint="" />
        <Field label="Gain antenne réception Gr" unit="dBi" value={gr} onChange={setGr} hint="" />
        <Field label="Pertes totales trajet" unit="dB" value={pertes} onChange={setPertes} hint="Pertes espace libre + obstacles" />
        <Field label="Bruit thermique" unit="dBm" value={bruit} onChange={setBruit} hint="Typiquement −100 à −110 dBm" />
      </div>
      <Divider />
      <Result label="Puissance reçue Pr" value={`${prDbm.toFixed(1)} dBm`} accent />
      <Result label="Marge SNR" value={`${snrDb.toFixed(1)} dB`} />
      <Hint>
        {snrDb > 20 ? "✓ Lien solide" : snrDb > 10 ? "⚠ Lien acceptable" : "✗ Lien insuffisant — amplifier ou rapprocher"}
      </Hint>
    </Card>
  );
}

/* ─── UI Components ────────────────────────────────────────────────── */
function Card({ color, title, formula, explainer, children }: {
  color: string; title: string; formula: string; explainer: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="p-5 border-b border-[#2a2d3a]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold" style={{ color }}>{title}</h3>
            <code className="text-xs text-[#64748b] mt-0.5 block">{formula}</code>
          </div>
          <button onClick={() => setOpen((o) => !o)}
            className="shrink-0 px-2 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all">
            {open ? "Fermer" : "C'est quoi ?"}
          </button>
        </div>
        {open && (
          <div className="mt-3 text-xs text-[#94a3b8] leading-5 bg-black/20 rounded-lg p-3">
            {explainer}
          </div>
        )}
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, unit, value, onChange, hint }: {
  label: string; unit: string; value: string; onChange: (v: string) => void; hint: string;
}) {
  return (
    <div>
      <label className="text-xs text-[#64748b] mb-1 block">{label} {unit && <span className="text-[#2a2d3a]">({unit})</span>}</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono outline-none focus:border-[#ec4899] transition-colors" />
      {hint && <p className="text-[#64748b] text-[10px] mt-1 leading-3">{hint}</p>}
    </div>
  );
}

function Result({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#64748b]">{label}</span>
      <span className={`font-bold font-mono text-sm ${accent ? "text-[#ec4899]" : "text-[#e2e8f0]"}`}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[#2a2d3a] my-1" />;
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#64748b] italic mt-1">{children}</p>;
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function TelecomsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-[#ec4899] mb-2">📶 Télécommunications</h1>
      <p className="text-[#64748b] text-sm mb-8">
        Calculateurs de cours — cliquez <strong>&ldquo;C&apos;est quoi ?&rdquo;</strong> sur chaque outil pour comprendre à quoi il sert.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ShannonCalc />
        <DebitCalc />
        <AttenuationCalc />
        <ModulationCalc />
        <div className="md:col-span-2">
          <BilanCalc />
        </div>
      </div>
    </div>
  );
}
