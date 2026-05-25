"use client";
import { useState } from "react";

type Algo = "FIFO" | "SJF" | "SRTF" | "RR" | "Priority";

interface Process { id:string; arrival:number; burst:number; priority:number; }
interface GanttBlock { pid:string; start:number; end:number; }
interface Stats { pid:string; finish:number; tat:number; wt:number; }

const COLORS = ["#00d4ff","#7c3aed","#22c55e","#f59e0b","#ec4899","#ef4444","#84cc16","#06b6d4"];

function runFIFO(procs: Process[]): { gantt: GanttBlock[]; stats: Stats[] } {
  const sorted = [...procs].sort((a,b)=>a.arrival-b.arrival||a.id.localeCompare(b.id));
  const gantt: GanttBlock[] = []; let t = 0;
  const stats = sorted.map(p=>{
    t = Math.max(t, p.arrival);
    gantt.push({pid:p.id, start:t, end:t+p.burst});
    t += p.burst;
    return { pid:p.id, finish:t, tat:t-p.arrival, wt:t-p.arrival-p.burst };
  });
  return { gantt, stats };
}

function runSJF(procs: Process[]): { gantt: GanttBlock[]; stats: Stats[] } {
  const rem = procs.map(p=>({...p, rem:p.burst, done:false}));
  const gantt: GanttBlock[] = []; const finish: Record<string,number> = {};
  let t = 0, done = 0;
  while (done < procs.length) {
    const ready = rem.filter(p=>!p.done && p.arrival<=t).sort((a,b)=>a.burst-b.burst);
    if (!ready.length) { t++; continue; }
    const p = ready[0];
    if (gantt.length && gantt.at(-1)!.pid===p.id) gantt.at(-1)!.end = t+p.burst;
    else gantt.push({pid:p.id, start:t, end:t+p.burst});
    t += p.burst; p.done=true; finish[p.id]=t; done++;
  }
  return { gantt, stats: procs.map(p=>({pid:p.id,finish:finish[p.id],tat:finish[p.id]-p.arrival,wt:finish[p.id]-p.arrival-p.burst})) };
}

function runSRTF(procs: Process[]): { gantt: GanttBlock[]; stats: Stats[] } {
  const rem = procs.map(p=>({...p, rem:p.burst, done:false}));
  const gantt: GanttBlock[] = []; const finish: Record<string,number> = {};
  let t = 0, done = 0, last = "";
  while (done < procs.length) {
    const ready = rem.filter(p=>!p.done && p.arrival<=t).sort((a,b)=>a.rem-b.rem);
    if (!ready.length) { t++; continue; }
    const p = ready[0];
    if (p.id!==last){ gantt.push({pid:p.id,start:t,end:t+1}); last=p.id; }
    else gantt.at(-1)!.end = t+1;
    p.rem--; t++;
    if(p.rem===0){ p.done=true; finish[p.id]=t; done++; }
  }
  // merge consecutive
  const merged: GanttBlock[] = [];
  gantt.forEach(b=>{ if(merged.length&&merged.at(-1)!.pid===b.pid&&merged.at(-1)!.end===b.start) merged.at(-1)!.end=b.end; else merged.push({...b}); });
  return { gantt:merged, stats: procs.map(p=>({pid:p.id,finish:finish[p.id],tat:finish[p.id]-p.arrival,wt:finish[p.id]-p.arrival-p.burst})) };
}

function runRR(procs: Process[], quantum: number): { gantt: GanttBlock[]; stats: Stats[] } {
  const rem = procs.map(p=>({...p, rem:p.burst}));
  const gantt: GanttBlock[] = []; const finish: Record<string,number> = {};
  let t=0; const queue: typeof rem = [];
  const arrived = new Set<string>();
  const sorted = [...rem].sort((a,b)=>a.arrival-b.arrival);
  let si=0;
  while(queue.length||si<sorted.length){
    while(si<sorted.length&&sorted[si].arrival<=t){ queue.push(sorted[si]); arrived.add(sorted[si].id); si++; }
    if(!queue.length){ t=sorted[si].arrival; continue; }
    const p=queue.shift()!;
    const run=Math.min(p.rem,quantum);
    gantt.push({pid:p.id,start:t,end:t+run});
    t+=run; p.rem-=run;
    while(si<sorted.length&&sorted[si].arrival<=t){ queue.push(sorted[si]); si++; }
    if(p.rem>0) queue.push(p); else finish[p.id]=t;
  }
  const merged: GanttBlock[] = [];
  gantt.forEach(b=>{ if(merged.length&&merged.at(-1)!.pid===b.pid&&merged.at(-1)!.end===b.start) merged.at(-1)!.end=b.end; else merged.push({...b}); });
  return { gantt:merged, stats: procs.map(p=>({pid:p.id,finish:finish[p.id]??t,tat:(finish[p.id]??t)-p.arrival,wt:(finish[p.id]??t)-p.arrival-p.burst})) };
}

function runPriority(procs: Process[]): { gantt: GanttBlock[]; stats: Stats[] } {
  const rem = procs.map(p=>({...p, done:false}));
  const gantt: GanttBlock[] = []; const finish: Record<string,number> = {};
  let t=0, done=0;
  while(done<procs.length){
    const ready=rem.filter(p=>!p.done&&p.arrival<=t).sort((a,b)=>a.priority-b.priority);
    if(!ready.length){t++;continue;}
    const p=ready[0];
    if(gantt.length&&gantt.at(-1)!.pid===p.id) gantt.at(-1)!.end=t+p.burst;
    else gantt.push({pid:p.id,start:t,end:t+p.burst});
    t+=p.burst; p.done=true; finish[p.id]=t; done++;
  }
  return { gantt, stats: procs.map(p=>({pid:p.id,finish:finish[p.id],tat:finish[p.id]-p.arrival,wt:finish[p.id]-p.arrival-p.burst})) };
}

const DEFAULT_PROCS: Process[] = [
  {id:"P1",arrival:0,burst:6,priority:3},
  {id:"P2",arrival:2,burst:4,priority:1},
  {id:"P3",arrival:4,burst:2,priority:4},
  {id:"P4",arrival:6,burst:8,priority:2},
];

export default function OrdonnancementPage() {
  const [procs, setProcs] = useState<Process[]>(DEFAULT_PROCS);
  const [algo, setAlgo] = useState<Algo>("FIFO");
  const [quantum, setQuantum] = useState(2);
  const [nextId, setNextId] = useState(5);

  const colorMap: Record<string,string> = {};
  procs.forEach((p,i)=>{ colorMap[p.id]=COLORS[i%COLORS.length]; });

  const { gantt, stats } = (() => {
    if(!procs.length) return {gantt:[],stats:[]};
    switch(algo){
      case "FIFO":     return runFIFO(procs);
      case "SJF":      return runSJF(procs);
      case "SRTF":     return runSRTF(procs);
      case "RR":       return runRR(procs, quantum);
      case "Priority": return runPriority(procs);
    }
  })();

  const totalTime = gantt.at(-1)?.end ?? 0;
  const avgTAT = stats.length ? (stats.reduce((s,r)=>s+r.tat,0)/stats.length).toFixed(2) : "—";
  const avgWT  = stats.length ? (stats.reduce((s,r)=>s+r.wt,0)/stats.length).toFixed(2) : "—";

  const addProc = () => {
    setProcs(p=>[...p,{id:`P${nextId}`,arrival:0,burst:4,priority:1}]);
    setNextId(n=>n+1);
  };

  const update = (i:number, field:keyof Process, val:string) => {
    setProcs(p=>p.map((proc,j)=>j===i?{...proc,[field]:field==="id"?val:parseInt(val)||0}:proc));
  };

  const ALGOS: {id:Algo;label:string}[] = [
    {id:"FIFO",    label:"FIFO (FCFS)"},
    {id:"SJF",     label:"SJF"},
    {id:"SRTF",    label:"SRTF (préemptif)"},
    {id:"RR",      label:"Round Robin"},
    {id:"Priority",label:"Par priorité"},
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-[#22c55e] mb-2">⏱ Ordonnancement CPU</h1>
      <p className="text-[#64748b] text-sm mb-6">Simule les algorithmes d&apos;ordonnancement de processus et génère le diagramme de Gantt.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Processus */}
        <div className="lg:col-span-2 glass rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs text-[#64748b]">Processus</p>
            <button onClick={addProc} className="text-xs px-2.5 py-1 bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] rounded hover:bg-[#22c55e]/20 transition-all">+ Ajouter</button>
          </div>
          <div className="text-xs text-[#64748b] grid grid-cols-5 gap-2 mb-1 px-1">
            <span>ID</span><span>Arrivée</span><span>Rafale</span><span>Priorité</span><span></span>
          </div>
          {procs.map((p,i)=>(
            <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-center">
              <input value={p.id} onChange={e=>update(i,"id",e.target.value)}
                className="bg-[#0f1117] border border-[#2a2d3a] px-2 py-1.5 rounded text-xs font-mono outline-none focus:border-[#22c55e]"
                style={{borderLeftColor:colorMap[p.id],borderLeftWidth:3}} />
              {(["arrival","burst","priority"] as const).map(f=>(
                <input key={f} type="number" min={0} value={p[f]} onChange={e=>update(i,f,e.target.value)}
                  className="bg-[#0f1117] border border-[#2a2d3a] px-2 py-1.5 rounded text-xs font-mono outline-none focus:border-[#22c55e]" />
              ))}
              <button onClick={()=>setProcs(p=>p.filter((_,j)=>j!==i))}
                className="text-red-400 hover:text-red-300 text-sm">×</button>
            </div>
          ))}
        </div>

        {/* Algo */}
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-[#64748b] mb-3">Algorithme</p>
          {ALGOS.map(a=>(
            <button key={a.id} onClick={()=>setAlgo(a.id)}
              className={`w-full text-left px-3 py-2 mb-1.5 rounded-lg border text-xs transition-all ${
                algo===a.id?"bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30":"border-[#2a2d3a] text-[#64748b] hover:text-white"}`}>
              {a.label}
            </button>
          ))}
          {algo==="RR" && (
            <div className="mt-3">
              <label className="text-xs text-[#64748b] block mb-1">Quantum : <span className="text-[#22c55e] font-mono">{quantum}</span></label>
              <input type="range" min={1} max={8} value={quantum} onChange={e=>setQuantum(+e.target.value)} className="w-full accent-[#22c55e]" />
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-[#2a2d3a] grid grid-cols-2 gap-2 text-xs text-center">
            <div className="bg-black/20 rounded p-2">
              <div className="text-[#64748b]">TAT moyen</div>
              <div className="font-mono font-bold text-[#22c55e]">{avgTAT}</div>
            </div>
            <div className="bg-black/20 rounded p-2">
              <div className="text-[#64748b]">Attente moy.</div>
              <div className="font-mono font-bold text-[#f59e0b]">{avgWT}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Gantt */}
      {gantt.length > 0 && (
        <div className="glass rounded-xl p-5 mb-5">
          <p className="text-xs text-[#64748b] mb-3">Diagramme de Gantt</p>
          <div className="relative h-12 flex mb-1">
            {gantt.map((b,i)=>(
              <div key={i} className="h-full flex items-center justify-center text-xs font-bold text-white rounded-sm mx-px transition-all"
                style={{
                  width:`${((b.end-b.start)/totalTime)*100}%`,
                  background:colorMap[b.pid],
                  minWidth:20,
                }}>
                {b.end-b.start>1?b.pid:""}
              </div>
            ))}
          </div>
          <div className="relative h-4">
            {[...new Set([0,...gantt.map(b=>b.start),...gantt.map(b=>b.end)])].sort((a,b)=>a-b).map(t=>(
              <span key={t} className="absolute text-[9px] font-mono text-[#64748b] -translate-x-1/2"
                style={{left:`${(t/totalTime)*100}%`}}>
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stats table */}
      {stats.length > 0 && (
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-[#2a2d3a] text-[#64748b]">
                <th className="px-4 py-2 text-left">Processus</th>
                <th className="px-4 py-2">Arrivée</th>
                <th className="px-4 py-2">Rafale</th>
                <th className="px-4 py-2">Fin</th>
                <th className="px-4 py-2">TAT</th>
                <th className="px-4 py-2">Attente</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s=>{
                const p = procs.find(p=>p.id===s.pid)!;
                return (
                  <tr key={s.pid} className="border-b border-[#2a2d3a]/40">
                    <td className="px-4 py-2 font-bold" style={{color:colorMap[s.pid]}}>{s.pid}</td>
                    <td className="px-4 py-2 text-center text-[#94a3b8]">{p?.arrival}</td>
                    <td className="px-4 py-2 text-center text-[#94a3b8]">{p?.burst}</td>
                    <td className="px-4 py-2 text-center text-[#e2e8f0]">{s.finish}</td>
                    <td className="px-4 py-2 text-center text-[#22c55e]">{s.tat}</td>
                    <td className="px-4 py-2 text-center text-[#f59e0b]">{s.wt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
