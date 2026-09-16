"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ─── UI helpers (mêmes conventions que /telecoms) ────────────────────── */
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
        {open && <div className="mt-3 text-xs text-[#94a3b8] leading-5 bg-black/20 rounded-lg p-3">{explainer}</div>}
      </div>
      <div className="p-5 space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, unit, value, onChange, hint }: {
  label: string; unit: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  return (
    <div>
      <label className="text-xs text-[#64748b] mb-1 block">{label} {unit && <span className="text-[#2a2d3a]">({unit})</span>}</label>
      <input type="number" value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono outline-none focus:border-[#00d4ff] transition-colors" />
      {hint && <p className="text-[#64748b] text-[10px] mt-1 leading-3">{hint}</p>}
    </div>
  );
}

function Result({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-[#64748b]">{label}</span>
      <span className={`font-bold font-mono text-sm ${accent ? "text-[#00d4ff]" : "text-[#e2e8f0]"}`}>{value}</span>
    </div>
  );
}
function Divider() { return <div className="border-t border-[#2a2d3a] my-1" />; }
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#64748b] italic mt-1">{children}</p>;
}

/* ─── Bilan de liaison optique ──────────────────────────────────────── */
function BilanOptique() {
  const [pe, setPe] = useState("0");
  const [ps, setPs] = useState("-28");
  const [L, setL] = useState("10");
  const [alpha, setAlpha] = useState("0.35");
  const [nc, setNc] = useState("2");
  const [pc, setPc] = useState("0.5");
  const [ns, setNs] = useState("3");
  const [pj, setPj] = useState("0.1");
  const [marge, setMarge] = useState("3");

  const attenLineique = parseFloat(alpha) * parseFloat(L);
  const pertesConn = parseFloat(nc) * parseFloat(pc);
  const pertesSoud = parseFloat(ns) * parseFloat(pj);
  const attenTotale = attenLineique + pertesConn + pertesSoud + parseFloat(marge);
  const pr = parseFloat(pe) - attenTotale;
  const margeDispo = pr - parseFloat(ps);

  return (
    <Card
      color="#00d4ff"
      title="Bilan de liaison optique"
      formula="Pr = Pe − (α·L + Nc·pc + Ns·pj + marge)"
      explainer={
        <>
          <p>Vérifie qu&apos;une liaison fibre optique fonctionnera : on additionne toutes les pertes du trajet (fibre, connecteurs, soudures) et on vérifie que la puissance qui arrive au récepteur reste au-dessus de sa <strong>sensibilité</strong> minimale.</p>
          <p className="mt-1">α (atténuation linéique) est typiquement ≈ 0,35 dB/km à 1310 nm et ≈ 0,25 dB/km à 1550 nm sur fibre monomode. Chaque connecteur coûte ≈ 0,5 dB, chaque soudure (épissure) ≈ 0,1 dB.</p>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Puissance émise Pe" unit="dBm" value={pe} onChange={setPe} />
        <Field label="Sensibilité récepteur Ps" unit="dBm" value={ps} onChange={setPs} hint="Puissance minimale détectable par le récepteur" />
        <Field label="Longueur de fibre L" unit="km" value={L} onChange={setL} />
        <Field label="Atténuation linéique α" unit="dB/km" value={alpha} onChange={setAlpha} />
        <Field label="Nb connecteurs" unit="" value={nc} onChange={setNc} />
        <Field label="Perte / connecteur" unit="dB" value={pc} onChange={setPc} />
        <Field label="Nb soudures" unit="" value={ns} onChange={setNs} />
        <Field label="Perte / soudure" unit="dB" value={pj} onChange={setPj} />
      </div>
      <Field label="Marge de sécurité" unit="dB" value={marge} onChange={setMarge}
        hint="Marge pour le vieillissement du matériel et les reprises futures (2-3 dB usuel)" />
      <Divider />
      <Result label="Atténuation fibre (α·L)" value={`${attenLineique.toFixed(2)} dB`} />
      <Result label="Pertes connecteurs" value={`${pertesConn.toFixed(2)} dB`} />
      <Result label="Pertes soudures" value={`${pertesSoud.toFixed(2)} dB`} />
      <Result label="Atténuation totale" value={`${attenTotale.toFixed(2)} dB`} accent />
      <Divider />
      <Result label="Puissance reçue Pr" value={`${pr.toFixed(2)} dBm`} accent />
      <Result label="Marge disponible (Pr − Ps)" value={`${margeDispo.toFixed(2)} dB`} accent />
      <Hint>
        {margeDispo > 3 ? "✓ Liaison largement fonctionnelle" :
          margeDispo > 0 ? "⚠ Liaison fonctionnelle mais marge faible" :
          "✗ Liaison non fonctionnelle — trop de pertes, réduire la longueur ou le nombre de connecteurs"}
      </Hint>
    </Card>
  );
}

/* ─── OTDR ──────────────────────────────────────────────────────────── */
type EvtType = "connecteur" | "soudure" | "fin";
interface Evt { id: number; type: EvtType; km: number; loss: number; }

const EVT_LABEL: Record<EvtType, string> = { connecteur: "Connecteur", soudure: "Soudure", fin: "Fin de fibre" };
const EVT_COLOR: Record<EvtType, string> = { connecteur: "#f59e0b", soudure: "#22c55e", fin: "#ef4444" };

const DEFAULT_EVENTS: Evt[] = [
  { id: 1, type: "connecteur", km: 0.1, loss: 0.5 },
  { id: 2, type: "soudure", km: 5, loss: 0.15 },
  { id: 3, type: "connecteur", km: 9.5, loss: 0.6 },
  { id: 4, type: "fin", km: 15, loss: 0 },
];

interface Pt { km: number; power: number; }

function computeTrace(events: Evt[], alpha: number): { pts: Pt[]; maxKm: number } {
  const sorted = [...events].sort((a, b) => a.km - b.km);
  const pts: Pt[] = [{ km: 0, power: 0 }];
  let current = 0, prevKm = 0;

  for (const ev of sorted) {
    const arrival = current - alpha * (ev.km - prevKm);
    pts.push({ km: ev.km, power: arrival });

    if (ev.type === "fin") {
      const spike = arrival + 9;
      pts.push({ km: ev.km + 0.02, power: spike });
      const floor = arrival - 25;
      pts.push({ km: ev.km + 0.15, power: floor });
      pts.push({ km: ev.km + 1.5, power: floor + (Math.random() - 0.5) * 1.5 });
      current = floor; prevKm = ev.km + 1.5;
      break;
    } else if (ev.type === "connecteur") {
      const spike = arrival + 6;
      const after = arrival - ev.loss;
      pts.push({ km: ev.km + 0.02, power: spike });
      pts.push({ km: ev.km + 0.06, power: after });
      current = after; prevKm = ev.km + 0.06;
    } else {
      const after = arrival - ev.loss;
      pts.push({ km: ev.km, power: after });
      current = after; prevKm = ev.km;
    }
  }

  if (!sorted.some((e) => e.type === "fin")) {
    const endKm = prevKm + 3;
    pts.push({ km: endKm, power: current - alpha * (endKm - prevKm) });
  }

  return { pts, maxKm: pts[pts.length - 1].km };
}

function OTDR() {
  const [events, setEvents] = useState<Evt[]>(DEFAULT_EVENTS);
  const [alpha, setAlpha] = useState("0.35");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nextId = useRef(5);

  const { pts, maxKm } = useMemo(() => computeTrace(events, parseFloat(alpha) || 0), [events, alpha]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f1117"; ctx.fillRect(0, 0, W, H);

    const powers = pts.map((p) => p.power);
    const yMax = Math.max(...powers) + 3;
    const yMin = Math.min(...powers) - 3;
    const padL = 42, padB = 22, padT = 10, padR = 10;
    const xOf = (km: number) => padL + (km / maxKm) * (W - padL - padR);
    const yOf = (p: number) => padT + (1 - (p - yMin) / (yMax - yMin)) * (H - padT - padB);

    // grille
    ctx.strokeStyle = "#2a2d3a"; ctx.lineWidth = 1; ctx.font = "10px monospace"; ctx.fillStyle = "#64748b";
    for (let km = 0; km <= maxKm; km += Math.max(1, Math.round(maxKm / 8))) {
      const x = xOf(km);
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
      ctx.fillText(`${km}km`, x - 8, H - 6);
    }
    for (let db = Math.ceil(yMin / 10) * 10; db <= yMax; db += 10) {
      const y = yOf(db);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
      ctx.fillText(`${db}dB`, 2, y + 3);
    }

    // trace
    ctx.strokeStyle = "#00d4ff"; ctx.lineWidth = 2; ctx.shadowColor = "#00d4ff"; ctx.shadowBlur = 4;
    ctx.beginPath();
    pts.forEach((p, i) => { const x = xOf(p.km), y = yOf(p.power); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke(); ctx.shadowBlur = 0;

    // marqueurs d'événements
    events.forEach((ev) => {
      const arrivalPt = pts.find((p) => Math.abs(p.km - ev.km) < 0.001);
      if (!arrivalPt) return;
      const x = xOf(ev.km);
      ctx.strokeStyle = EVT_COLOR[ev.type]; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, H - padB); ctx.stroke();
      ctx.setLineDash([]);
    });
  }, [pts, maxKm, events]);

  useEffect(() => { draw(); }, [draw]);

  const updateEvt = (id: number, patch: Partial<Evt>) =>
    setEvents((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const removeEvt = (id: number) => setEvents((es) => es.filter((e) => e.id !== id));
  const addEvt = () => setEvents((es) => [...es, { id: nextId.current++, type: "soudure", km: Math.max(1, ...es.map((e) => e.km)) + 1, loss: 0.1 }]);

  return (
    <Card
      color="#7c3aed"
      title="Simulateur de trace OTDR (réflectométrie)"
      formula="P(x) = P₀ − α·x − Σ pertes"
      explainer={
        <>
          <p>Un réflectomètre (OTDR) envoie une impulsion lumineuse dans la fibre et mesure la lumière rétrodiffusée. La trace obtenue permet de localiser les défauts : la pente régulière correspond à l&apos;atténuation de la fibre, chaque <strong>connecteur</strong> ou <strong>fin de fibre</strong> produit un pic réfléchi (réflexion de Fresnel), et chaque <strong>soudure</strong> produit une simple chute de puissance sans pic.</p>
          <p className="mt-1">La hauteur des pics est exagérée ici à des fins pédagogiques (l&apos;échelle réelle dépend de la résolution de l&apos;appareil).</p>
        </>
      }
    >
      <Field label="Atténuation linéique α" unit="dB/km" value={alpha} onChange={setAlpha} />
      <canvas ref={canvasRef} width={820} height={260} className="w-full rounded-lg" />
      <div className="space-y-2">
        {events.map((ev) => (
          <div key={ev.id} className="flex flex-wrap items-center gap-2 bg-black/20 rounded-lg p-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: EVT_COLOR[ev.type] }} />
            <select value={ev.type} onChange={(e) => updateEvt(ev.id, { type: e.target.value as EvtType })}
              className="bg-[#0f1117] border border-[#2a2d3a] px-2 py-1 rounded text-xs">
              {(Object.keys(EVT_LABEL) as EvtType[]).map((t) => <option key={t} value={t}>{EVT_LABEL[t]}</option>)}
            </select>
            <input type="number" value={ev.km} onChange={(e) => updateEvt(ev.id, { km: parseFloat(e.target.value) || 0 })}
              className="w-20 bg-[#0f1117] border border-[#2a2d3a] px-2 py-1 rounded text-xs font-mono" placeholder="km" />
            <span className="text-[10px] text-[#64748b]">km</span>
            {ev.type !== "fin" && (
              <>
                <input type="number" value={ev.loss} onChange={(e) => updateEvt(ev.id, { loss: parseFloat(e.target.value) || 0 })}
                  className="w-16 bg-[#0f1117] border border-[#2a2d3a] px-2 py-1 rounded text-xs font-mono" placeholder="dB" />
                <span className="text-[10px] text-[#64748b]">dB</span>
              </>
            )}
            <button onClick={() => removeEvt(ev.id)} className="ml-auto text-xs text-[#ef4444] hover:opacity-70 px-2">✕</button>
          </div>
        ))}
        <button onClick={addEvt} className="w-full py-1.5 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all">
          + Ajouter un événement
        </button>
      </div>
    </Card>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function FibreOptiquePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🔦 Fibre optique</h1>
      <p className="text-[#64748b] text-sm mb-8">
        Bilan de liaison et réflectométrie — cliquez <strong>&ldquo;C&apos;est quoi ?&rdquo;</strong> sur chaque outil pour comprendre à quoi il sert.
      </p>
      <div className="space-y-5">
        <BilanOptique />
        <OTDR />
      </div>
    </div>
  );
}
