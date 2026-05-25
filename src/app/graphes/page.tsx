"use client";
import { useRef, useEffect, useState, useCallback } from "react";

interface Node { id:number; x:number; y:number; label:string; }
interface Edge { from:number; to:number; weight:number; }

type Mode = "add-node"|"add-edge"|"move"|"delete";

/* ── Dijkstra ────────────────────────────────────────────────────────── */
interface DijkStep { visited:Set<number>; dist:Record<number,number>; prev:Record<number,number|null>; current:number; }

function dijkstra(nodes:Node[], edges:Edge[], src:number): DijkStep[] {
  const dist: Record<number,number> = {};
  const prev: Record<number,number|null> = {};
  const visited = new Set<number>();
  nodes.forEach(n=>{ dist[n.id]=Infinity; prev[n.id]=null; });
  dist[src]=0;
  const steps: DijkStep[] = [];

  while(visited.size < nodes.length){
    const u = nodes.filter(n=>!visited.has(n.id)).sort((a,b)=>dist[a.id]-dist[b.id])[0];
    if(!u || dist[u.id]===Infinity) break;
    visited.add(u.id);
    steps.push({visited:new Set(visited),dist:{...dist},prev:{...prev},current:u.id});
    edges.filter(e=>e.from===u.id||e.to===u.id).forEach(e=>{
      const v = e.from===u.id ? e.to : e.from;
      if(visited.has(v)) return;
      const alt = dist[u.id]+e.weight;
      if(alt<dist[v]){ dist[v]=alt; prev[v]=u.id; }
    });
  }
  return steps;
}

function getPath(prev:Record<number,number|null>, target:number): number[] {
  const path:number[]=[]; let cur:number|null=target;
  while(cur!==null){ path.unshift(cur); cur=prev[cur]??null; }
  return path;
}

const DEFAULT_NODES: Node[] = [
  {id:0,x:100,y:150,label:"A"},{id:1,x:250,y:60,label:"B"},{id:2,x:250,y:240,label:"C"},
  {id:3,x:400,y:150,label:"D"},{id:4,x:500,y:60,label:"E"},{id:5,x:500,y:240,label:"F"},
];
const DEFAULT_EDGES: Edge[] = [
  {from:0,to:1,weight:4},{from:0,to:2,weight:2},{from:1,to:2,weight:5},
  {from:1,to:3,weight:10},{from:2,to:3,weight:3},{from:3,to:4,weight:4},
  {from:3,to:5,weight:2},{from:4,to:5,weight:6},
];

export default function GraphesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>(DEFAULT_NODES);
  const [edges, setEdges] = useState<Edge[]>(DEFAULT_EDGES);
  const [mode, setMode] = useState<Mode>("move");
  const [src, setSrc] = useState<number|null>(0);
  const [dijkSteps, setDijkSteps] = useState<DijkStep[]>([]);
  const [stepIdx, setStepIdx] = useState(-1);
  const [edgeSrc, setEdgeSrc] = useState<number|null>(null);
  const [nextId, setNextId] = useState(6);
  const [nextLabel, setNextLabel] = useState("G");
  const [dragging, setDragging] = useState<number|null>(null);
  const [dragOffset, setDragOffset] = useState({x:0,y:0});
  const [hover, setHover] = useState<{node:number|null,edge:number|null}>({node:null,edge:null});

  const curStep = stepIdx>=0&&stepIdx<dijkSteps.length ? dijkSteps[stepIdx] : null;

  const getPos = (e:React.MouseEvent<HTMLCanvasElement>)=>{
    const r=canvasRef.current!.getBoundingClientRect();
    return {x:e.clientX-r.left, y:e.clientY-r.top};
  };

  const nearNode=(x:number,y:number,thresh=16)=>
    nodes.find(n=>Math.hypot(n.x-x,n.y-y)<thresh)??null;

  const nearEdge=(x:number,y:number,thresh=8)=>{
    for(let i=0;i<edges.length;i++){
      const e=edges[i];
      const n1=nodes.find(n=>n.id===e.from), n2=nodes.find(n=>n.id===e.to);
      if(!n1||!n2) continue;
      const dx=n2.x-n1.x,dy=n2.y-n1.y,len2=dx*dx+dy*dy;
      if(len2===0) continue;
      const t=Math.max(0,Math.min(1,((x-n1.x)*dx+(y-n1.y)*dy)/len2));
      if(Math.hypot(x-(n1.x+t*dx),y-(n1.y+t*dy))<thresh) return i;
    }
    return -1;
  };

  /* ── Canvas draw ─────────────────────────────────────────────────── */
  const draw = useCallback(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx=canvas.getContext("2d"); if(!ctx) return;
    const W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle="#0f1117"; ctx.fillRect(0,0,W,H);

    // Path highlighting
    const pathEdges=new Set<string>();
    const pathNodes=new Set<number>();
    if(curStep){
      nodes.forEach(n=>{
        if(n.id in curStep.prev&&curStep.prev[n.id]!==null){
          const path=getPath(curStep.prev,n.id);
          if(path.length>1&&curStep.dist[n.id]!==Infinity){
            path.forEach(pid=>pathNodes.add(pid));
            for(let i=0;i<path.length-1;i++) pathEdges.add(`${path[i]}-${path[i+1]}`);
          }
        }
      });
    }

    // Edges
    edges.forEach((e,i)=>{
      const n1=nodes.find(n=>n.id===e.from),n2=nodes.find(n=>n.id===e.to);
      if(!n1||!n2) return;
      const isPath=pathEdges.has(`${e.from}-${e.to}`)||pathEdges.has(`${e.to}-${e.from}`);
      const isHover=hover.edge===i;
      ctx.beginPath(); ctx.moveTo(n1.x,n1.y); ctx.lineTo(n2.x,n2.y);
      ctx.strokeStyle=isPath?"#22c55e":isHover&&mode==="delete"?"#ef4444":"#2a2d3a";
      ctx.lineWidth=isPath?3:isHover?2:1.5;
      ctx.shadowColor=isPath?"#22c55e":"transparent"; ctx.shadowBlur=isPath?8:0;
      ctx.stroke(); ctx.shadowBlur=0;
      // Weight label
      const mx=(n1.x+n2.x)/2,my=(n1.y+n2.y)/2;
      ctx.fillStyle=isPath?"#22c55e":"#64748b";
      ctx.font="11px monospace";
      ctx.fillText(String(e.weight),mx+4,my-4);
    });

    // Nodes
    nodes.forEach(n=>{
      const isVisited=curStep?.visited.has(n.id)??false;
      const isCurrent=curStep?.current===n.id;
      const isSrc=n.id===src;
      const isEdgeSrc=n.id===edgeSrc;
      const isHoverNode=hover.node===n.id;
      const dist=curStep?.dist[n.id];

      let color="#7c3aed";
      if(isCurrent)       color="#f59e0b";
      else if(isEdgeSrc)  color="#22c55e";
      else if(isSrc)      color="#00d4ff";
      else if(isVisited)  color="#22c55e";
      else if(isHoverNode&&mode==="delete") color="#ef4444";
      else if(isHoverNode) color="#a78bfa";

      ctx.beginPath(); ctx.arc(n.x,n.y,18,0,Math.PI*2);
      ctx.fillStyle=`${color}22`; ctx.fill();
      ctx.strokeStyle=color; ctx.lineWidth=2;
      ctx.shadowColor=isCurrent||isSrc?color:"transparent"; ctx.shadowBlur=isCurrent?20:0;
      ctx.stroke(); ctx.shadowBlur=0;

      ctx.fillStyle=color; ctx.font="bold 13px monospace";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(n.label,n.x,n.y);

      if(dist!==undefined&&dist!==Infinity){
        ctx.fillStyle="#e2e8f0"; ctx.font="10px monospace";
        ctx.fillText(String(dist),n.x,n.y+28);
      }
    });
    ctx.textAlign="left"; ctx.textBaseline="alphabetic";
  },[nodes,edges,curStep,src,edgeSrc,hover,mode]);

  useEffect(()=>{ draw(); },[draw]);

  /* ── Mouse events ────────────────────────────────────────────────── */
  const onMouseMove=(e:React.MouseEvent<HTMLCanvasElement>)=>{
    const {x,y}=getPos(e);
    const node=nearNode(x,y);
    const edgeIdx=node?-1:nearEdge(x,y);
    setHover({node:node?.id??null,edge:edgeIdx>=0?edgeIdx:null});
    if(dragging!==null&&mode==="move"){
      setNodes(ns=>ns.map(n=>n.id===dragging?{...n,x:x-dragOffset.x,y:y-dragOffset.y}:n));
    }
  };

  const onMouseDown=(e:React.MouseEvent<HTMLCanvasElement>)=>{
    const {x,y}=getPos(e);
    const node=nearNode(x,y);

    if(mode==="move"){
      if(node){ setDragging(node.id); setDragOffset({x:x-node.x,y:y-node.y}); }
    }
    else if(mode==="add-node"&&!node){
      setNodes(ns=>[...ns,{id:nextId,x,y,label:nextLabel}]);
      setNextId(i=>i+1);
      setNextLabel(l=>String.fromCharCode(l.charCodeAt(0)+1));
    }
    else if(mode==="add-edge"){
      if(!node) return;
      if(edgeSrc===null){ setEdgeSrc(node.id); }
      else if(edgeSrc!==node.id){
        const w=parseInt(prompt("Poids de l'arête ?")||"1")||1;
        setEdges(es=>[...es,{from:edgeSrc,to:node.id,weight:w}]);
        setEdgeSrc(null);
      } else { setEdgeSrc(null); }
    }
    else if(mode==="delete"){
      if(node){
        setNodes(ns=>ns.filter(n=>n.id!==node.id));
        setEdges(es=>es.filter(e=>e.from!==node.id&&e.to!==node.id));
        if(src===node.id) setSrc(null);
      } else {
        const ei=nearEdge(x,y);
        if(ei>=0) setEdges(es=>es.filter((_,i)=>i!==ei));
      }
    }
  };

  const onMouseUp=()=>setDragging(null);

  const runDijkstra=()=>{
    if(src===null) return;
    const steps=dijkstra(nodes,edges,src);
    setDijkSteps(steps); setStepIdx(0);
  };

  const modeBtn=(m:Mode,label:string,color:string)=>(
    <button onClick={()=>{setMode(m);setEdgeSrc(null);}}
      className="flex-1 py-1.5 text-xs rounded-lg border transition-all"
      style={mode===m?{color,borderColor:color,background:`${color}18`}:{borderColor:"#2a2d3a",color:"#64748b"}}>
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#22c55e] mb-2">🕸 Graphes &amp; Dijkstra</h1>
      <p className="text-[#64748b] text-sm mb-5">Construisez un graphe pondéré et visualisez l&apos;algorithme de Dijkstra pas à pas.</p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas */}
        <div className="lg:col-span-3">
          <canvas ref={canvasRef} width={600} height={360}
            className="glass rounded-xl w-full"
            style={{cursor:mode==="move"?"grab":mode==="delete"?"crosshair":"cell"}}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp} onMouseLeave={onMouseUp} />
        </div>

        {/* Panneau */}
        <div className="space-y-3 text-sm">
          {/* Modes */}
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-[#64748b] mb-2">Mode</p>
            <div className="flex flex-col gap-1.5">
              {modeBtn("add-node","+ Nœud","#00d4ff")}
              {modeBtn("add-edge","+ Arête","#22c55e")}
              {modeBtn("move","Déplacer","#7c3aed")}
              {modeBtn("delete","✕ Suppr.","#ef4444")}
            </div>
            <p className="text-[10px] text-[#64748b] mt-2">
              {mode==="add-node"&&"Cliquez sur le canvas pour ajouter un nœud."}
              {mode==="add-edge"&&(edgeSrc!==null?"Cliquez le nœud destination.":"Cliquez le nœud source.")}
              {mode==="move"&&"Glissez un nœud pour le déplacer."}
              {mode==="delete"&&"Cliquez un nœud ou une arête pour le supprimer."}
            </p>
          </div>

          {/* Dijkstra */}
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-[#64748b] mb-2">Source Dijkstra</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {nodes.map(n=>(
                <button key={n.id} onClick={()=>{setSrc(n.id);setDijkSteps([]);setStepIdx(-1);}}
                  className="px-2 py-0.5 text-xs rounded border transition-all font-mono"
                  style={src===n.id?{color:"#00d4ff",borderColor:"#00d4ff",background:"#00d4ff18"}:{borderColor:"#2a2d3a",color:"#64748b"}}>
                  {n.label}
                </button>
              ))}
            </div>
            <button onClick={runDijkstra} disabled={src===null}
              className="w-full py-1.5 text-xs bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] rounded hover:bg-[#22c55e]/20 transition-all disabled:opacity-40">
              ▶ Lancer Dijkstra
            </button>
          </div>

          {/* Steps */}
          {dijkSteps.length>0 && (
            <div className="glass rounded-xl p-3">
              <p className="text-xs text-[#64748b] mb-2">Étape {stepIdx+1} / {dijkSteps.length}</p>
              <div className="flex gap-1.5 mb-3">
                <button onClick={()=>setStepIdx(i=>Math.max(0,i-1))}
                  className="flex-1 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all">◀</button>
                <button onClick={()=>setStepIdx(i=>Math.min(dijkSteps.length-1,i+1))}
                  className="flex-1 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all">▶</button>
              </div>
              {curStep && (
                <div className="space-y-1">
                  {nodes.map(n=>(
                    <div key={n.id} className="flex justify-between text-[11px] font-mono">
                      <span className={curStep.current===n.id?"text-[#f59e0b]":curStep.visited.has(n.id)?"text-[#22c55e]":"text-[#64748b]"}>
                        {n.label}
                      </span>
                      <span className="text-[#e2e8f0]">
                        {curStep.dist[n.id]===Infinity?"∞":curStep.dist[n.id]}
                      </span>
                      <span className="text-[#64748b]">
                        {curStep.prev[n.id]!==null?`← ${nodes.find(nn=>nn.id===curStep.prev[n.id])?.label}`:"-"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={()=>{setNodes(DEFAULT_NODES);setEdges(DEFAULT_EDGES);setDijkSteps([]);setStepIdx(-1);setSrc(0);setNextId(6);setNextLabel("G");}}
            className="w-full py-1.5 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all">
            ↺ Reset exemple
          </button>
        </div>
      </div>
    </div>
  );
}
