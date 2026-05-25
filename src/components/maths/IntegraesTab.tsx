"use client";
import { useRef, useEffect, useState } from "react";
import * as math from "mathjs";

type Method = "rectangles_g" | "rectangles_d" | "milieu" | "trapezes" | "simpson";

function evalFn(expr: string, x: number): number {
  try { return math.evaluate(expr, { x, e: Math.E, pi: Math.PI }) as number; }
  catch { return NaN; }
}

const METHODS: { id: Method; label: string; formula: string; color: string }[] = [
  { id:"rectangles_g", label:"Rectangles gauches",  formula:"Σ f(xᵢ)·h",            color:"#00d4ff" },
  { id:"rectangles_d", label:"Rectangles droits",   formula:"Σ f(xᵢ₊₁)·h",          color:"#7c3aed" },
  { id:"milieu",       label:"Point milieu",         formula:"Σ f((xᵢ+xᵢ₊₁)/2)·h",   color:"#22c55e" },
  { id:"trapezes",     label:"Trapèzes",             formula:"Σ (f(xᵢ)+f(xᵢ₊₁))/2·h", color:"#f59e0b" },
  { id:"simpson",      label:"Simpson",              formula:"h/3·(f(a)+4·f(m)+f(b)) par paire", color:"#ec4899" },
];

function integrate(expr: string, a: number, b: number, n: number, method: Method): { result: number; steps: string[]; points: { x: number; y: number; w: number }[] } {
  const h = (b - a) / n;
  let result = 0;
  const steps: string[] = [];
  const points: { x: number; y: number; w: number }[] = [];

  if (method === "rectangles_g") {
    for (let i = 0; i < n; i++) {
      const xi = a + i * h;
      const yi = evalFn(expr, xi);
      result += yi * h;
      points.push({ x: xi, y: yi, w: h });
      if (i < 5) steps.push(`i=${i}: f(${xi.toFixed(3)}) × ${h.toFixed(4)} = ${(yi * h).toFixed(6)}`);
    }
    if (n > 5) steps.push(`... (${n - 5} termes supplémentaires) ...`);
  } else if (method === "rectangles_d") {
    for (let i = 1; i <= n; i++) {
      const xi = a + i * h;
      const yi = evalFn(expr, xi);
      result += yi * h;
      points.push({ x: xi - h, y: yi, w: h });
      if (i <= 5) steps.push(`i=${i}: f(${xi.toFixed(3)}) × ${h.toFixed(4)} = ${(yi * h).toFixed(6)}`);
    }
    if (n > 5) steps.push(`... (${n - 5} termes supplémentaires) ...`);
  } else if (method === "milieu") {
    for (let i = 0; i < n; i++) {
      const xm = a + (i + 0.5) * h;
      const ym = evalFn(expr, xm);
      result += ym * h;
      points.push({ x: a + i * h, y: ym, w: h });
      if (i < 5) steps.push(`i=${i}: f(${xm.toFixed(3)}) × ${h.toFixed(4)} = ${(ym * h).toFixed(6)}`);
    }
    if (n > 5) steps.push(`... (${n - 5} termes supplémentaires) ...`);
  } else if (method === "trapezes") {
    for (let i = 0; i < n; i++) {
      const x0 = a + i * h, x1 = a + (i + 1) * h;
      const y0 = evalFn(expr, x0), y1 = evalFn(expr, x1);
      const area = (y0 + y1) / 2 * h;
      result += area;
      points.push({ x: x0, y: (y0 + y1) / 2, w: h });
      if (i < 5) steps.push(`i=${i}: (f(${x0.toFixed(3)}) + f(${x1.toFixed(3)})) / 2 × ${h.toFixed(4)} = ${area.toFixed(6)}`);
    }
    if (n > 5) steps.push(`... (${n - 5} termes supplémentaires) ...`);
  } else { // simpson
    const nSiMP = n % 2 === 0 ? n : n - 1;
    const hS = (b - a) / nSiMP;
    steps.push(`Formule : I ≈ h/3 · [f(a) + 4f(x₁) + 2f(x₂) + 4f(x₃) + … + f(b)]`);
    let sum = evalFn(expr, a) + evalFn(expr, b);
    for (let i = 1; i < nSiMP; i++) {
      const xi = a + i * hS;
      const coeff = i % 2 === 0 ? 2 : 4;
      sum += coeff * evalFn(expr, xi);
      if (i <= 4) steps.push(`  ${coeff}·f(${xi.toFixed(3)}) = ${(coeff * evalFn(expr, xi)).toFixed(6)}`);
    }
    result = (hS / 3) * sum;
    points.push({ x: a, y: evalFn(expr, a), w: hS });
  }

  steps.push(`───────────`);
  steps.push(`Résultat ≈ ${result.toFixed(8)}`);
  return { result, steps, points };
}

export default function IntegraesTab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [expr, setExpr]     = useState("x^2");
  const [a, setA]           = useState(-1);
  const [b, setB]           = useState(2);
  const [n, setN]           = useState(20);
  const [method, setMethod] = useState<Method>("trapezes");
  const [result, setResult] = useState<{ result:number; steps:string[] } | null>(null);

  const methodInfo = METHODS.find(m => m.id === method)!;

  const draw = (points: { x:number; y:number; w:number }[]) => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d"); if(!ctx) return;
    const W = canvas.width, H = canvas.height, PAD = 30;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="#0f1117"; ctx.fillRect(0,0,W,H);

    // Sample function
    const xs: number[] = [], ys: number[] = [];
    const steps2 = (b-a)/200;
    for (let xi = a; xi <= b + steps2/2; xi += steps2) { xs.push(xi); ys.push(evalFn(expr, xi)); }
    const validYs = ys.filter(isFinite);
    if (!validYs.length) return;
    const yMin = Math.min(0, ...validYs), yMax = Math.max(0, ...validYs);
    const yRange = yMax - yMin || 1;
    const toX = (x: number) => PAD + ((x-a)/(b-a))*(W-2*PAD);
    const toY = (y: number) => H-PAD - ((y-yMin)/yRange)*(H-2*PAD);

    // Draw rectangles / trapèzes
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = methodInfo.color;
    points.forEach(p => {
      const px = toX(p.x), pw = toX(p.x + p.w) - px;
      const py = toY(Math.max(0, p.y)), ph = Math.abs(toY(0) - toY(p.y));
      ctx.fillRect(px, py, pw, ph);
    });
    ctx.globalAlpha = 1;

    // Axes
    ctx.strokeStyle="#2a2d3a"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PAD,toY(0)); ctx.lineTo(W-PAD,toY(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD,PAD); ctx.lineTo(PAD,H-PAD); ctx.stroke();

    // Function curve
    ctx.strokeStyle = methodInfo.color; ctx.lineWidth=2;
    ctx.shadowColor = methodInfo.color; ctx.shadowBlur=6;
    ctx.beginPath();
    xs.forEach((x, i) => {
      const py = toY(ys[i]);
      if (!isFinite(py) || py < -200 || py > H+200) { ctx.moveTo(toX(x), py); return; }
      if (i===0) ctx.moveTo(toX(x), py); else ctx.lineTo(toX(x), py);
    });
    ctx.stroke(); ctx.shadowBlur=0;

    // Labels
    ctx.fillStyle="#64748b"; ctx.font="10px monospace";
    ctx.fillText(a.toFixed(1), toX(a)-8, H-10);
    ctx.fillText(b.toFixed(1), toX(b)-8, H-10);
  };

  const compute = () => {
    const { result: res, steps, points } = integrate(expr, a, b, n, method);
    setResult({ result: res, steps });
    requestAnimationFrame(() => draw(points));
  };

  useEffect(() => {
    const pts: { x:number; y:number; w:number }[] = [];
    draw(pts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expr, a, b]);

  const PRESETS = [
    { label:"x²",    expr:"x^2",      a:-1,  b:2 },
    { label:"sin(x)",expr:"sin(x)",   a:0,   b:Math.PI },
    { label:"e^x",   expr:"exp(x)",   a:0,   b:1 },
    { label:"1/x",   expr:"1/x",      a:1,   b:3 },
    { label:"√x",    expr:"sqrt(x)",  a:0,   b:4 },
  ];

  return (
    <div className="space-y-5">
      <div className="glass rounded-xl p-5">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-[#64748b] block mb-1">f(x) =</label>
            <input value={expr} onChange={e=>setExpr(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-[#ec4899]" />
          </div>
          <NField label="a (borne inf.)" value={a} onChange={setA} />
          <NField label="b (borne sup.)" value={b} onChange={setB} />
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          {PRESETS.map(p=>(
            <button key={p.label} onClick={()=>{setExpr(p.expr);setA(p.a);setB(p.b);}}
              className="px-2.5 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded font-mono hover:text-[#ec4899] hover:border-[#ec4899]/30 transition-all">
              f(x) = {p.label}
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="text-xs text-[#64748b] block mb-1">Subdivisions n = <span className="text-[#ec4899] font-mono">{n}</span></label>
          <input type="range" min={2} max={100} value={n} onChange={e=>setN(+e.target.value)} className="w-full accent-[#ec4899]" />
        </div>

        <div className="flex gap-1.5 flex-wrap mb-4">
          {METHODS.map(m=>(
            <button key={m.id} onClick={()=>setMethod(m.id)}
              className="px-3 py-1.5 text-xs rounded-lg border transition-all"
              style={method===m.id?{color:m.color,borderColor:m.color,background:`${m.color}18`}:{borderColor:"#2a2d3a",color:"#64748b"}}>
              {m.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={compute}
            className="px-5 py-2 text-sm font-medium rounded-lg border transition-all"
            style={{color:methodInfo.color,borderColor:methodInfo.color,background:`${methodInfo.color}18`}}>
            ∫ Calculer
          </button>
          <span className="text-xs text-[#64748b] font-mono">{methodInfo.formula}</span>
        </div>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={600} height={280} className="glass rounded-xl w-full" />

      {result && (
        <>
          <div className="glass rounded-xl p-4">
            <div className="text-sm text-[#64748b] mb-1">∫<sub>{a}</sub><sup>{b}</sup> {expr} dx ≈</div>
            <div className="text-3xl font-bold font-mono" style={{color:methodInfo.color}}>
              {result.result.toFixed(8)}
            </div>
          </div>

          <div className="glass rounded-xl p-5">
            <p className="text-xs text-[#64748b] mb-3">Détail des étapes (premiers termes)</p>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {result.steps.map((s,i)=>(
                <div key={i} className={`text-xs font-mono leading-5 ${s.startsWith("─")?"border-t border-[#2a2d3a] pt-2 mt-1":s.startsWith("Résultat")?"text-[#e2e8f0] font-bold":"text-[#94a3b8]"}`}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function NField({ label, value, onChange }: { label:string; value:number; onChange:(v:number)=>void }) {
  return (
    <div>
      <label className="text-xs text-[#64748b] block mb-1">{label}</label>
      <input type="number" value={value} onChange={e=>onChange(parseFloat(e.target.value)||0)}
        className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-[#ec4899]" />
    </div>
  );
}
