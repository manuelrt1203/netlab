"use client";
import { useState } from "react";
import { Card, Select, Result, Divider, Hint, Tabs } from "@/components/ui/Calc";

const nettoie = (s: string) => s.replace(/[^01]/g, "");
const xorBit = (a: string, b: string) => (a === b ? "0" : "1");

/** Affiche une suite de bits cliquables (clic = inversion, pour simuler une erreur de transmission) */
function Bits({ bits, onFlip, couleur, erreurs = [], etiquettes }: {
  bits: string; onFlip?: (i: number) => void; couleur?: (i: number) => string | undefined; erreurs?: number[]; etiquettes?: string[];
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {bits.split("").map((b, i) => (
        <div key={i} className="flex flex-col items-center">
          <button onClick={() => onFlip?.(i)} disabled={!onFlip}
            className="w-8 h-9 rounded-md border font-mono font-bold text-sm transition-all disabled:cursor-default"
            style={{
              color: erreurs.includes(i) ? "#ef4444" : couleur?.(i) ?? "#e2e8f0",
              borderColor: erreurs.includes(i) ? "#ef4444" : couleur?.(i) ? `${couleur(i)}66` : "#2a2d3a",
              background: erreurs.includes(i) ? "#ef444418" : "#0f1117",
            }}>
            {b}
          </button>
          {etiquettes && <span className="text-[9px] text-[#64748b] mt-0.5 font-mono">{etiquettes[i]}</span>}
        </div>
      ))}
    </div>
  );
}

function BitsInput({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="text-xs text-[#64748b] mb-1 block">{label}</label>
      <input value={value} onChange={(e) => onChange(nettoie(e.target.value))} inputMode="numeric"
        className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono tracking-widest outline-none focus:border-[#00d4ff]" />
      {hint && <p className="text-[#64748b] text-[10px] mt-1">{hint}</p>}
    </div>
  );
}

/* ═══ Parité ═════════════════════════════════════════════════════════ */
function Parite() {
  const [data, setData] = useState("1011001");
  const [type, setType] = useState<"paire" | "impaire">("paire");
  const [erreurs, setErreurs] = useState<number[]>([]);

  const uns = data.split("").filter((b) => b === "1").length;
  const bitP = type === "paire" ? uns % 2 : 1 - (uns % 2);
  const emis = data + bitP;
  const recu = emis.split("").map((b, i) => (erreurs.includes(i) ? xorBit(b, "1") : b)).join("");
  const unsRecu = recu.split("").filter((b) => b === "1").length;
  const detecte = type === "paire" ? unsRecu % 2 !== 0 : unsRecu % 2 !== 1;

  const flip = (i: number) => setErreurs((e) => (e.includes(i) ? e.filter((x) => x !== i) : [...e, i]));

  return (
    <Card color="#00d4ff" title="Bit de parité" formula="parité paire : nombre total de 1 pair (bit de parité = XOR de tous les bits)"
      explainer={<>
        <p>On ajoute un bit pour que le nombre total de 1 soit pair (parité paire) ou impair (parité impaire). Le récepteur recompte : si la parité n&apos;est pas respectée, il y a eu une erreur.</p>
        <p>Limite : <strong>deux erreurs</strong> (ou un nombre pair d&apos;erreurs) se compensent et passent inaperçues. Et on sait qu&apos;il y a une erreur, mais pas où : la parité détecte sans corriger.</p>
      </>}>
      <div className="grid sm:grid-cols-2 gap-2">
        <BitsInput label="Données" value={data} onChange={(v) => { setData(v); setErreurs([]); }} />
        <Select label="Type" value={type} onChange={setType} options={[{ value: "paire", label: "Parité paire" }, { value: "impaire", label: "Parité impaire" }]} />
      </div>
      <p className="text-xs text-[#64748b]">Mot émis (bit de parité en orange) :</p>
      <Bits bits={emis} couleur={(i) => (i === data.length ? "#f59e0b" : undefined)} />
      <p className="text-xs text-[#64748b]">Mot reçu — <strong>clique sur un bit pour simuler une erreur</strong> :</p>
      <Bits bits={recu} onFlip={flip} erreurs={erreurs} couleur={(i) => (i === data.length ? "#f59e0b" : undefined)} />
      <Divider />
      <Result label="Nombre de 1 dans les données" value={String(uns)} />
      <Result label="Bit de parité" value={String(bitP)} accent />
      <Result label="Erreurs introduites" value={String(erreurs.length)} />
      <Result label="Verdict du récepteur" value={detecte ? "Erreur détectée" : "Aucune erreur vue"} accent />
      <Hint>{erreurs.length > 0 && !detecte ? `⚠ ${erreurs.length} erreurs se compensent : la parité ne voit rien !` : erreurs.length > 0 ? "✓ Erreur détectée (mais impossible de savoir quel bit corriger)." : "Aucune erreur introduite."}</Hint>
    </Card>
  );
}

/* ═══ CRC ════════════════════════════════════════════════════════════ */
interface Etape { reste: string; diviseur: string; position: number; }

/** Division polynomiale modulo 2, avec les étapes intermédiaires */
function divisionMod2(dividende: string, g: string): { reste: string; etapes: Etape[] } {
  const bits = dividende.split("");
  const etapes: Etape[] = [];
  for (let i = 0; i + g.length <= bits.length; i++) {
    if (bits[i] !== "1") continue;
    for (let j = 0; j < g.length; j++) bits[i + j] = xorBit(bits[i + j], g[j]);
    etapes.push({ reste: bits.join(""), diviseur: g, position: i });
  }
  return { reste: bits.slice(bits.length - (g.length - 1)).join(""), etapes };
}

function polynome(g: string): string {
  const d = g.length - 1;
  const termes = g.split("").map((b, i) => (b === "1" ? d - i : -1)).filter((p) => p >= 0)
    .map((p) => (p === 0 ? "1" : p === 1 ? "x" : `x${String(p).split("").map((c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[+c]).join("")}`));
  return termes.join(" + ") || "0";
}

const POLYS = [
  { value: "10011", label: "x⁴ + x + 1 (cours R305)" },
  { value: "1011", label: "x³ + x + 1 (CRC-3)" },
  { value: "100000111", label: "x⁸ + x² + x + 1 (CRC-8)" },
  { value: "11000000000000101", label: "CRC-16 (x¹⁶ + x¹⁵ + x² + 1)" },
];

function CRC() {
  const [msg, setMsg] = useState("1101011011");
  const [g, setG] = useState("10011");
  const [erreurs, setErreurs] = useState<number[]>([]);

  const valide = g.length >= 2 && g[0] === "1" && msg.length > 0;
  const m = g.length - 1;
  const { reste, etapes } = valide ? divisionMod2(msg + "0".repeat(m), g) : { reste: "", etapes: [] };
  const trame = msg + reste;
  const recu = trame.split("").map((b, i) => (erreurs.includes(i) ? xorBit(b, "1") : b)).join("");
  const verif = valide ? divisionMod2(recu, g).reste : "";
  const ok = !verif.includes("1");
  const flip = (i: number) => setErreurs((e) => (e.includes(i) ? e.filter((x) => x !== i) : [...e, i]));

  return (
    <Card color="#ec4899" title="Code à redondance cyclique (CRC)" formula="CRC = reste de [ M(x) · xᵐ ] ÷ G(x)   (division modulo 2)"
      explainer={<>
        <p>On voit le message comme un polynôme M(x). On lui ajoute m zéros (m = degré du polynôme générateur G), puis on divise par G(x) en <strong>modulo 2</strong> : les soustractions deviennent des XOR, sans retenue.</p>
        <p>Le reste (m bits) est le CRC, ajouté à la fin du message. À la réception, on divise toute la trame par G : un reste nul signifie « pas d&apos;erreur détectée ». Ethernet utilise un CRC-32 (champ FCS de la trame).</p>
      </>}>
      <div className="grid sm:grid-cols-2 gap-2">
        <BitsInput label="Message M" value={msg} onChange={(v) => { setMsg(v); setErreurs([]); }} />
        <Select label="Polynôme générateur G(x)" value={POLYS.some((p) => p.value === g) ? g : "10011"} onChange={(v) => { setG(v); setErreurs([]); }} options={POLYS} />
      </div>
      <BitsInput label="… ou G en binaire" value={g} onChange={(v) => { setG(v); setErreurs([]); }} hint={`G(x) = ${polynome(g)} — degré m = ${m}`} />

      {valide && <>
        <p className="text-xs text-[#64748b]">Division de M·x^{m} = <span className="font-mono text-[#e2e8f0]">{msg}<span className="text-[#f59e0b]">{"0".repeat(m)}</span></span> par G = <span className="font-mono text-[#e2e8f0]">{g}</span> :</p>
        <div className="overflow-x-auto bg-black/30 rounded-lg p-3">
          <pre className="text-xs font-mono leading-5 text-[#94a3b8]">
            {`  ${msg}${"0".repeat(m)}\n`}
            {etapes.map((e, k) => (
              <span key={k}>
                <span className="text-[#ec4899]">{`⊕ ${" ".repeat(e.position)}${e.diviseur}\n`}</span>
                {`  ${" ".repeat(e.position)}${"─".repeat(g.length)}\n`}
                {`  ${e.reste.split("").map((c, i) => (i <= e.position ? " " : c)).join("")}\n`}
              </span>
            ))}
          </pre>
        </div>
        <Result label="Reste = CRC" value={reste} accent />
        <p className="text-xs text-[#64748b]">Trame émise (CRC en orange) :</p>
        <Bits bits={trame} couleur={(i) => (i >= msg.length ? "#f59e0b" : undefined)} />
        <Divider />
        <p className="text-xs text-[#64748b]">Trame reçue — <strong>clique sur des bits pour simuler des erreurs</strong> :</p>
        <Bits bits={recu} onFlip={flip} erreurs={erreurs} couleur={(i) => (i >= msg.length ? "#f59e0b" : undefined)} />
        <Result label="Reste de la division de la trame reçue par G" value={verif} accent />
        <Hint>{ok ? (erreurs.length ? "⚠ Reste nul malgré des erreurs : ce motif d'erreur est un multiple de G(x), il passe inaperçu (très rare en pratique)." : "✓ Reste nul : trame acceptée.") : "✓ Reste non nul : erreur détectée, la trame est rejetée."}</Hint>
      </>}
    </Card>
  );
}

/* ═══ Hamming (7,4) ══════════════════════════════════════════════════ */
// Positions 1..7 : p1 p2 d1 p3 d2 d3 d4 — le bit de parité pᵢ couvre les positions dont le numéro contient le bit 2^(i−1)
const ETIQ = ["p1", "p2", "d1", "p3", "d2", "d3", "d4"];
const EST_PARITE = [true, true, false, true, false, false, false];

function hammingEncode(d: string): string {
  const [d1, d2, d3, d4] = d.split("").map(Number);
  const p1 = d1 ^ d2 ^ d4, p2 = d1 ^ d3 ^ d4, p3 = d2 ^ d3 ^ d4;
  return [p1, p2, d1, p3, d2, d3, d4].join("");
}

function Hamming() {
  const [data, setData] = useState("1011");
  const [erreurs, setErreurs] = useState<number[]>([]);
  const d = (data + "0000").slice(0, 4);
  const code = hammingEncode(d);
  const recu = code.split("").map((b, i) => (erreurs.includes(i) ? xorBit(b, "1") : b)).join("");
  const r = recu.split("").map(Number);
  const s1 = r[0] ^ r[2] ^ r[4] ^ r[6], s2 = r[1] ^ r[2] ^ r[5] ^ r[6], s3 = r[3] ^ r[4] ^ r[5] ^ r[6];
  const syndrome = s3 * 4 + s2 * 2 + s1;
  const corrige = syndrome ? recu.split("").map((b, i) => (i === syndrome - 1 ? xorBit(b, "1") : b)).join("") : recu;
  const dCorr = [2, 4, 5, 6].map((i) => corrige[i]).join("");
  const flip = (i: number) => setErreurs((e) => (e.includes(i) ? e.filter((x) => x !== i) : [...e, i]));

  return (
    <Card color="#22c55e" title="Code de Hamming (7,4)" formula="p1 = d1⊕d2⊕d4   p2 = d1⊕d3⊕d4   p3 = d2⊕d3⊕d4   syndrome = (s3 s2 s1)₂"
      explainer={<>
        <p>On protège 4 bits de données avec 3 bits de parité placés aux positions 1, 2 et 4 (puissances de 2). Chaque bit de parité surveille les positions dont le numéro binaire contient son bit : p1 → positions 1, 3, 5, 7 ; p2 → 2, 3, 6, 7 ; p3 → 4, 5, 6, 7.</p>
        <p>À la réception, on recalcule les 3 contrôles : le <strong>syndrome</strong> (s3 s2 s1) écrit en binaire donne directement la position du bit faux. Distance minimale d = 3 : le code <strong>corrige 1 erreur</strong> ou <strong>détecte 2 erreurs</strong>, mais pas les deux à la fois.</p>
        <p>Rendement : 4/7 ≈ 57 %.</p>
      </>}>
      <BitsInput label="4 bits de données (d1 d2 d3 d4)" value={data} onChange={(v) => { setData(v.slice(0, 4)); setErreurs([]); }} />
      <p className="text-xs text-[#64748b]">Mot de code émis (parités en orange) :</p>
      <Bits bits={code} etiquettes={ETIQ} couleur={(i) => (EST_PARITE[i] ? "#f59e0b" : undefined)} />
      <p className="text-xs text-[#64748b]">Mot reçu — <strong>clique sur un bit pour l&apos;inverser</strong> :</p>
      <Bits bits={recu} onFlip={flip} erreurs={erreurs} etiquettes={ETIQ.map((_, i) => `${i + 1}`)} couleur={(i) => (EST_PARITE[i] ? "#f59e0b" : undefined)} />
      <Divider />
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["s1 = r1⊕r3⊕r5⊕r7", s1], ["s2 = r2⊕r3⊕r6⊕r7", s2], ["s3 = r4⊕r5⊕r6⊕r7", s3]].map(([l, v]) => (
          <div key={l as string} className="bg-black/20 rounded-lg p-2">
            <div className="text-[10px] text-[#64748b] font-mono">{l}</div>
            <div className="font-mono font-bold" style={{ color: v ? "#ef4444" : "#22c55e" }}>{v}</div>
          </div>
        ))}
      </div>
      <Result label="Syndrome (s3 s2 s1)" value={`${s3}${s2}${s1}₂ = ${syndrome}`} accent />
      <Result label="Mot corrigé" value={corrige} />
      <Result label="Données récupérées" value={dCorr} accent />
      <Hint>
        {erreurs.length === 0 ? "Aucune erreur : syndrome nul." :
          erreurs.length === 1 ? `✓ Syndrome = ${syndrome} → le bit en position ${syndrome} est corrigé.` :
          dCorr === d ? "Données correctes par chance." : `✗ ${erreurs.length} erreurs : le code se trompe et « corrige » la position ${syndrome || "—"}, les données sont fausses. Hamming (7,4) ne corrige qu'une seule erreur.`}
      </Hint>
    </Card>
  );
}

/* ═══ Distance de Hamming ════════════════════════════════════════════ */
function Distance() {
  const [a, setA] = useState("1011010"), [b, setB] = useState("1001011");
  const n = Math.max(a.length, b.length);
  const A = a.padEnd(n, "0"), B = b.padEnd(n, "0");
  const diff = A.split("").map((c, i) => (c !== B[i] ? i : -1)).filter((i) => i >= 0);
  const [d, setD] = useState(3);
  return (
    <Card color="#a78bfa" title="Distance de Hamming & capacité d'un code" formula="détecte d − 1 erreurs   corrige ⌊(d − 1) / 2⌋ erreurs"
      explainer={<>
        <p>La distance de Hamming entre deux mots est le nombre de positions où ils diffèrent (le nombre de 1 dans leur XOR). La <strong>distance minimale d</strong> d&apos;un code est la plus petite distance entre deux mots de code distincts.</p>
        <p>Plus d est grand, plus il faut d&apos;erreurs pour transformer un mot valide en un autre mot valide.</p>
      </>}>
      <div className="grid sm:grid-cols-2 gap-2">
        <BitsInput label="Mot A" value={a} onChange={setA} />
        <BitsInput label="Mot B" value={b} onChange={setB} />
      </div>
      <Bits bits={A} erreurs={diff} />
      <Bits bits={B} erreurs={diff} />
      <Result label="Distance d(A, B)" value={String(diff.length)} accent />
      <Divider />
      <p className="text-xs text-[#64748b]">Distance minimale du code (parité : 2, Hamming (7,4) : 3) :</p>
      <div className="flex flex-wrap gap-1">
        {[1, 2, 3, 4, 5, 7].map((v) => (
          <button key={v} onClick={() => setD(v)} className="px-2.5 py-1 text-xs border rounded"
            style={d === v ? { borderColor: "#a78bfa", color: "#a78bfa" } : { borderColor: "#2a2d3a", color: "#64748b" }}>d = {v}</button>
        ))}
      </div>
      <Result label="Erreurs détectables" value={String(d - 1)} />
      <Result label="Erreurs corrigeables" value={String(Math.floor((d - 1) / 2))} accent />
    </Card>
  );
}

type Onglet = "parite" | "crc" | "hamming" | "distance";
const ONGLETS: { id: Onglet; icon: string; label: string; desc: string; color: string }[] = [
  { id: "parite", icon: "⚖️", label: "Parité", desc: "Détection d'une erreur simple", color: "#00d4ff" },
  { id: "crc", icon: "➗", label: "CRC", desc: "Division polynomiale pas à pas", color: "#ec4899" },
  { id: "hamming", icon: "🩹", label: "Hamming (7,4)", desc: "Syndrome et correction", color: "#22c55e" },
  { id: "distance", icon: "📏", label: "Distance", desc: "Capacité de détection/correction", color: "#a78bfa" },
];

export default function CodesCorrecteursPage() {
  const [onglet, setOnglet] = useState<Onglet>("crc");
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#ec4899] mb-2">🛡 Codes détecteurs & correcteurs</h1>
      <p className="text-[#64748b] text-sm mb-6">Protéger les données contre les erreurs de transmission : clique sur les bits reçus pour injecter des erreurs et voir la réaction du code.</p>
      <Tabs tabs={ONGLETS} value={onglet} onChange={setOnglet} />
      {onglet === "parite" && <Parite />}
      {onglet === "crc" && <CRC />}
      {onglet === "hamming" && <Hamming />}
      {onglet === "distance" && <Distance />}
    </div>
  );
}
