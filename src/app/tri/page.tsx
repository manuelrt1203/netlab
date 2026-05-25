"use client";
import { useRef, useEffect, useState, useCallback } from "react";

type AlgoName = "Bulles" | "Insertion" | "Sélection" | "Fusion" | "Rapide";
interface Frame { arr:number[]; a:number; b:number; sorted:number[]; phase:string; }

/* ── Génération des frames d'animation ──────────────────────────────── */
function bubbleFrames(arr:number[]): Frame[] {
  const a=[...arr]; const frames:Frame[]=[]; const sorted:number[]=[];
  for(let i=a.length-1;i>0;i--){
    for(let j=0;j<i;j++){
      frames.push({arr:[...a],a:j,b:j+1,sorted:[...sorted],phase:`Comparer ${a[j]} et ${a[j+1]}`});
      if(a[j]>a[j+1]){[a[j],a[j+1]]=[a[j+1],a[j]];frames.push({arr:[...a],a:j,b:j+1,sorted:[...sorted],phase:`Échanger → ${a[j+1]} > ${a[j]}`});}
    }
    sorted.push(a.length-1-sorted.length);
  }
  sorted.push(0);
  frames.push({arr:[...a],a:-1,b:-1,sorted:[...Array(a.length).keys()],phase:"Trié ✓"});
  return frames;
}

function insertionFrames(arr:number[]): Frame[] {
  const a=[...arr]; const frames:Frame[]=[]; const sorted:number[]=[0];
  for(let i=1;i<a.length;i++){
    let j=i;
    frames.push({arr:[...a],a:i,b:j-1,sorted:[...sorted],phase:`Insérer ${a[i]}`});
    while(j>0&&a[j-1]>a[j]){
      [a[j-1],a[j]]=[a[j],a[j-1]];
      j--;
      frames.push({arr:[...a],a:j,b:j+1,sorted:[...sorted],phase:`Décaler vers la gauche`});
    }
    sorted.push(i);
  }
  frames.push({arr:[...a],a:-1,b:-1,sorted:[...Array(a.length).keys()],phase:"Trié ✓"});
  return frames;
}

function selectionFrames(arr:number[]): Frame[] {
  const a=[...arr]; const frames:Frame[]=[]; const sorted:number[]=[];
  for(let i=0;i<a.length-1;i++){
    let minIdx=i;
    for(let j=i+1;j<a.length;j++){
      frames.push({arr:[...a],a:minIdx,b:j,sorted:[...sorted],phase:`Chercher le min depuis ${i}`});
      if(a[j]<a[minIdx]) minIdx=j;
    }
    if(minIdx!==i){ [a[i],a[minIdx]]=[a[minIdx],a[i]]; frames.push({arr:[...a],a:i,b:minIdx,sorted:[...sorted],phase:`Placer ${a[i]} en position ${i}`}); }
    sorted.push(i);
  }
  sorted.push(a.length-1);
  frames.push({arr:[...a],a:-1,b:-1,sorted:[...Array(a.length).keys()],phase:"Trié ✓"});
  return frames;
}

function mergeFrames(arr:number[]): Frame[] {
  const a=[...arr]; const frames:Frame[]=[]; const sorted:number[]=[];
  function merge(l:number,m:number,r:number){
    const left=a.slice(l,m+1), right=a.slice(m+1,r+1);
    let i=0,j=0,k=l;
    while(i<left.length&&j<right.length){
      frames.push({arr:[...a],a:l+i,b:m+1+j,sorted:[...sorted],phase:`Fusionner [${l}..${m}] et [${m+1}..${r}]`});
      if(left[i]<=right[j]) a[k++]=left[i++]; else a[k++]=right[j++];
      frames.push({arr:[...a],a:k-1,b:-1,sorted:[...sorted],phase:`Placer ${a[k-1]}`});
    }
    while(i<left.length){ a[k++]=left[i++]; frames.push({arr:[...a],a:k-1,b:-1,sorted:[...sorted],phase:"Copier reste gauche"}); }
    while(j<right.length){ a[k++]=right[j++]; frames.push({arr:[...a],a:k-1,b:-1,sorted:[...sorted],phase:"Copier reste droite"}); }
  }
  function sort(l:number,r:number){
    if(l>=r) return;
    const m=Math.floor((l+r)/2);
    sort(l,m); sort(m+1,r); merge(l,m,r);
    for(let i=l;i<=r;i++) sorted.push(i);
  }
  sort(0,a.length-1);
  frames.push({arr:[...a],a:-1,b:-1,sorted:[...Array(a.length).keys()],phase:"Trié ✓"});
  return frames;
}

function quickFrames(arr:number[]): Frame[] {
  const a=[...arr]; const frames:Frame[]=[]; const sorted:number[]=[];
  function partition(l:number,r:number):number{
    const pivot=a[r]; let i=l-1;
    for(let j=l;j<r;j++){
      frames.push({arr:[...a],a:j,b:r,sorted:[...sorted],phase:`Pivot = ${pivot}, comparer ${a[j]}`});
      if(a[j]<=pivot){ i++; [a[i],a[j]]=[a[j],a[i]]; if(i!==j) frames.push({arr:[...a],a:i,b:j,sorted:[...sorted],phase:`Échanger ${a[i]} ↔ ${a[j]}`}); }
    }
    [a[i+1],a[r]]=[a[r],a[i+1]];
    sorted.push(i+1);
    frames.push({arr:[...a],a:i+1,b:-1,sorted:[...sorted],phase:`Pivot ${a[i+1]} en place`});
    return i+1;
  }
  function sort(l:number,r:number){ if(l>=r){if(l===r)sorted.push(l);return;} const p=partition(l,r); sort(l,p-1); sort(p+1,r); }
  sort(0,a.length-1);
  frames.push({arr:[...a],a:-1,b:-1,sorted:[...Array(a.length).keys()],phase:"Trié ✓"});
  return frames;
}

const ALGOS: {id:AlgoName;label:string;complexity:string;color:string}[] = [
  {id:"Bulles",    label:"Tri à bulles",   complexity:"O(n²)",       color:"#00d4ff"},
  {id:"Insertion", label:"Insertion",       complexity:"O(n²) / O(n)",color:"#7c3aed"},
  {id:"Sélection", label:"Sélection",       complexity:"O(n²)",       color:"#f59e0b"},
  {id:"Fusion",    label:"Fusion (Merge)",  complexity:"O(n·log n)",  color:"#22c55e"},
  {id:"Rapide",    label:"Rapide (Quick)",  complexity:"O(n·log n)",  color:"#ec4899"},
];

function makeArray(n:number): number[] {
  return Array.from({length:n},()=>Math.floor(Math.random()*90)+10);
}

export default function TriPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [algo, setAlgo] = useState<AlgoName>("Bulles");
  const [size, setSize] = useState(20);
  const [speed, setSpeed] = useState(5);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("Appuyez sur ▶ pour démarrer");
  const [stats, setStats] = useState({comparisons:0,swaps:0});

  const framesRef = useRef<Frame[]>([]);
  const frameIdxRef = useRef(0);
  const animRef = useRef(0);
  const arrRef = useRef(makeArray(size));

  const draw = useCallback((frame:Frame) => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d"); if(!ctx) return;
    const W=canvas.width, H=canvas.height;
    const n=frame.arr.length;
    const bw=Math.max(2,(W-n)/n);
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="#0f1117"; ctx.fillRect(0,0,W,H);
    const max=Math.max(...frame.arr);
    frame.arr.forEach((v,i)=>{
      const h=(v/max)*(H-20);
      const x=i*(bw+1);
      const isSorted=frame.sorted.includes(i);
      const isA=i===frame.a, isB=i===frame.b;
      ctx.fillStyle = isSorted?"#22c55e":isA?"#ef4444":isB?"#f59e0b":"#7c3aed";
      ctx.fillRect(x,H-h,bw,h);
      if(bw>12){
        ctx.fillStyle="#ffffff44"; ctx.font=`${Math.min(10,bw-2)}px monospace`;
        ctx.fillText(String(v),x+bw/2-4,H-2);
      }
    });
  },[]);

  const randomize = useCallback(() => {
    cancelAnimationFrame(animRef.current);
    setRunning(false);
    arrRef.current = makeArray(size);
    framesRef.current = [];
    frameIdxRef.current = 0;
    setPhase("Tableau aléatoire — prêt");
    setStats({comparisons:0,swaps:0});
    draw({arr:arrRef.current,a:-1,b:-1,sorted:[],phase:""});
  },[size,draw]);

  useEffect(()=>{ randomize(); },[size]);
  useEffect(()=>{ draw({arr:arrRef.current,a:-1,b:-1,sorted:[],phase:""}); },[draw]);

  const start = () => {
    if(running) return;
    const genFrames = {Bulles:bubbleFrames,Insertion:insertionFrames,Sélection:selectionFrames,Fusion:mergeFrames,Rapide:quickFrames}[algo];
    framesRef.current = genFrames([...arrRef.current]);
    frameIdxRef.current = 0;
    setRunning(true);
    let comps=0, swaps=0;
    const tick = () => {
      const frames=framesRef.current;
      if(frameIdxRef.current>=frames.length){ setRunning(false); setStats({comparisons:comps,swaps}); return; }
      const frame=frames[frameIdxRef.current++];
      if(frame.a>=0&&frame.b>=0) comps++;
      if(frame.phase.includes("change")||frame.phase.includes("hanger")||frame.phase.includes("érer")) swaps++;
      draw(frame);
      setPhase(frame.phase);
      const delay = Math.max(1,101-speed*10);
      animRef.current = setTimeout(tick,delay) as unknown as number;
    };
    tick();
  };

  const stop = () => { clearTimeout(animRef.current); setRunning(false); setPhase("Arrêté"); };

  const algoInfo = ALGOS.find(a=>a.id===algo)!;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-[#ec4899] mb-2">📊 Visualisation des tris</h1>
      <p className="text-[#64748b] text-sm mb-5">Observez chaque comparaison et échange en temps réel.</p>

      {/* Algorithmes */}
      <div className="flex gap-2 flex-wrap mb-4">
        {ALGOS.map(a=>(
          <button key={a.id} onClick={()=>{if(!running){setAlgo(a.id);randomize();}}}
            className="px-3 py-1.5 text-sm rounded-lg border transition-all"
            style={algo===a.id?{color:a.color,borderColor:a.color,background:`${a.color}18`}:{borderColor:"#2a2d3a",color:"#64748b"}}>
            {a.label} <span className="text-[10px] ml-1 opacity-60">{a.complexity}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas */}
        <div className="lg:col-span-3">
          <canvas ref={canvasRef} width={600} height={300}
            className="glass rounded-xl w-full" />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-[#64748b] font-mono flex-1 truncate">{phase}</span>
            <div className="flex gap-1.5">
              {([["▶",start,"#22c55e"],["■",stop,"#ef4444"],["⟳",randomize,"#64748b"]] as [string,(()=>void),string][]).map(([icon,fn,c])=>(
                <button key={icon} onClick={fn} disabled={icon==="▶"&&running}
                  className="w-8 h-8 rounded-lg border flex items-center justify-center text-sm transition-all disabled:opacity-40"
                  style={{color:c,borderColor:`${c}44`,background:`${c}11`}}>
                  {icon}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contrôles */}
        <div className="space-y-3">
          <div className="glass rounded-xl p-3">
            <label className="text-xs text-[#64748b] block mb-1">Taille : <span style={{color:algoInfo.color}} className="font-mono">{size}</span></label>
            <input type="range" min={5} max={50} value={size} disabled={running}
              onChange={e=>setSize(+e.target.value)} className="w-full" style={{accentColor:algoInfo.color}} />
          </div>
          <div className="glass rounded-xl p-3">
            <label className="text-xs text-[#64748b] block mb-1">Vitesse : <span style={{color:algoInfo.color}} className="font-mono">{speed}</span></label>
            <input type="range" min={1} max={10} value={speed}
              onChange={e=>setSpeed(+e.target.value)} className="w-full" style={{accentColor:algoInfo.color}} />
          </div>
          <div className="glass rounded-xl p-3 text-xs space-y-2">
            <div className="flex justify-between"><span className="text-[#64748b]">Complexité</span><span style={{color:algoInfo.color}} className="font-mono">{algoInfo.complexity}</span></div>
            <div className="flex justify-between"><span className="text-[#64748b]">Comparaisons</span><span className="text-[#e2e8f0] font-mono">{stats.comparisons}</span></div>
            <div className="flex justify-between"><span className="text-[#64748b]">Échanges</span><span className="text-[#e2e8f0] font-mono">{stats.swaps}</span></div>
          </div>
          <div className="glass rounded-xl p-3 text-[9px] text-[#64748b] space-y-1">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#ef4444]" />Élément A</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#f59e0b]" />Élément B</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#22c55e]" />Trié</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#7c3aed]" />Non trié</div>
          </div>
        </div>
      </div>
    </div>
  );
}
