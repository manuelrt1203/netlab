"use client";
import { useState } from "react";

function convert(val: string, from: number) {
  const n = parseInt(val, from);
  if (isNaN(n) || n < 0) return null;
  return { bin: n.toString(2), oct: n.toString(8), dec: n.toString(10), hex: n.toString(16).toUpperCase() };
}

function steps(val: string, from: number, to: number): string[] {
  const n = parseInt(val, from);
  if (isNaN(n) || n <= 0 || to === 10) return [];
  const s: string[] = [];
  let x = n;
  while (x > 0) {
    s.push(`${x} ÷ ${to} = ${Math.floor(x/to)}  reste ${x%to}  →  ${(x%to).toString(to).toUpperCase()}`);
    x = Math.floor(x/to);
  }
  return s;
}

const BASES = [
  { label: "Binaire",    base: 2,  color: "#00d4ff", chars: "0-1" },
  { label: "Octal",      base: 8,  color: "#22c55e", chars: "0-7" },
  { label: "Décimal",    base: 10, color: "#f59e0b", chars: "0-9" },
  { label: "Hexadécimal",base: 16, color: "#ec4899", chars: "0-F" },
];

export default function BasesPage() {
  const [value, setValue] = useState("255");
  const [fromBase, setFromBase] = useState(10);
  const [showSteps, setShowSteps] = useState<number | null>(null);

  const res = convert(value, fromBase);
  const outputs: Record<number,string|undefined> = res
    ? {2:res.bin,8:res.oct,10:res.dec,16:res.hex} : {};

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-[#f59e0b] mb-2">🔣 Conversion de bases</h1>
      <p className="text-[#64748b] text-sm mb-6">Entrez un nombre et choisissez sa base source.</p>

      <div className="glass rounded-xl p-5 mb-5">
        <div className="flex gap-3 mb-4">
          <input value={value} onChange={e=>setValue(e.target.value)}
            className="flex-1 bg-[#0f1117] border border-[#2a2d3a] px-4 py-2.5 rounded-lg font-mono text-sm outline-none focus:border-[#f59e0b] transition-colors"
            placeholder="Valeur à convertir" />
        </div>
        <p className="text-xs text-[#64748b] mb-2">Base source :</p>
        <div className="flex gap-2">
          {BASES.map(b=>(
            <button key={b.base} onClick={()=>{setFromBase(b.base);setShowSteps(null);}}
              className="flex-1 py-2 text-xs rounded-lg border transition-all"
              style={fromBase===b.base
                ? {color:b.color,borderColor:b.color,background:`${b.color}18`}
                : {borderColor:"#2a2d3a",color:"#64748b"}}>
              {b.base} — {b.label}
            </button>
          ))}
        </div>
      </div>

      {!res && value && <p className="text-red-400 text-sm mb-4">Valeur invalide pour la base {fromBase}.</p>}

      {res && (
        <div className="space-y-3">
          {BASES.filter(b=>b.base!==fromBase).map(b=>(
            <div key={b.base} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs text-[#64748b]">{b.label} (base {b.base})</span>
                  <div className="font-mono text-lg font-bold mt-0.5" style={{color:b.color}}>
                    {outputs[b.base]}
                  </div>
                </div>
                <button onClick={()=>setShowSteps(showSteps===b.base ? null : b.base)}
                  className="text-xs border border-[#2a2d3a] text-[#64748b] px-2.5 py-1 rounded hover:text-white transition-all">
                  {showSteps===b.base ? "Fermer" : "Étapes"}
                </button>
              </div>
              {showSteps===b.base && (
                <div className="mt-3 pt-3 border-t border-[#2a2d3a]">
                  <p className="text-xs text-[#64748b] mb-2">
                    {b.base===10
                      ? `(${value})₍${fromBase}₎ → on groupe les bits par ${fromBase===2?4:3}`
                      : `Division successive par ${b.base} (lire les restes de bas en haut) :`}
                  </p>
                  {steps(value,fromBase,b.base).length>0
                    ? steps(value,fromBase,b.base).map((s,i)=>(
                        <div key={i} className="text-xs font-mono text-[#e2e8f0] leading-5">{s}</div>
                      ))
                    : <p className="text-xs text-[#64748b] italic">Conversion directe sans étapes intermédiaires.</p>}
                </div>
              )}
            </div>
          ))}

          {/* Table ASCII si décimal */}
          {fromBase===10 && parseInt(value)<=127 && parseInt(value)>=32 && (
            <div className="glass rounded-xl p-4">
              <span className="text-xs text-[#64748b]">Caractère ASCII</span>
              <div className="text-4xl font-bold text-[#7c3aed] mt-1">
                {String.fromCharCode(parseInt(value))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
