"use client";
import { useState } from "react";
import Link from "next/link";
import { Card, Field, Select, Result, Divider, Hint, fmt, num } from "@/components/ui/Calc";

interface Z { re: number; im: number }

const mod = (z: Z) => Math.hypot(z.re, z.im);
const arg = (z: Z) => Math.atan2(z.im, z.re);
const deg = (r: number) => (r * 180) / Math.PI;

const add = (a: Z, b: Z): Z => ({ re: a.re + b.re, im: a.im + b.im });
const sub = (a: Z, b: Z): Z => ({ re: a.re - b.re, im: a.im - b.im });
const mul = (a: Z, b: Z): Z => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
const div = (a: Z, b: Z): Z => {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};
const conj = (z: Z): Z => ({ re: z.re, im: -z.im });

/** « 3 + 4j » */
function alg(z: Z, d = 4): string {
  const re = Math.abs(z.re) < 1e-12 ? 0 : z.re, im = Math.abs(z.im) < 1e-12 ? 0 : z.im;
  if (im === 0) return fmt(re, d);
  const imS = `${fmt(Math.abs(im), d)}j`;
  if (re === 0) return im < 0 ? `−${imS}` : imS;
  return `${fmt(re, d)} ${im < 0 ? "−" : "+"} ${imS}`;
}
const expo = (z: Z) => `${fmt(mod(z), 4)}·e^(j·${fmt(arg(z), 4)})`;
const trigo = (z: Z) => `${fmt(mod(z), 4)}·(cos ${fmt(deg(arg(z)), 4)}° + j·sin ${fmt(deg(arg(z)), 4)}°)`;

type Saisie = "alg" | "exp";

function Entree({ nom, color, z, setZ }: { nom: string; color: string; z: Z; setZ: (z: Z) => void }) {
  const [mode, setMode] = useState<Saisie>("alg");
  const [a, setA] = useState(String(z.re)), [b, setB] = useState(String(z.im));
  const [r, setR] = useState(fmt(mod(z))), [t, setT] = useState(fmt(deg(arg(z))));

  const depuisAlg = (na: string, nb: string) => { setA(na); setB(nb); setZ({ re: num(na) || 0, im: num(nb) || 0 }); };
  const depuisExp = (nr: string, nt: string) => {
    setR(nr); setT(nt);
    const th = ((num(nt) || 0) * Math.PI) / 180;
    setZ({ re: (num(nr) || 0) * Math.cos(th), im: (num(nr) || 0) * Math.sin(th) });
  };
  const changerMode = (m: Saisie) => {
    setMode(m);
    if (m === "exp") { setR(fmt(mod(z))); setT(fmt(deg(arg(z)))); } else { setA(fmt(z.re)); setB(fmt(z.im)); }
  };

  return (
    <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: `${color}55` }}>
      <div className="flex items-center justify-between">
        <span className="font-bold font-mono" style={{ color }}>{nom}</span>
        <div className="flex text-[11px] border border-[#2a2d3a] rounded overflow-hidden">
          {(["alg", "exp"] as Saisie[]).map((m) => (
            <button key={m} onClick={() => changerMode(m)} className="px-2 py-1"
              style={mode === m ? { background: `${color}22`, color } : { color: "#64748b" }}>
              {m === "alg" ? "a + jb" : "r·e^(jθ)"}
            </button>
          ))}
        </div>
      </div>
      {mode === "alg" ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Partie réelle a" value={a} onChange={(v) => depuisAlg(v, b)} />
          <Field label="Partie imaginaire b" value={b} onChange={(v) => depuisAlg(a, v)} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Module r" value={r} onChange={(v) => depuisExp(v, t)} />
          <Field label="Argument θ" unit="°" value={t} onChange={(v) => depuisExp(r, v)} />
        </div>
      )}
      <div className="text-[11px] font-mono text-[#94a3b8] space-y-0.5">
        <div>algébrique : {alg(z)}</div>
        <div>exponentielle : {expo(z)}</div>
        <div>trigonométrique : {trigo(z)}</div>
        <div>|{nom}| = {fmt(mod(z))} · arg = {fmt(arg(z))} rad = {fmt(deg(arg(z)))}°</div>
      </div>
    </div>
  );
}

/* ─── Plan complexe (Argand) ────────────────────────────────────────── */
function Argand({ pts }: { pts: { z: Z; color: string; label: string }[] }) {
  const S = 300, C = S / 2;
  const m = Math.max(1, ...pts.map((p) => Math.max(Math.abs(p.z.re), Math.abs(p.z.im)))) * 1.15;
  const k = (C - 16) / m;
  const P = (z: Z) => ({ x: C + z.re * k, y: C - z.im * k });
  const pas = Math.pow(10, Math.floor(Math.log10(m)));
  const grads: number[] = [];
  for (let v = pas; v <= m; v += pas) grads.push(v);

  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[340px] mx-auto bg-[#0f1117] rounded-lg">
      {grads.flatMap((v) => [v, -v]).map((v) => (
        <g key={v}>
          <line x1={C + v * k} y1={8} x2={C + v * k} y2={S - 8} stroke="#1c1f2a" />
          <line x1={8} y1={C - v * k} x2={S - 8} y2={C - v * k} stroke="#1c1f2a" />
        </g>
      ))}
      <line x1={8} y1={C} x2={S - 8} y2={C} stroke="#475569" />
      <line x1={C} y1={8} x2={C} y2={S - 8} stroke="#475569" />
      <text x={S - 12} y={C - 5} fontSize={10} fill="#64748b" textAnchor="end">Re</text>
      <text x={C + 5} y={16} fontSize={10} fill="#64748b">Im</text>
      <text x={C + pas * k} y={C + 12} fontSize={8} fill="#475569" textAnchor="middle">{fmt(pas)}</text>
      {pts.map(({ z, color, label }) => {
        const p = P(z);
        if (!isFinite(p.x) || !isFinite(p.y)) return null;
        const a = arg(z), r = Math.min(22, mod(z) * k);
        return (
          <g key={label}>
            <line x1={C} y1={C} x2={p.x} y2={p.y} stroke={color} strokeWidth={2} />
            <line x1={p.x} y1={p.y} x2={p.x} y2={C} stroke={color} strokeDasharray="2 3" opacity={0.5} />
            <line x1={p.x} y1={p.y} x2={C} y2={p.y} stroke={color} strokeDasharray="2 3" opacity={0.5} />
            {r > 6 && Math.abs(a) > 0.01 && (
              <path d={`M ${C + r} ${C} A ${r} ${r} 0 0 ${a > 0 ? 0 : 1} ${C + r * Math.cos(a)} ${C - r * Math.sin(a)}`}
                fill="none" stroke={color} opacity={0.6} />
            )}
            <circle cx={p.x} cy={p.y} r={4} fill={color} />
            <text x={p.x + 6} y={p.y - 6} fontSize={11} fill={color} fontFamily="monospace">{label}</text>
          </g>
        );
      })}
    </svg>
  );
}

type Op = "add" | "sub" | "mul" | "div";
const OPS: { value: Op; label: string }[] = [
  { value: "add", label: "z₁ + z₂" }, { value: "sub", label: "z₁ − z₂" },
  { value: "mul", label: "z₁ × z₂" }, { value: "div", label: "z₁ ÷ z₂" },
];

function Explication({ op, z1, z2 }: { op: Op; z1: Z; z2: Z }) {
  switch (op) {
    case "add":
    case "sub": {
      const s = op === "add" ? "+" : "−";
      return <>On {op === "add" ? "additionne" : "soustrait"} parties réelles et parties imaginaires séparément :
        ({fmt(z1.re)} {s} {fmt(z2.re)}) + j({fmt(z1.im)} {s} {fmt(z2.im)}). La forme algébrique est la plus pratique ici.</>;
    }
    case "mul":
      return <>En exponentielle, on <strong>multiplie les modules</strong> et on <strong>additionne les arguments</strong> :
        {" "}{fmt(mod(z1))} × {fmt(mod(z2))} = {fmt(mod(z1) * mod(z2))} et {fmt(deg(arg(z1)))}° + {fmt(deg(arg(z2)))}° = {fmt(deg(arg(z1) + arg(z2)))}°.</>;
    case "div":
      return <>En exponentielle, on <strong>divise les modules</strong> et on <strong>soustrait les arguments</strong> :
        {" "}{fmt(mod(z1))} ÷ {fmt(mod(z2))} = {fmt(mod(z1) / mod(z2))} et {fmt(deg(arg(z1)))}° − {fmt(deg(arg(z2)))}° = {fmt(deg(arg(z1) - arg(z2)))}°.
        En algébrique, on multiplie en haut et en bas par le conjugué z̄₂.</>;
  }
}

export default function ComplexesPage() {
  const [z1, setZ1] = useState<Z>({ re: 3, im: 4 });
  const [z2, setZ2] = useState<Z>({ re: 1, im: -1 });
  const [op, setOp] = useState<Op>("mul");

  const res = { add, sub, mul, div }[op](z1, z2);
  const invalide = op === "div" && mod(z2) === 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#a78bfa] mb-2">ⅈ Nombres complexes</h1>
      <p className="text-[#64748b] text-sm mb-8">
        Formes algébrique, trigonométrique et exponentielle, opérations et plan complexe. On note <code className="text-[#94a3b8]">j² = −1</code> comme en électronique.
      </p>

      <div className="space-y-5">
        <Card color="#a78bfa" title="Opérations sur les complexes" formula="z = a + jb = r·e^(jθ)   avec r = √(a² + b²), θ = arg(z)"
          explainer={<>
            <p><strong>Forme algébrique</strong> z = a + jb : a = Re(z), b = Im(z). Pratique pour additionner.</p>
            <p><strong>Forme exponentielle</strong> z = r·e^(jθ) : r = |z| est le module (distance à l&apos;origine), θ l&apos;argument (angle avec l&apos;axe réel). Pratique pour multiplier et diviser.</p>
            <p>Passage de l&apos;une à l&apos;autre : a = r·cos θ, b = r·sin θ et r = √(a² + b²), θ = atan2(b, a). Attention : θ = arctan(b/a) n&apos;est valable que si a &gt; 0, sinon il faut ajouter ou retirer π.</p>
          </>}>
          <div className="grid sm:grid-cols-2 gap-3">
            <Entree nom="z₁" color="#00d4ff" z={z1} setZ={setZ1} />
            <Entree nom="z₂" color="#ec4899" z={z2} setZ={setZ2} />
          </div>
          <div className="grid sm:grid-cols-2 gap-5 items-start">
            <div className="space-y-3">
              <Select label="Opération" value={op} onChange={setOp} options={OPS} />
              {invalide ? <Hint>Division par zéro impossible.</Hint> : (
                <>
                  <Result label="Forme algébrique" value={alg(res)} accent />
                  <Result label="Module |z|" value={fmt(mod(res))} />
                  <Result label="Argument" value={`${fmt(arg(res))} rad = ${fmt(deg(arg(res)))}°`} />
                  <Result label="Forme exponentielle" value={expo(res)} />
                  <p className="text-xs text-[#94a3b8] leading-5 bg-black/20 rounded-lg p-3"><Explication op={op} z1={z1} z2={z2} /></p>
                  <Divider />
                  <Result label="Conjugué z̄₁" value={alg(conj(z1))} />
                  <Result label="z₁ · z̄₁ = |z₁|²" value={fmt(mod(z1) ** 2)} />
                  <Result label="1 / z₁" value={mod(z1) ? alg(div({ re: 1, im: 0 }, z1)) : "—"} />
                </>
              )}
            </div>
            <Argand pts={[
              { z: z1, color: "#00d4ff", label: "z₁" },
              { z: z2, color: "#ec4899", label: "z₂" },
              ...(invalide ? [] : [{ z: res, color: "#f59e0b", label: "z" }]),
            ]} />
          </div>
        </Card>

        <Card color="#22c55e" title="Lien avec l'électronique : impédances complexes" formula="Z_R = R   Z_L = jLω   Z_C = 1/(jCω)"
          explainer={<>
            <p>En régime sinusoïdal, chaque dipôle se comporte comme un nombre complexe : son <strong>module</strong> donne le rapport des amplitudes U/I, et son <strong>argument</strong> le déphasage entre tension et courant.</p>
            <p>Une bobine déphase la tension de +90° par rapport au courant (j), un condensateur de −90° (1/j = −j). C&apos;est pourquoi les complexes sont l&apos;outil de base de la page <Link href="/filtres" className="text-[#22c55e] underline">Électronique & filtres</Link>.</p>
          </>}>
          <ImpedanceRapide />
        </Card>
      </div>
    </div>
  );
}

function ImpedanceRapide() {
  const [R, setR] = useState("100"), [L, setL] = useState("0.1"), [C, setC] = useState("10e-6"), [f, setF] = useState("50");
  const w = 2 * Math.PI * num(f);
  const z: Z = { re: num(R), im: num(L) * w - 1 / (num(C) * w) };
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Field label="R" unit="Ω" value={R} onChange={setR} />
        <Field label="L" unit="H" value={L} onChange={setL} />
        <Field label="C" unit="F" value={C} onChange={setC} hint="ex. 10e-6 = 10 µF" />
        <Field label="f" unit="Hz" value={f} onChange={setF} />
      </div>
      <p className="text-xs text-[#64748b]">RLC série : Z = R + j(Lω − 1/(Cω))</p>
      <Result label="Z" value={`${alg(z)} Ω`} accent />
      <Result label="|Z|" value={`${fmt(mod(z))} Ω`} />
      <Result label="Déphasage φ = arg(Z)" value={`${fmt(deg(arg(z)))}°`} />
      <Hint>{z.im > 0 ? "Circuit inductif : la tension est en avance sur le courant." : z.im < 0 ? "Circuit capacitif : la tension est en retard sur le courant." : "Résonance : circuit purement résistif."}</Hint>
    </>
  );
}
