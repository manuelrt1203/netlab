"use client";
import { useState } from "react";

function toIEEE32(val: number) {
  const buf = new ArrayBuffer(4);
  new Float32Array(buf)[0] = val;
  const bits = new Uint32Array(buf)[0];
  const bin = bits.toString(2).padStart(32, "0");
  const sign = bin[0];
  const exp  = bin.slice(1, 9);
  const mant = bin.slice(9);
  const expVal = parseInt(exp, 2);
  const bias = 127;
  let special = "";
  if (expVal === 255) special = parseInt(mant,2)===0 ? (sign==="0"?"+ ∞":"- ∞") : "NaN";
  else if (expVal === 0 && parseInt(mant,2)===0) special = "Zéro";
  else if (expVal === 0) special = "Dénormalisé";
  return { sign, exp, mant, expVal, bias, expReal: expVal-bias, special,
    hex: bits.toString(16).toUpperCase().padStart(8,"0") };
}

function toIEEE64(val: number) {
  const buf = new ArrayBuffer(8);
  new Float64Array(buf)[0] = val;
  const view = new DataView(buf);
  const hi = view.getUint32(4, false), lo = view.getUint32(0, false);
  const bin = hi.toString(2).padStart(32,"0") + lo.toString(2).padStart(32,"0");
  const sign = bin[0];
  const exp  = bin.slice(1,12);
  const mant = bin.slice(12);
  const expVal = parseInt(exp,2);
  return { sign, exp, mant, expVal, bias:1023, expReal: expVal-1023,
    hex: hi.toString(16).toUpperCase().padStart(8,"0")+lo.toString(16).toUpperCase().padStart(8,"0") };
}

function Bits({ bits, colors, labels }: { bits: string; colors: string[]; labels: [string,number,string][] }) {
  return (
    <div>
      <div className="flex flex-wrap gap-px mb-1">
        {bits.split("").map((b,i)=>(
          <span key={i} className="w-5 h-7 flex items-center justify-center text-xs font-mono font-bold rounded-sm transition-all"
            style={{background:`${colors[i]}22`, color:colors[i], border:`1px solid ${colors[i]}44`}}>
            {b}
          </span>
        ))}
      </div>
      <div className="flex gap-4 mt-2">
        {labels.map(([label,count,color])=>(
          <span key={label} className="flex items-center gap-1.5 text-[10px]">
            <span className="w-2.5 h-2.5 rounded-sm" style={{background:color}} />
            <span style={{color}}>{label} ({count} bit{count>1?"s":""})</span>
          </span>
        ))}
      </div>
    </div>
  );
}

const PRESETS = [0, 1, -1, 3.14159, 0.1, 1/3, Infinity, -Infinity, NaN, Number.MAX_VALUE, Number.MIN_VALUE];

export default function Ieee754Page() {
  const [input, setInput] = useState("3.14159");
  const val = parseFloat(input);
  const valid = !isNaN(input as unknown as number) && input.trim()!=="";
  const r32 = valid ? toIEEE32(val) : null;
  const r64 = valid ? toIEEE64(val) : null;

  const colors32 = ["#ef4444",...Array(8).fill("#f59e0b"),...Array(23).fill("#7c3aed")];
  const colors64 = ["#ef4444",...Array(11).fill("#f59e0b"),...Array(52).fill("#7c3aed")];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#f59e0b] mb-2">🔬 IEEE 754 — Virgule flottante</h1>
      <p className="text-[#64748b] text-sm mb-6">Décompose un nombre réel en représentation binaire IEEE 754 (32 et 64 bits).</p>

      <div className="flex gap-3 mb-3 flex-wrap">
        <input value={input} onChange={e=>setInput(e.target.value)}
          className="flex-1 min-w-0 glass px-4 py-2.5 rounded-lg font-mono text-sm outline-none border border-[#2a2d3a] focus:border-[#f59e0b]"
          placeholder="3.14159" />
      </div>
      <div className="flex gap-2 flex-wrap mb-8">
        {PRESETS.map((p,i)=>(
          <button key={i} onClick={()=>setInput(String(p))}
            className="px-2.5 py-1 text-xs font-mono border border-[#2a2d3a] text-[#64748b] rounded hover:text-[#f59e0b] hover:border-[#f59e0b]/30 transition-all">
            {String(p)}
          </button>
        ))}
      </div>

      {r32 && r64 && (
        <div className="space-y-5">
          {/* 32 bits */}
          <div className="glass rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-[#f59e0b]">Simple précision — 32 bits</h2>
              <span className="font-mono text-xs text-[#64748b]">0x{r32.hex}</span>
            </div>
            <Bits bits={r32.sign+r32.exp+r32.mant} colors={colors32}
              labels={[["Signe",1,"#ef4444"],["Exposant",8,"#f59e0b"],["Mantisse",23,"#7c3aed"]]} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 text-sm">
              <Info label="Signe" value={r32.sign==="0"?"+ (positif)":"− (négatif)"} color="#ef4444" />
              <Info label="Exposant brut" value={`${r32.expVal} (${r32.exp}₂)`} color="#f59e0b" />
              <Info label="Exposant réel" value={r32.special||`${r32.expReal} (−biais 127)`} color="#f59e0b" />
            </div>
            {r32.special && (
              <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                Valeur spéciale : <strong>{r32.special}</strong>
              </div>
            )}
            {!r32.special && (
              <div className="mt-3 px-3 py-2 bg-black/20 rounded-lg font-mono text-xs text-[#94a3b8]">
                Valeur = (−1)^{r32.sign} × 1.{r32.mant.slice(0,8)}…₂ × 2^{r32.expReal}
              </div>
            )}
          </div>

          {/* 64 bits */}
          <div className="glass rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-[#7c3aed]">Double précision — 64 bits</h2>
              <span className="font-mono text-xs text-[#64748b]">0x{r64.hex}</span>
            </div>
            <Bits bits={r64.sign+r64.exp+r64.mant} colors={colors64}
              labels={[["Signe",1,"#ef4444"],["Exposant",11,"#f59e0b"],["Mantisse",52,"#7c3aed"]]} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 text-sm">
              <Info label="Signe" value={r64.sign==="0"?"+ (positif)":"− (négatif)"} color="#ef4444" />
              <Info label="Exposant brut" value={`${r64.expVal}`} color="#f59e0b" />
              <Info label="Exposant réel" value={`${r64.expReal} (−biais 1023)`} color="#f59e0b" />
            </div>
          </div>

          <div className="glass rounded-xl p-4 text-xs text-[#64748b] leading-5">
            <strong className="text-[#e2e8f0]">Pourquoi 0.1 + 0.2 ≠ 0.3 ?</strong><br/>
            Les fractions décimales comme 0.1 ne peuvent pas être représentées exactement en binaire (comme 1/3 en décimal).
            Le résultat est arrondi à la représentation binaire la plus proche, d&apos;où les erreurs d&apos;arrondi.
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, color }: { label:string; value:string; color:string }) {
  return (
    <div className="bg-black/20 rounded-lg p-3">
      <div className="text-xs text-[#64748b] mb-1">{label}</div>
      <div className="font-mono text-sm font-bold" style={{color}}>{value}</div>
    </div>
  );
}
