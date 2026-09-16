"use client";
import { useMemo, useRef, useEffect, useState, useCallback } from "react";

/* ─── Types ─────────────────────────────────────────────────────────── */
type Scheme = "nrzl" | "nrzi" | "manchester" | "manchester-diff" | "miller" | "rz" | "ami";
interface Seg { t0: number; t1: number; v: number; }

const SCHEMES: { id: Scheme; label: string; color: string }[] = [
  { id: "nrzl",            label: "NRZ-L",                 color: "#00d4ff" },
  { id: "nrzi",            label: "NRZ-I",                 color: "#22c55e" },
  { id: "rz",              label: "RZ unipolaire",         color: "#a78bfa" },
  { id: "ami",             label: "Bipolaire (AMI)",       color: "#ef4444" },
  { id: "manchester",      label: "Manchester",            color: "#f59e0b" },
  { id: "manchester-diff", label: "Manchester différentiel", color: "#ec4899" },
  { id: "miller",          label: "Miller",                color: "#7c3aed" },
];

const EXPLAIN: Record<Scheme, { formula: string; text: string }> = {
  nrzl: {
    formula: "1 → +V constant · 0 → −V constant",
    text: "Le plus simple : chaque bit est représenté par un niveau constant pendant toute sa durée. Défaut majeur : une longue suite de bits identiques ne produit aucune transition, donc aucune information d'horloge (pas auto-synchronisant), et le signal a une composante continue non nulle.",
  },
  nrzi: {
    formula: "1 → transition en début de bit · 0 → pas de transition",
    text: "Variante de NRZ où l'information est codée par une transition (et non un niveau). Un '1' inverse le niveau, un '0' le laisse inchangé. Utilisé en USB et FDDI. Toujours pas auto-synchronisant sur de longues suites de '0'.",
  },
  rz: {
    formula: "1 → +V puis retour à 0 à mi-bit · 0 → reste à 0",
    text: "Le signal 'retourne à zéro' au milieu de chaque bit à 1, ce qui ajoute une transition supplémentaire par bit à 1 et facilite la récupération d'horloge, au prix d'une bande passante plus large (2x plus de transitions possibles).",
  },
  ami: {
    formula: "0 → 0V · 1 → alternance +V / −V",
    text: "Alternate Mark Inversion : les '0' restent à 0V, et chaque '1' inverse sa polarité par rapport au '1' précédent. Composante continue nulle, et une erreur de polarité (deux '1' consécutifs de même signe) permet de détecter facilement une erreur de transmission. Utilisé sur les liens T1/E1.",
  },
  manchester: {
    formula: "1 → transition montante à mi-bit · 0 → transition descendante à mi-bit",
    text: "Une transition a lieu obligatoirement au milieu de chaque bit : le signal est auto-synchronisant (l'horloge se déduit du signal) et sans composante continue. Utilisé par Ethernet 10BASE-T. Coût : la bande passante nécessaire double par rapport au NRZ.",
  },
  "manchester-diff": {
    formula: "0 → transition en début de bit · 1 → pas de transition en début de bit (+ transition à mi-bit toujours)",
    text: "Variante différentielle : comme Manchester, une transition a toujours lieu à mi-bit (auto-synchronisation), mais l'information est portée par la présence ou l'absence d'une transition en début de bit. Utilisé par Token Ring (IEEE 802.5), plus robuste à une inversion de polarité des fils.",
  },
  miller: {
    formula: "1 → transition à mi-bit · 0 → pas de transition (sauf entre deux 0 consécutifs : transition en fin de bit)",
    text: "Aussi appelé 'delay modulation'. Réduit le nombre de transitions par rapport à Manchester (donc bande passante plus faible) tout en gardant une horloge récupérable, en garantissant une transition au moins tous les 2 bits. Utilisé historiquement sur disques magnétiques.",
  },
};

/* ─── Encodage : construit une liste de segments (t0,t1,valeur) ──────── */
function encode(bits: string, scheme: Scheme): Seg[] {
  const segs: Seg[] = [];
  let level = -1;        // niveau courant (nrzi, manchester-diff, miller)
  let lastPolarity = -1; // dernière polarité utilisée (ami)
  let prevBit: string | null = null;

  for (let i = 0; i < bits.length; i++) {
    const b = bits[i];
    let firstHalf = 0, secondHalf = 0;

    switch (scheme) {
      case "nrzl": {
        const v = b === "1" ? 1 : -1;
        firstHalf = v; secondHalf = v;
        break;
      }
      case "nrzi": {
        if (b === "1") level = -level;
        firstHalf = level; secondHalf = level;
        break;
      }
      case "rz": {
        firstHalf = b === "1" ? 1 : 0;
        secondHalf = 0;
        break;
      }
      case "ami": {
        if (b === "0") { firstHalf = 0; secondHalf = 0; }
        else { lastPolarity = -lastPolarity; firstHalf = lastPolarity; secondHalf = lastPolarity; }
        break;
      }
      case "manchester": {
        firstHalf = b === "1" ? -1 : 1;
        secondHalf = b === "1" ? 1 : -1;
        break;
      }
      case "manchester-diff": {
        const start = b === "0" ? -level : level;
        firstHalf = start; secondHalf = -start;
        level = secondHalf;
        break;
      }
      case "miller": {
        const start = (b === "0" && prevBit === "0") ? -level : level;
        if (b === "1") { firstHalf = start; secondHalf = -start; }
        else { firstHalf = start; secondHalf = start; }
        level = secondHalf;
        break;
      }
    }

    segs.push({ t0: i, t1: i + 0.5, v: firstHalf });
    segs.push({ t0: i + 0.5, t1: i + 1, v: secondHalf });
    prevBit = b;
  }
  return segs;
}

function windowSegs(all: Seg[], start: number, span: number): Seg[] {
  return all
    .filter((s) => s.t1 > start && s.t0 < start + span)
    .map((s) => ({ t0: Math.max(s.t0, start) - start, t1: Math.min(s.t1, start + span) - start, v: s.v }));
}

function randomBits(n: number): string {
  return Array.from({ length: n }, () => (Math.random() < 0.5 ? "0" : "1")).join("");
}

/* ─── Dessin ────────────────────────────────────────────────────────── */
function drawStep(ctx: CanvasRenderingContext2D, segs: Seg[], totalT: number, W: number, H: number, color: string, alpha: number, lineWidth: number) {
  if (segs.length === 0) return;
  const mid = H / 2, amp = H * 0.34;
  const xOf = (t: number) => (t / totalT) * W;
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = lineWidth;
  segs.forEach((s, idx) => {
    const y = mid - s.v * amp;
    if (idx === 0) ctx.moveTo(xOf(s.t0), y);
    else ctx.lineTo(xOf(s.t0), y);
    ctx.lineTo(xOf(s.t1), y);
  });
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function CodageLignePage() {
  const [bits, setBits] = useState("01101001");
  const [scheme, setScheme] = useState<Scheme>("manchester");
  const [open, setOpen] = useState(false);
  const [longBits, setLongBits] = useState(() => randomBits(48));

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const eyeCanvasRef = useRef<HTMLCanvasElement>(null);

  const active = SCHEMES.find((s) => s.id === scheme)!;
  const segs = useMemo(() => encode(bits || "0", scheme), [bits, scheme]);

  const longSegs = useMemo(() => encode(longBits, scheme), [longBits, scheme]);

  const drawMain = useCallback(() => {
    const canvas = mainCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f1117"; ctx.fillRect(0, 0, W, H);

    const n = bits.length || 1;
    const xOf = (t: number) => (t / n) * W;

    // grille des bits
    ctx.strokeStyle = "#2a2d3a"; ctx.lineWidth = 1;
    ctx.font = "11px monospace"; ctx.textAlign = "center";
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(xOf(i), 12); ctx.lineTo(xOf(i), H - 12); ctx.stroke();
      if (i < n) {
        ctx.fillStyle = "#64748b";
        ctx.fillText(bits[i] ?? "", xOf(i + 0.5), H - 2);
      }
    }
    // ligne zéro
    ctx.strokeStyle = "#2a2d3a";
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();

    drawStep(ctx, segs, n, W, H, active.color, 1, 2.5);
    ctx.textAlign = "left";
  }, [bits, segs, active.color]);

  const drawEye = useCallback(() => {
    const canvas = eyeCanvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f1117"; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#2a2d3a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();

    const span = 2; // 2 bits par fenêtre
    const totalBits = longBits.length;
    for (let start = 0; start <= totalBits - span; start++) {
      const w = windowSegs(longSegs, start, span);
      drawStep(ctx, w, span, W, H, active.color, 0.18, 1.5);
    }
  }, [longBits, longSegs, active.color]);

  useEffect(() => { drawMain(); }, [drawMain]);
  useEffect(() => { drawEye(); }, [drawEye]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold mb-2" style={{ color: active.color }}>🔡 Codage en ligne</h1>
      <p className="text-[#64748b] text-sm mb-6">
        Visualisez comment une suite de bits se transforme en signal physique selon différents codes numériques, et observez le diagramme de l&apos;œil qui en résulte.
      </p>

      {/* Saisie */}
      <div className="glass rounded-xl p-4 mb-4">
        <label className="text-xs text-[#64748b] mb-1 block">Suite de bits</label>
        <div className="flex gap-2">
          <input
            value={bits}
            onChange={(e) => setBits(e.target.value.replace(/[^01]/g, "").slice(0, 24))}
            className="flex-1 bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono outline-none focus:border-[#00d4ff] transition-colors tracking-widest"
            placeholder="ex: 01101001"
          />
          <button onClick={() => setBits(randomBits(10))}
            className="px-3 py-2 text-xs border border-[#2a2d3a] text-[#64748b] rounded-lg hover:text-white transition-all">
            🎲 Aléatoire
          </button>
        </div>
        <p className="text-[10px] text-[#64748b] mt-1">24 bits maximum, uniquement 0 et 1.</p>
      </div>

      {/* Sélecteur de code */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {SCHEMES.map((s) => (
          <button key={s.id} onClick={() => setScheme(s.id)}
            className="p-2.5 rounded-xl border text-left transition-all"
            style={scheme === s.id
              ? { borderColor: s.color, background: `${s.color}14`, boxShadow: `0 0 14px ${s.color}22` }
              : { borderColor: "#2a2d3a", background: "rgba(26,29,39,0.6)" }}>
            <div className="text-xs font-semibold" style={{ color: scheme === s.id ? s.color : "#94a3b8" }}>{s.label}</div>
          </button>
        ))}
      </div>

      {/* Signal */}
      <div className="glass rounded-xl overflow-hidden mb-4">
        <div className="p-4 border-b border-[#2a2d3a] flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold" style={{ color: active.color }}>{active.label}</h3>
            <code className="text-xs text-[#64748b] mt-0.5 block">{EXPLAIN[scheme].formula}</code>
          </div>
          <button onClick={() => setOpen((o) => !o)}
            className="shrink-0 px-2 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all">
            {open ? "Fermer" : "C'est quoi ?"}
          </button>
        </div>
        {open && (
          <div className="mx-4 mt-3 text-xs text-[#94a3b8] leading-5 bg-black/20 rounded-lg p-3">
            {EXPLAIN[scheme].text}
          </div>
        )}
        <div className="p-4">
          <canvas ref={mainCanvasRef} width={900} height={180} className="w-full rounded-lg" />
        </div>
      </div>

      {/* Diagramme de l'œil */}
      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2d3a] flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold" style={{ color: active.color }}>Diagramme de l&apos;œil</h3>
            <p className="text-[#64748b] text-xs mt-0.5">Superposition de {longBits.length - 1} fenêtres de 2 bits sur une suite aléatoire.</p>
          </div>
          <button onClick={() => setLongBits(randomBits(48))}
            className="shrink-0 px-2 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all">
            ↺ Régénérer
          </button>
        </div>
        <div className="p-4 flex justify-center">
          <canvas ref={eyeCanvasRef} width={400} height={220} className="rounded-lg" style={{ maxWidth: "100%" }} />
        </div>
        <p className="text-[10px] text-[#64748b] px-4 pb-4 leading-4">
          Plus l&apos;œil est <strong>ouvert</strong> (grand espace vide au centre), plus il est facile pour le récepteur de distinguer un 0 d&apos;un 1 malgré le bruit — c&apos;est un indicateur classique de qualité de transmission.
        </p>
      </div>
    </div>
  );
}
