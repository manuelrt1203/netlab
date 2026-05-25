"use client";
import { useState } from "react";

type Algo = "FIFO" | "LRU" | "Optimal";

interface Step { frames: (number|null)[]; fault: boolean; evicted: number|null; }

function runFIFO(refs: number[], n: number): Step[] {
  const frames: (number|null)[] = Array(n).fill(null);
  const queue: number[] = [];
  return refs.map(page => {
    if (frames.includes(page)) return { frames:[...frames], fault:false, evicted:null };
    let evicted: number|null = null;
    if (frames.includes(null)) {
      frames[frames.indexOf(null)] = page;
    } else {
      evicted = queue.shift()!;
      frames[frames.indexOf(evicted)] = page;
    }
    queue.push(page);
    return { frames:[...frames], fault:true, evicted };
  });
}

function runLRU(refs: number[], n: number): Step[] {
  const frames: (number|null)[] = Array(n).fill(null);
  const used: number[] = [];
  return refs.map((page,i) => {
    if (frames.includes(page)) {
      used[i] = used.findIndex((_,j)=>refs[j]===page&&j<=i);
      return { frames:[...frames], fault:false, evicted:null };
    }
    let evicted: number|null = null;
    if (frames.includes(null)) {
      frames[frames.indexOf(null)] = page;
    } else {
      // find least recently used
      let lruIdx = 0, lruTime = Infinity;
      frames.forEach((f,fi)=>{
        const lastUse = refs.slice(0,i).map((r,ri)=>r===f?ri:-1).filter(x=>x>=0).pop()??-1;
        if(lastUse < lruTime){ lruTime=lastUse; lruIdx=fi; }
      });
      evicted = frames[lruIdx];
      frames[lruIdx] = page;
    }
    return { frames:[...frames], fault:true, evicted };
  });
}

function runOptimal(refs: number[], n: number): Step[] {
  const frames: (number|null)[] = Array(n).fill(null);
  return refs.map((page,i) => {
    if (frames.includes(page)) return { frames:[...frames], fault:false, evicted:null };
    let evicted: number|null = null;
    if (frames.includes(null)) {
      frames[frames.indexOf(null)] = page;
    } else {
      let farthest = -1, replaceIdx = 0;
      frames.forEach((f,fi)=>{
        const next = refs.slice(i+1).indexOf(f!);
        const dist = next === -1 ? Infinity : next;
        if(dist > farthest){ farthest=dist; replaceIdx=fi; }
      });
      evicted = frames[replaceIdx];
      frames[replaceIdx] = page;
    }
    return { frames:[...frames], fault:true, evicted };
  });
}

const ALGOS: {id:Algo;desc:string;color:string}[] = [
  {id:"FIFO",    desc:"First In First Out — on remplace la page la plus ancienne.", color:"#00d4ff"},
  {id:"LRU",     desc:"Least Recently Used — on remplace la page inutilisée depuis le plus longtemps.", color:"#7c3aed"},
  {id:"Optimal", desc:"Optimal (Belady) — on remplace la page dont la prochaine utilisation est la plus lointaine.", color:"#22c55e"},
];

export default function RemplacementPage() {
  const [refStr, setRefStr] = useState("7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1");
  const [frames, setFrames] = useState(3);
  const [algo, setAlgo]   = useState<Algo>("FIFO");

  const refs = refStr.trim().split(/\s+/).map(Number).filter(n=>!isNaN(n)&&n>=0);
  const steps = refs.length > 0 ? (algo==="FIFO"?runFIFO:algo==="LRU"?runLRU:runOptimal)(refs,frames) : [];
  const faults = steps.filter(s=>s.fault).length;
  const color = ALGOS.find(a=>a.id===algo)!.color;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#7c3aed] mb-2">📄 Remplacement de pages</h1>
      <p className="text-[#64748b] text-sm mb-6">Simule les algorithmes de remplacement de pages mémoire virtuelle.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <div className="md:col-span-2 glass rounded-xl p-4">
          <label className="text-xs text-[#64748b] mb-1 block">Chaîne de références (entiers séparés par espaces)</label>
          <input value={refStr} onChange={e=>setRefStr(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg font-mono text-sm outline-none focus:border-[#7c3aed]" />
          <div className="flex gap-2 mt-2 flex-wrap">
            {["7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1","1 2 3 4 1 2 5 1 2 3 4 5","0 1 2 3 0 1 4 0 1 2 3 4"].map(ex=>(
              <button key={ex} onClick={()=>setRefStr(ex)}
                className="text-[10px] px-2 py-0.5 border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all font-mono">
                {ex.slice(0,20)}…
              </button>
            ))}
          </div>
        </div>
        <div className="glass rounded-xl p-4">
          <label className="text-xs text-[#64748b] mb-2 block">Nombre de cadres : <span style={{color}} className="font-mono">{frames}</span></label>
          <input type="range" min={1} max={6} value={frames} onChange={e=>setFrames(+e.target.value)} className="w-full accent-[#7c3aed] mb-3" />
          <div className="space-y-1.5">
            {ALGOS.map(a=>(
              <button key={a.id} onClick={()=>setAlgo(a.id)}
                className="w-full text-left px-3 py-1.5 rounded-lg border text-sm transition-all"
                style={algo===a.id
                  ? {color:a.color,borderColor:a.color,background:`${a.color}18`}
                  : {borderColor:"#2a2d3a",color:"#64748b"}}>
                {a.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-5 flex-wrap">
        {[
          ["Défauts de page",    faults,          "#ef4444"],
          ["Accès réussis",      steps.length-faults, "#22c55e"],
          ["Total d'accès",      steps.length,    color],
          ["Taux de défaut",     steps.length?`${(faults/steps.length*100).toFixed(1)}%`:"—", "#f59e0b"],
        ].map(([label,val,c])=>(
          <div key={label as string} className="glass rounded-xl px-4 py-3 text-center min-w-28">
            <div className="text-xs text-[#64748b] mb-1">{label}</div>
            <div className="text-xl font-bold font-mono" style={{color:c as string}}>{val}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      {steps.length > 0 && (
        <div className="glass rounded-xl overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#2a2d3a]">
                <td className="px-3 py-2 text-[#64748b]">Étape</td>
                {refs.map((r,i)=>(
                  <td key={i} className="px-2 py-2 text-center text-[#e2e8f0]">{r}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array(frames).fill(0).map((_,fi)=>(
                <tr key={fi} className="border-b border-[#2a2d3a]/50">
                  <td className="px-3 py-1.5 text-[#64748b]">Cadre {fi+1}</td>
                  {steps.map((s,si)=>(
                    <td key={si} className="px-2 py-1.5 text-center">
                      {s.frames[fi]!==null ? (
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          s.fault && s.frames[fi]===refs[si] ? `text-[${color}] font-bold` : "text-[#94a3b8]"
                        }`} style={s.fault&&s.frames[fi]===refs[si]?{color}:{}}>
                          {s.frames[fi]}
                        </span>
                      ) : <span className="text-[#2a2d3a]">·</span>}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="px-3 py-1.5 text-[#64748b]">Défaut ?</td>
                {steps.map((s,i)=>(
                  <td key={i} className="px-2 py-1.5 text-center">
                    {s.fault
                      ? <span className="text-red-400 font-bold">✗</span>
                      : <span className="text-[#22c55e]">✓</span>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="glass rounded-xl p-4 mt-4 text-xs text-[#64748b] leading-5">
        <strong className="text-[#e2e8f0]">Info :</strong> {ALGOS.find(a=>a.id===algo)!.desc}
        {algo==="Optimal" && " C'est l'algorithme théorique optimal — impossible à implémenter en temps réel (nécessite de connaître le futur). Sert de référence."}
      </div>
    </div>
  );
}
