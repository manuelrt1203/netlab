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

/* ─── Snell-Descartes ───────────────────────────────────────────────── */
const DEG = Math.PI / 180;

function SnellDescartes() {
  const [n1, setN1] = useState("1");
  const [n2, setN2] = useState("1.49");
  const [i1, setI1] = useState("45");

  const a = parseFloat(i1) * DEG, N1 = parseFloat(n1), N2 = parseFloat(n2);
  const s = (N1 / N2) * Math.sin(a);
  const totale = s > 1;
  const i2 = totale ? NaN : Math.asin(s);
  const critique = N1 > N2 ? Math.asin(N2 / N1) : NaN;

  // Schéma : dioptre horizontal au centre, rayon incident depuis le haut-gauche
  const W = 300, H = 200, cx = W / 2, cy = H / 2, R = 85;
  const pIn = { x: cx - R * Math.sin(a), y: cy - R * Math.cos(a) };
  const pRefl = { x: cx + R * Math.sin(a), y: cy - R * Math.cos(a) };
  const pOut = { x: cx + R * Math.sin(i2), y: cy + R * Math.cos(i2) };

  return (
    <Card
      color="#22c55e"
      title="Réfraction — loi de Snell-Descartes"
      formula="n₁·sin(i₁) = n₂·sin(i₂)   angle limite : sin(iL) = n₂/n₁"
      explainer={
        <>
          <p>À l&apos;interface entre deux milieux, un rayon est en partie réfléchi (même angle) et en partie réfracté. Plus l&apos;indice est grand, plus la lumière est lente (v = c/n) et plus le rayon se rapproche de la normale.</p>
          <p className="mt-1">Quand on passe d&apos;un milieu plus réfringent à un milieu moins réfringent (n₁ &gt; n₂), il existe un <strong>angle limite</strong> iL au-delà duquel il n&apos;y a plus de rayon réfracté : c&apos;est la <strong>réflexion totale</strong>, le principe qui guide la lumière dans le cœur d&apos;une fibre.</p>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-4 items-center">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <Field label="n₁ (incident)" unit="" value={n1} onChange={setN1} />
            <Field label="n₂" unit="" value={n2} onChange={setN2} />
            <Field label="Angle i₁" unit="°" value={i1} onChange={setI1} />
          </div>
          <Divider />
          <Result label="Angle réfléchi" value={`${parseFloat(i1).toFixed(2)}°`} />
          <Result label="Angle réfracté i₂" value={totale ? "— (réflexion totale)" : `${(i2 / DEG).toFixed(2)}°`} accent />
          <Result label="Angle limite iL" value={isNaN(critique) ? "aucun (n₁ ≤ n₂)" : `${(critique / DEG).toFixed(2)}°`} />
          <Result label="Vitesse dans le milieu 2" value={`${(299792.458 / N2).toFixed(0)} km/s`} />
          <Hint>{totale ? "✓ Réflexion totale : toute la lumière reste dans le milieu 1." : N1 < N2 ? "Le rayon se rapproche de la normale (milieu 2 plus réfringent)." : "Le rayon s'écarte de la normale."}</Hint>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full bg-[#0f1117] rounded-lg">
          <rect x={0} y={cy} width={W} height={H / 2} fill="#00d4ff" opacity={0.07} />
          <line x1={0} y1={cy} x2={W} y2={cy} stroke="#475569" />
          <line x1={cx} y1={10} x2={cx} y2={H - 10} stroke="#475569" strokeDasharray="3 3" />
          <text x={6} y={cy - 6} fontSize={10} fill="#64748b">n₁ = {n1}</text>
          <text x={6} y={cy + 14} fontSize={10} fill="#64748b">n₂ = {n2}</text>
          <line x1={pIn.x} y1={pIn.y} x2={cx} y2={cy} stroke="#f59e0b" strokeWidth={2.5} />
          <line x1={cx} y1={cy} x2={pRefl.x} y2={pRefl.y} stroke="#f59e0b" strokeWidth={totale ? 2.5 : 1.2} opacity={totale ? 1 : 0.5} />
          {!totale && <line x1={cx} y1={cy} x2={pOut.x} y2={pOut.y} stroke="#22c55e" strokeWidth={2.5} />}
          <text x={pIn.x} y={pIn.y - 4} fontSize={10} fill="#f59e0b">incident</text>
          {!totale && <text x={pOut.x - 20} y={Math.min(pOut.y + 12, H - 4)} fontSize={10} fill="#22c55e">réfracté</text>}
        </svg>
      </div>
    </Card>
  );
}

/* ─── Ouverture numérique, modes, dispersion ─────────────────────────── */
function ModesFibre() {
  const [nc, setNc] = useState("1.5");
  const [ng, setNg] = useState("1.495");
  const [d, setD] = useState("9");
  const [lambda, setLambda] = useState("1.31");
  const [n0, setN0] = useState("1");
  const [gradient, setGradient] = useState(false);

  const Nc = parseFloat(nc), Ng = parseFloat(ng), a = parseFloat(d) / 2, lam = parseFloat(lambda), N0 = parseFloat(n0);
  const ON = Math.sqrt(Nc * Nc - Ng * Ng);
  const delta = (Nc * Nc - Ng * Ng) / (2 * Nc * Nc);
  const thetaA = ON / N0 <= 1 ? Math.asin(ON / N0) / DEG : 90;
  const iL = Math.asin(Ng / Nc) / DEG;
  const V = (2 * Math.PI * a * ON) / lam;
  const mono = V < 2.405;
  const modes = mono ? 1 : Math.round((V * V) / (gradient ? 4 : 2));
  const lambdaC = (2 * Math.PI * a * ON) / 2.405;
  // Dispersion intermodale (ns/km) : saut d'indice n₁Δ/c, gradient n₁Δ²/(8c)
  const dtau = mono ? 0 : ((gradient ? (Nc * delta * delta) / 8 : Nc * delta) / 299792458) * 1e3 * 1e9;
  const bl = dtau > 0 ? 1 / (2 * dtau * 1e-9) : Infinity;

  return (
    <Card
      color="#f59e0b"
      title="Ouverture numérique, modes & dispersion"
      formula="ON = √(nc² − ng²) = n₀·sin(θa)   V = 2πa·ON / λ   monomode si V < 2,405"
      explainer={
        <>
          <p>L&apos;<strong>ouverture numérique</strong> ON mesure la capacité de la fibre à accepter la lumière : seuls les rayons entrant avec un angle inférieur à l&apos;<strong>angle d&apos;acceptance</strong> θa sont guidés par réflexion totale. Elle ne dépend que des indices de cœur et de gaine, pas du milieu extérieur n₀ (seul θa en dépend).</p>
          <p className="mt-1">La <strong>fréquence normalisée</strong> V détermine le nombre de modes. Si V &lt; 2,405, un seul mode se propage (fibre <strong>monomode</strong>). Sinon, le nombre de modes vaut environ V²/2 (saut d&apos;indice) ou V²/4 (gradient d&apos;indice).</p>
          <p className="mt-1">En multimode, les rayons n&apos;ont pas tous le même trajet : l&apos;impulsion s&apos;étale (<strong>dispersion intermodale</strong>), ce qui limite le produit débit × distance. La fibre à gradient d&apos;indice réduit fortement cet effet.</p>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Indice de cœur nc" unit="" value={nc} onChange={setNc} />
        <Field label="Indice de gaine ng" unit="" value={ng} onChange={setNg} />
        <Field label="Diamètre de cœur 2a" unit="µm" value={d} onChange={setD} hint="9 µm monomode, 50 ou 62,5 µm multimode" />
        <Field label="Longueur d'onde λ" unit="µm" value={lambda} onChange={setLambda} hint="0,85 / 1,31 / 1,55 µm" />
        <Field label="Indice extérieur n₀" unit="" value={n0} onChange={setN0} hint="1 pour l'air" />
        <label className="flex items-center gap-2 text-xs text-[#94a3b8] cursor-pointer self-center">
          <input type="checkbox" checked={gradient} onChange={(e) => setGradient(e.target.checked)} /> Fibre à gradient d&apos;indice
        </label>
      </div>
      <Divider />
      <Result label="Ouverture numérique ON" value={ON.toFixed(4)} accent />
      <Result label="Angle d'acceptance θa" value={`${thetaA.toFixed(2)}°  (cône total ${(2 * thetaA).toFixed(2)}°)`} />
      <Result label="Angle limite cœur/gaine" value={`${iL.toFixed(2)}°`} />
      <Result label="Différence d'indice relative Δ" value={`${(delta * 100).toFixed(3)} %`} />
      <Divider />
      <Result label="Fréquence normalisée V" value={V.toFixed(3)} accent />
      <Result label="Régime" value={mono ? "Monomode" : `Multimode (≈ ${modes} modes)`} accent />
      <Result label="Longueur d'onde de coupure λc" value={`${lambdaC.toFixed(3)} µm`} />
      <Hint>{mono ? `La fibre est monomode pour toute λ > ${lambdaC.toFixed(3)} µm.` : `Il faudrait λ > ${lambdaC.toFixed(3)} µm (ou un cœur plus fin) pour être monomode.`}</Hint>
      {!mono && (
        <>
          <Divider />
          <Result label="Dispersion intermodale Δτ" value={`${dtau.toFixed(2)} ns/km`} />
          <Result label="Produit bande × distance ≈ 1/(2Δτ)" value={`${(bl / 1e6).toFixed(1)} Mbit/s·km`} />
        </>
      )}
    </Card>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function FibreOptiquePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🔦 Fibre optique</h1>
      <p className="text-[#64748b] text-sm mb-8">
        Optique géométrique, modes de propagation, bilan de liaison et réflectométrie — cliquez <strong>&ldquo;C&apos;est quoi ?&rdquo;</strong> sur chaque outil pour comprendre à quoi il sert.
      </p>
      <div className="space-y-5">
        <SnellDescartes />
        <ModesFibre />
        <BilanOptique />
        <OTDR />
      </div>
    </div>
  );
}
