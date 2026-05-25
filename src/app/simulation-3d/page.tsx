"use client";
import { useRef, useEffect, useState } from "react";

type Vec3 = [number, number, number];
type Edge = [number, number];
type Mode = "move" | "add-edge" | "delete";

const BASE_SHAPES: Record<string, { vertices: Vec3[]; edges: Edge[] }> = {
  Cube: {
    vertices: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
    edges: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
  },
  Tétraèdre: {
    vertices: [[0,1.4,0],[-1,-0.7,1],[1,-0.7,1],[0,-0.7,-1.4]],
    edges: [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]],
  },
  Octaèdre: {
    vertices: [[0,1.5,0],[0,-1.5,0],[1.2,0,0],[-1.2,0,0],[0,0,1.2],[0,0,-1.2]],
    edges: [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[4,3],[3,5],[5,2]],
  },
  Pyramide: {
    vertices: [[0,1.6,0],[-1,-0.8,-1],[1,-0.8,-1],[1,-0.8,1],[-1,-0.8,1]],
    edges: [[0,1],[0,2],[0,3],[0,4],[1,2],[2,3],[3,4],[4,1]],
  },
  Prisme: {
    vertices: [[-1,-1,-0.6],[1,-1,-0.6],[0,1,-0.6],[-1,-1,0.6],[1,-1,0.6],[0,1,0.6]],
    edges: [[0,1],[1,2],[2,0],[3,4],[4,5],[5,3],[0,3],[1,4],[2,5]],
  },
};

/* ── Maths 3D ──────────────────────────────────────────────────────── */
function rotateVec(v: Vec3, rx: number, ry: number, rz: number): Vec3 {
  let [x, y, z] = v;
  let y1 = y*Math.cos(rx) - z*Math.sin(rx), z1 = y*Math.sin(rx) + z*Math.cos(rx);
  y = y1; z = z1;
  let x2 = x*Math.cos(ry) + z*Math.sin(ry), z2 = -x*Math.sin(ry) + z*Math.cos(ry);
  x = x2; z = z2;
  let x3 = x*Math.cos(rz) - y*Math.sin(rz), y3 = x*Math.sin(rz) + y*Math.cos(rz);
  return [x3, y3, z];
}

function project(v: Vec3, rx: number, ry: number, rz: number, scale: number): [number,number,number] {
  const [rx2,ry2,rz2] = rotateVec(v, rx, ry, rz);
  const s = 5 / (5 + rz2 + 4);
  return [rx2*s*scale, ry2*s*scale, rz2];
}

function unprojectDelta(dx: number, dy: number, rx: number, ry: number, rz: number, scale: number): Vec3 {
  let x = dx/scale, y = -dy/scale, z = 0;
  const x1 = x*Math.cos(-rz) - y*Math.sin(-rz), y1 = x*Math.sin(-rz) + y*Math.cos(-rz);
  x = x1; y = y1;
  const x2 = x*Math.cos(-ry) + z*Math.sin(-ry), z2 = -x*Math.sin(-ry) + z*Math.cos(-ry);
  x = x2; z = z2;
  const y3 = y*Math.cos(-rx) - z*Math.sin(-rx), z3 = y*Math.sin(-rx) + z*Math.cos(-rx);
  return [x, y3, z3];
}

function distToSegment(px:number,py:number,ax:number,ay:number,bx:number,by:number):number {
  const dx=bx-ax, dy=by-ay, len2=dx*dx+dy*dy;
  if (len2===0) return Math.hypot(px-ax, py-ay);
  const t = Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len2));
  return Math.hypot(px-(ax+t*dx), py-(ay+t*dy));
}

/* ── Composant principal ────────────────────────────────────────────── */
export default function Sim3DPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef(0);

  // React state (pour l'UI du panneau)
  const [shapeName,   setShapeName]   = useState("Cube");
  const [autoRotate,  setAutoRotate]  = useState(true);
  const [scale,       setScale]       = useState(80);
  const [mode,        setMode]        = useState<Mode>("move");
  const [selectedVtx, setSelectedVtx] = useState(-1);
  const [vtxCoords,   setVtxCoords]   = useState<Vec3>([0,0,0]);
  const [vtxList,     setVtxList]     = useState<Vec3[]>(BASE_SHAPES["Cube"].vertices.map(v=>[...v] as Vec3));
  const [edgeList,    setEdgeList]    = useState<Edge[]>([...BASE_SHAPES["Cube"].edges]);
  const [edgeSrcUI,   setEdgeSrcUI]   = useState(-1); // pour affichage panneau

  // Ref mutable pour le loop d'animation
  const st = useRef({
    vertices: BASE_SHAPES["Cube"].vertices.map(v=>[...v] as Vec3),
    edges:    [...BASE_SHAPES["Cube"].edges] as Edge[],
    rx: 0.4, ry: 0.6, rz: 0,
    selected: -1,
    edgeSrc:  -1,         // 1er sommet en mode add-edge
    autoRotate: true,
    scale: 80,
    mode: "move" as Mode,
    hover: { vtx: -1, edge: -1 },
    drag: { active: false, mode: "rotate" as "rotate"|"vertex", lastX:0, lastY:0 },
    tick: 0,
  });

  // Sync React→ref pour les scalaires
  useEffect(() => { st.current.autoRotate = autoRotate; }, [autoRotate]);
  useEffect(() => { st.current.scale = scale; }, [scale]);
  useEffect(() => { st.current.mode  = mode; if(mode!=="add-edge"){ st.current.edgeSrc=-1; setEdgeSrcUI(-1); } }, [mode]);

  // Sync React→ref pour les sommets/arêtes (après changement de forme)
  const syncFromBase = (name: string) => {
    const s = BASE_SHAPES[name];
    st.current.vertices = s.vertices.map(v=>[...v] as Vec3);
    st.current.edges    = [...s.edges] as Edge[];
    st.current.selected = -1;
    st.current.edgeSrc  = -1;
    setVtxList(st.current.vertices.map(v=>[...v] as Vec3));
    setEdgeList([...st.current.edges]);
    setSelectedVtx(-1); setVtxCoords([0,0,0]); setEdgeSrcUI(-1);
  };

  const syncToReact = () => {
    setVtxList(st.current.vertices.map(v=>[...v] as Vec3));
    setEdgeList([...st.current.edges]);
  };

  /* ── Actions : ajout/suppression ─────────────────────────────────── */
  const addVertex = () => {
    const r = () => (Math.random()-0.5)*0.6;
    const v: Vec3 = [r(), r(), r()];
    st.current.vertices.push(v);
    syncToReact();
    const idx = st.current.vertices.length-1;
    st.current.selected = idx;
    setSelectedVtx(idx);
    setVtxCoords([...v]);
  };

  const removeVertex = (idx: number) => {
    st.current.vertices.splice(idx,1);
    st.current.edges = st.current.edges
      .filter(([a,b]) => a!==idx && b!==idx)
      .map(([a,b]): Edge => [a>idx?a-1:a, b>idx?b-1:b]);
    st.current.selected = -1;
    st.current.edgeSrc  = -1;
    syncToReact();
    setSelectedVtx(-1); setVtxCoords([0,0,0]); setEdgeSrcUI(-1);
  };

  const addEdge = (a: number, b: number) => {
    if (a===b) return;
    if (st.current.edges.some(([ea,eb])=>(ea===a&&eb===b)||(ea===b&&eb===a))) return;
    st.current.edges.push([a,b]);
    syncToReact();
  };

  const removeEdge = (idx: number) => {
    st.current.edges.splice(idx,1);
    syncToReact();
  };

  /* ── Loop d'animation ─────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d"); if(!ctx) return;

    const tick = () => {
      const s = st.current;
      s.tick++;
      if (s.autoRotate && !s.drag.active) { s.ry+=0.008; s.rx+=0.003; }

      const W=canvas.width, H=canvas.height;
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle="#0f1117"; ctx.fillRect(0,0,W,H);

      // Grille de fond
      ctx.strokeStyle="rgba(42,45,58,0.4)"; ctx.lineWidth=0.5;
      for(let i=0;i<=10;i++){
        ctx.beginPath(); ctx.moveTo(W/10*i,0); ctx.lineTo(W/10*i,H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,H/10*i); ctx.lineTo(W,H/10*i); ctx.stroke();
      }

      const proj = s.vertices.map(v=>project(v,s.rx,s.ry,s.rz,s.scale));

      // Arêtes
      s.edges.forEach(([a,b],i) => {
        if(a>=proj.length||b>=proj.length) return;
        const ax=W/2+proj[a][0], ay=H/2-proj[a][1];
        const bx=W/2+proj[b][0], by=H/2-proj[b][1];
        const hovered = i===s.hover.edge;
        const avgZ = (proj[a][2]+proj[b][2])/2;
        const alpha = Math.max(0.3,Math.min(1,1-avgZ*0.15));

        if (hovered && s.mode==="delete") {
          ctx.strokeStyle=`rgba(239,68,68,${alpha})`;
          ctx.shadowColor="#ef4444"; ctx.shadowBlur=10;
        } else {
          ctx.strokeStyle=`rgba(0,212,255,${alpha})`;
          ctx.shadowColor="#00d4ff"; ctx.shadowBlur=5;
        }
        ctx.lineWidth= hovered ? 2.5 : 1.5;
        ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
        ctx.shadowBlur=0;
      });

      // Sommets
      proj.forEach(([px,py],i) => {
        const cx=W/2+px, cy=H/2-py;
        const isSel   = i===s.selected;
        const isSrc   = i===s.edgeSrc;
        const isHover = i===s.hover.vtx;

        let color="#7c3aed", glow="#7c3aed", radius=5;
        if (isSrc)  { color="#22c55e"; glow="#22c55e"; radius=8; }
        else if (isSel) { color="#f59e0b"; glow="#f59e0b"; radius=8; }
        else if (isHover && s.mode==="delete") { color="#ef4444"; glow="#ef4444"; radius=7; }
        else if (isHover && s.mode==="add-edge") { color="#22c55e"; glow="#22c55e"; radius=7; }
        else if (isHover) { color="#a78bfa"; glow="#7c3aed"; radius=6; }

        // Pulse pour edgeSrc
        if (isSrc) radius += Math.sin(s.tick*0.1)*2;

        ctx.beginPath(); ctx.arc(cx,cy,radius,0,Math.PI*2);
        ctx.fillStyle=color; ctx.shadowColor=glow; ctx.shadowBlur=isSel||isSrc?16:8;
        ctx.fill();

        ctx.shadowBlur=0;
        ctx.fillStyle= isSel ? "#f59e0b" : isSrc ? "#22c55e" : "#64748b";
        ctx.font="10px monospace";
        ctx.fillText(`v${i}`, cx+8, cy-6);
      });

      // Indication de mode en haut du canvas
      ctx.shadowBlur=0;
      const modeLabels:Record<Mode,string> = {
        "move":     "Mode : Déplacer",
        "add-edge": s.edgeSrc>=0 ? `Mode : Arête — v${s.edgeSrc} sélectionné, cliquez v2` : "Mode : Arête — cliquez v1",
        "delete":   "Mode : Supprimer — cliquez un sommet ou une arête",
      };
      ctx.font="11px monospace"; ctx.fillStyle="rgba(100,116,139,0.8)";
      ctx.fillText(modeLabels[s.mode], 12, 20);

      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  /* ── Mouse helpers ────────────────────────────────────────────────── */
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r=canvasRef.current!.getBoundingClientRect();
    const sx=canvasRef.current!.width/r.width, sy=canvasRef.current!.height/r.height;
    return { x:(e.clientX-r.left)*sx, y:(e.clientY-r.top)*sy };
  };

  const nearestVtx = (mx:number,my:number,thresh=16):number => {
    const W=canvasRef.current!.width, H=canvasRef.current!.height;
    let best=-1, bd=thresh;
    st.current.vertices.forEach((v,i)=>{
      const [px,py]=project(v,st.current.rx,st.current.ry,st.current.rz,st.current.scale);
      const d=Math.hypot(mx-W/2-px, my-H/2+py);
      if(d<bd){bd=d;best=i;}
    });
    return best;
  };

  const nearestEdge = (mx:number,my:number,thresh=10):number => {
    const W=canvasRef.current!.width, H=canvasRef.current!.height;
    const proj=st.current.vertices.map(v=>project(v,st.current.rx,st.current.ry,st.current.rz,st.current.scale));
    let best=-1, bd=thresh;
    st.current.edges.forEach(([a,b],i)=>{
      if(a>=proj.length||b>=proj.length) return;
      const d=distToSegment(mx,my,W/2+proj[a][0],H/2-proj[a][1],W/2+proj[b][0],H/2-proj[b][1]);
      if(d<bd){bd=d;best=i;}
    });
    return best;
  };

  /* ── Événements canvas ────────────────────────────────────────────── */
  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const {x,y}=getPos(e);
    const s=st.current;

    // Hover feedback (toujours actif)
    s.hover.vtx  = nearestVtx(x,y,14);
    s.hover.edge = s.hover.vtx>=0 ? -1 : nearestEdge(x,y);

    if (!s.drag.active) return;
    const dx=x-s.drag.lastX, dy=y-s.drag.lastY;
    s.drag.lastX=x; s.drag.lastY=y;

    if (s.drag.mode==="rotate") { s.ry+=dx*0.008; s.rx+=dy*0.008; }
    else if (s.drag.mode==="vertex" && s.selected>=0) {
      const d=unprojectDelta(dx,dy,s.rx,s.ry,s.rz,s.scale);
      const v=s.vertices[s.selected];
      v[0]+=d[0]; v[1]+=d[1]; v[2]+=d[2];
      setVtxCoords([...v]);
    }
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const {x,y}=getPos(e);
    const s=st.current;
    const vtx=nearestVtx(x,y);

    if (s.mode==="move") {
      if (vtx>=0) {
        s.selected=vtx; setSelectedVtx(vtx); setVtxCoords([...s.vertices[vtx]]);
        s.drag={active:true,mode:"vertex",lastX:x,lastY:y};
      } else {
        s.drag={active:true,mode:"rotate",lastX:x,lastY:y};
      }
      s.autoRotate=false; setAutoRotate(false);
    }
    else if (s.mode==="add-edge") {
      if (vtx<0) return;
      if (s.edgeSrc<0) {
        // 1er sommet
        s.edgeSrc=vtx; setEdgeSrcUI(vtx);
        s.selected=vtx; setSelectedVtx(vtx);
      } else {
        // 2ème sommet → créer l'arête
        addEdge(s.edgeSrc, vtx);
        s.edgeSrc=-1; setEdgeSrcUI(-1);
        s.selected=-1; setSelectedVtx(-1);
      }
    }
    else if (s.mode==="delete") {
      if (vtx>=0) {
        removeVertex(vtx);
      } else {
        const edge=nearestEdge(x,y);
        if (edge>=0) removeEdge(edge);
      }
    }
  };

  const onMouseUp  = () => { st.current.drag.active=false; };
  const onWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    setScale(s=>{ const n=Math.max(30,Math.min(200,s-e.deltaY*0.2)); st.current.scale=n; return n; });
  };

  const moveAxis = (axis:0|1|2, val:number) => {
    const s=st.current; if(s.selected<0) return;
    s.vertices[s.selected][axis]=val;
    setVtxCoords([...s.vertices[s.selected]]);
  };

  /* ── Render ───────────────────────────────────────────────────────── */
  const modeBtn = (m:Mode, label:string, color:string) => (
    <button onClick={()=>setMode(m)}
      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
        mode===m ? `border-current` : "border-[#2a2d3a] text-[#64748b] hover:text-white"
      }`}
      style={mode===m ? {color,borderColor:color,background:`${color}18`} : {}}>
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-[#7c3aed] mb-2">🔷 Simulation 3D</h1>
      <p className="text-[#64748b] text-sm mb-5">
        Choisissez un mode dans le panneau · Molette pour zoomer · Glissez le fond pour tourner
      </p>

      {/* Barre formes */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {Object.keys(BASE_SHAPES).map(s=>(
          <button key={s} onClick={()=>{ setShapeName(s); syncFromBase(s); }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
              shapeName===s
                ? "bg-[#7c3aed]/20 text-[#7c3aed] border-[#7c3aed]/40"
                : "border-[#2a2d3a] text-[#64748b] hover:text-white"}`}>
            {s}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={()=>syncFromBase(shapeName)}
            className="px-3 py-1.5 text-sm border border-[#2a2d3a] text-[#64748b] rounded-lg hover:text-white">
            ↺ Reset
          </button>
          <button onClick={()=>setAutoRotate(a=>!a)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
              autoRotate?"bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30":"border-[#2a2d3a] text-[#64748b]"}`}>
            {autoRotate?"⏸ Pause":"▶ Auto"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Canvas */}
        <div className="lg:col-span-2">
          <canvas ref={canvasRef} width={520} height={420}
            className="glass rounded-xl w-full select-none"
            style={{ touchAction:"none", cursor: mode==="delete" ? "crosshair" : mode==="add-edge" ? "cell" : "grab" }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}    onMouseLeave={onMouseUp}
            onWheel={onWheel} />
        </div>

        {/* Panneau */}
        <div className="space-y-4 text-sm">

          {/* Modes */}
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-[#64748b] mb-2">Mode d&apos;édition</p>
            <div className="flex gap-1.5 mb-3">
              {modeBtn("move",    "✥ Déplacer", "#7c3aed")}
              {modeBtn("add-edge","+ Arête",    "#22c55e")}
              {modeBtn("delete",  "✕ Supprimer","#ef4444")}
            </div>

            {/* Aide contextuelle */}
            <div className="text-[10px] text-[#64748b] bg-black/20 rounded p-2 leading-4">
              {mode==="move"     && "Cliquez un sommet pour le sélectionner, glissez-le pour le déplacer. Glissez le fond pour tourner."}
              {mode==="add-edge" && (edgeSrcUI>=0
                ? `v${edgeSrcUI} sélectionné — cliquez un second sommet pour créer l'arête.`
                : "Cliquez un premier sommet, puis un second pour les relier par une arête.")}
              {mode==="delete"   && "Cliquez un sommet (•) pour le supprimer avec ses arêtes. Cliquez près d'une arête pour la supprimer seule."}
            </div>

            {/* Ajouter sommet */}
            <button onClick={addVertex}
              className="w-full mt-2.5 py-1.5 text-xs bg-[#7c3aed]/10 border border-[#7c3aed]/30 text-[#7c3aed] rounded-lg hover:bg-[#7c3aed]/20 transition-all">
              + Ajouter un sommet
            </button>
          </div>

          {/* Coordonnées sommet sélectionné */}
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-[#64748b] mb-2.5">
              {selectedVtx>=0 ? `Sommet v${selectedVtx}` : "Aucun sommet sélectionné"}
            </p>
            {(["X","Y","Z"] as const).map((axis,i)=>(
              <div key={axis} className="mb-2.5">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#64748b]">{axis}</span>
                  <span className="text-[#f59e0b] font-mono">{vtxCoords[i]?.toFixed(2)??"—"}</span>
                </div>
                <input type="range" min={-3} max={3} step={0.05}
                  value={vtxCoords[i]??0} disabled={selectedVtx<0}
                  onChange={e=>moveAxis(i as 0|1|2, +e.target.value)}
                  className="w-full accent-[#f59e0b] disabled:opacity-20" />
              </div>
            ))}
            {selectedVtx>=0 && (
              <div className="flex gap-2 mt-3">
                <span className="flex-1 text-[10px] font-mono text-[#e2e8f0] bg-black/30 rounded px-2 py-1">
                  ({vtxCoords[0]?.toFixed(2)}, {vtxCoords[1]?.toFixed(2)}, {vtxCoords[2]?.toFixed(2)})
                </span>
                <button onClick={()=>removeVertex(selectedVtx)}
                  className="px-2 py-1 text-[10px] text-red-400 border border-red-400/20 rounded hover:bg-red-400/10 transition-all">
                  Suppr.
                </button>
              </div>
            )}
          </div>

          {/* Zoom */}
          <div className="glass rounded-xl p-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-[#64748b]">Zoom</span>
              <span className="text-[#7c3aed] font-mono">{scale}</span>
            </div>
            <input type="range" min={30} max={200} value={scale}
              onChange={e=>{const v=+e.target.value;setScale(v);st.current.scale=v;}}
              className="w-full accent-[#7c3aed]" />
          </div>

          {/* Liste arêtes */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-[#64748b]">Arêtes ({edgeList.length})</p>
              <span className="text-[10px] text-[#2a2d3a]">v{vtxList.length} sommets</span>
            </div>
            {edgeList.length===0 && (
              <p className="text-[10px] text-[#2a2d3a] italic">Aucune arête</p>
            )}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {edgeList.map(([a,b],i)=>(
                <div key={i} className="flex items-center justify-between group px-2 py-1 rounded hover:bg-white/3">
                  <span className="text-[11px] font-mono text-[#94a3b8]">v{a} — v{b}</span>
                  <button onClick={()=>removeEdge(i)}
                    className="text-[10px] text-[#2a2d3a] group-hover:text-red-400 transition-colors px-1">
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
