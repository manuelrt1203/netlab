"use client";
import { useRef, useEffect, useState, useCallback, useMemo } from "react";

interface Node { id: number; x: number; y: number; label: string; priority: number; }
interface Edge { id: number; from: number; to: number; weight: number; }
type Mode = "add-node" | "add-edge" | "move" | "delete";
type PortRole = "root" | "designated" | "blocked" | "root-bridge";

const DEFAULT_NODES: Node[] = [
  { id: 0, x: 150, y: 80,  label: "SW1", priority: 32768 },
  { id: 1, x: 450, y: 80,  label: "SW2", priority: 32768 },
  { id: 2, x: 450, y: 280, label: "SW3", priority: 32768 },
  { id: 3, x: 150, y: 280, label: "SW4", priority: 32768 },
];
const DEFAULT_EDGES: Edge[] = [
  { id: 0, from: 0, to: 1, weight: 4 },
  { id: 1, from: 1, to: 2, weight: 4 },
  { id: 2, from: 2, to: 3, weight: 4 },
  { id: 3, from: 3, to: 0, weight: 4 },
  { id: 4, from: 0, to: 2, weight: 7 },
];

/* ─── Calcul STP : élection du root bridge + coût de chemin racine ────── */
function computeSTP(nodes: Node[], edges: Edge[]) {
  if (nodes.length === 0) return { rootId: null as number | null, dist: {} as Record<number, number>, via: {} as Record<number, number | null> };

  const rootId = [...nodes].sort((a, b) => a.priority - b.priority || a.id - b.id)[0].id;

  const dist: Record<number, number> = {};
  const via: Record<number, number | null> = {};
  nodes.forEach((n) => { dist[n.id] = Infinity; via[n.id] = null; });
  dist[rootId] = 0;
  const visited = new Set<number>();

  while (visited.size < nodes.length) {
    const u = nodes.filter((n) => !visited.has(n.id)).sort((a, b) => dist[a.id] - dist[b.id])[0];
    if (!u || dist[u.id] === Infinity) break;
    visited.add(u.id);
    edges.filter((e) => e.from === u.id || e.to === u.id).forEach((e) => {
      const v = e.from === u.id ? e.to : e.from;
      if (visited.has(v)) return;
      const alt = dist[u.id] + e.weight;
      const curVia = via[v];
      if (alt < dist[v] || (alt === dist[v] && (curVia === null || u.id < curVia))) {
        dist[v] = alt; via[v] = u.id;
      }
    });
  }
  return { rootId, dist, via };
}

/* Rôle du port de `node` sur `edge` */
function portRole(edge: Edge, nodeId: number, rootId: number | null, dist: Record<number, number>, via: Record<number, number | null>): PortRole {
  if (nodeId === rootId) return "root-bridge";
  const other = edge.from === nodeId ? edge.to : edge.from;
  if (via[nodeId] === other) return "root";
  const dA = dist[edge.from], dB = dist[edge.to];
  const designated = dA < dB ? edge.from : dB < dA ? edge.to : Math.min(edge.from, edge.to);
  return designated === nodeId ? "designated" : "blocked";
}

const ROLE_COLOR: Record<PortRole, string> = {
  "root-bridge": "#00d4ff", root: "#22c55e", designated: "#22c55e", blocked: "#ef4444",
};
const ROLE_LABEL: Record<PortRole, string> = {
  "root-bridge": "Root Bridge", root: "Root Port (RP)", designated: "Designated Port (DP)", blocked: "Blocked (BLK)",
};

export default function SpanningTreePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nodes, setNodes] = useState<Node[]>(DEFAULT_NODES);
  const [edges, setEdges] = useState<Edge[]>(DEFAULT_EDGES);
  const [mode, setMode] = useState<Mode>("move");
  const [edgeSrc, setEdgeSrc] = useState<number | null>(null);
  const [nextId, setNextId] = useState(4);
  const [nextEdgeId, setNextEdgeId] = useState(5);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<{ node: number | null; edge: number | null }>({ node: null, edge: null });

  const { rootId, dist, via } = useMemo(() => computeSTP(nodes, edges), [nodes, edges]);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const nearNode = (x: number, y: number, thresh = 20) => nodes.find((n) => Math.hypot(n.x - x, n.y - y) < thresh) ?? null;
  const nearEdge = (x: number, y: number, thresh = 8) => {
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const n1 = nodes.find((n) => n.id === e.from), n2 = nodes.find((n) => n.id === e.to);
      if (!n1 || !n2) continue;
      const dx = n2.x - n1.x, dy = n2.y - n1.y, len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      const t = Math.max(0, Math.min(1, ((x - n1.x) * dx + (y - n1.y) * dy) / len2));
      if (Math.hypot(x - (n1.x + t * dx), y - (n1.y + t * dy)) < thresh) return i;
    }
    return -1;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0f1117"; ctx.fillRect(0, 0, W, H);

    edges.forEach((e, i) => {
      const n1 = nodes.find((n) => n.id === e.from), n2 = nodes.find((n) => n.id === e.to);
      if (!n1 || !n2) return;
      const roleA = portRole(e, e.from, rootId, dist, via);
      const roleB = portRole(e, e.to, rootId, dist, via);
      const forwarding = roleA !== "blocked" && roleB !== "blocked";
      const isHover = hover.edge === i;

      ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y);
      ctx.strokeStyle = forwarding ? "#22c55e" : "#ef4444";
      ctx.lineWidth = isHover ? 3 : forwarding ? 2.5 : 1.5;
      if (!forwarding) ctx.setLineDash([5, 4]);
      ctx.globalAlpha = forwarding ? 1 : 0.6;
      ctx.stroke();
      ctx.setLineDash([]); ctx.globalAlpha = 1;

      const mx = (n1.x + n2.x) / 2, my = (n1.y + n2.y) / 2;
      ctx.fillStyle = "#64748b"; ctx.font = "11px monospace";
      ctx.fillText(String(e.weight), mx + 5, my - 5);
    });

    nodes.forEach((n) => {
      const isRoot = n.id === rootId;
      const isHoverNode = hover.node === n.id;
      const isEdgeSrc = n.id === edgeSrc;
      let color = "#7c3aed";
      if (isRoot) color = "#00d4ff";
      else if (isEdgeSrc) color = "#22c55e";
      else if (isHoverNode && mode === "delete") color = "#ef4444";
      else if (isHoverNode) color = "#a78bfa";

      ctx.beginPath(); ctx.arc(n.x, n.y, isRoot ? 22 : 18, 0, Math.PI * 2);
      ctx.fillStyle = `${color}22`; ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = isRoot ? 3 : 2;
      ctx.shadowColor = isRoot ? color : "transparent"; ctx.shadowBlur = isRoot ? 16 : 0;
      ctx.stroke(); ctx.shadowBlur = 0;

      ctx.fillStyle = color; ctx.font = "bold 12px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(n.label, n.x, n.y - (isRoot ? 2 : 0));
      ctx.font = "9px monospace"; ctx.fillStyle = "#64748b";
      ctx.fillText(`p${n.priority}`, n.x, n.y + 30);
      if (isRoot) { ctx.font = "9px monospace"; ctx.fillStyle = "#00d4ff"; ctx.fillText("👑 ROOT", n.x, n.y + 15); }
      else if (dist[n.id] !== undefined && dist[n.id] !== Infinity) {
        ctx.font = "9px monospace"; ctx.fillStyle = "#e2e8f0"; ctx.fillText(`coût ${dist[n.id]}`, n.x, n.y + 15);
      }
    });
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }, [nodes, edges, rootId, dist, via, hover, mode, edgeSrc]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getPos(e);
    const node = nearNode(x, y);
    const edgeIdx = node ? -1 : nearEdge(x, y);
    setHover({ node: node?.id ?? null, edge: edgeIdx >= 0 ? edgeIdx : null });
    if (dragging !== null && mode === "move") {
      setNodes((ns) => ns.map((n) => (n.id === dragging ? { ...n, x: x - dragOffset.x, y: y - dragOffset.y } : n)));
    }
  };
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getPos(e);
    const node = nearNode(x, y);
    if (mode === "move") {
      if (node) { setDragging(node.id); setDragOffset({ x: x - node.x, y: y - node.y }); }
    } else if (mode === "add-node" && !node) {
      setNodes((ns) => [...ns, { id: nextId, x, y, label: `SW${nextId + 1}`, priority: 32768 }]);
      setNextId((i) => i + 1);
    } else if (mode === "add-edge") {
      if (!node) return;
      if (edgeSrc === null) setEdgeSrc(node.id);
      else if (edgeSrc !== node.id) {
        const w = parseInt(prompt("Coût STP du lien ?", "4") || "4") || 4;
        setEdges((es) => [...es, { id: nextEdgeId, from: edgeSrc, to: node.id, weight: w }]);
        setNextEdgeId((i) => i + 1);
        setEdgeSrc(null);
      } else setEdgeSrc(null);
    } else if (mode === "delete") {
      if (node) {
        setNodes((ns) => ns.filter((n) => n.id !== node.id));
        setEdges((es) => es.filter((e) => e.from !== node.id && e.to !== node.id));
      } else {
        const ei = nearEdge(x, y);
        if (ei >= 0) setEdges((es) => es.filter((_, i) => i !== ei));
      }
    }
  };
  const onMouseUp = () => setDragging(null);

  const setPriority = (id: number, p: number) => setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, priority: p } : n)));

  const modeBtn = (m: Mode, label: string, color: string) => (
    <button onClick={() => { setMode(m); setEdgeSrc(null); }}
      className="flex-1 py-1.5 text-xs rounded-lg border transition-all"
      style={mode === m ? { color, borderColor: color, background: `${color}18` } : { borderColor: "#2a2d3a", color: "#64748b" }}>
      {label}
    </button>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#22c55e] mb-2">🌳 Spanning Tree Protocol</h1>
      <p className="text-[#64748b] text-sm mb-5">
        Construisez une topologie de commutateurs et observez l&apos;élection du root bridge, le calcul des root/designated ports, et le blocage des liens redondants — évite les boucles de commutation.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <canvas ref={canvasRef} width={600} height={360} className="glass rounded-xl w-full"
            style={{ cursor: mode === "move" ? "grab" : mode === "delete" ? "crosshair" : "cell" }}
            onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} />
          <div className="flex gap-4 mt-3 text-[11px] text-[#64748b]">
            <span><span className="inline-block w-3 h-0.5 bg-[#22c55e] align-middle mr-1" /> Forwarding (RP/DP)</span>
            <span><span className="inline-block w-3 h-0.5 bg-[#ef4444] align-middle mr-1" style={{ borderTop: "2px dashed #ef4444" }} /> Blocked</span>
            <span>👑 = Root Bridge (priorité la plus basse, puis ID le plus bas)</span>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-[#64748b] mb-2">Mode</p>
            <div className="flex flex-col gap-1.5">
              {modeBtn("add-node", "+ Switch", "#00d4ff")}
              {modeBtn("add-edge", "+ Lien", "#22c55e")}
              {modeBtn("move", "Déplacer", "#7c3aed")}
              {modeBtn("delete", "✕ Suppr.", "#ef4444")}
            </div>
            <p className="text-[10px] text-[#64748b] mt-2">
              {mode === "add-node" && "Cliquez sur le canvas pour ajouter un switch."}
              {mode === "add-edge" && (edgeSrc !== null ? "Cliquez le switch destination." : "Cliquez le switch source.")}
              {mode === "move" && "Glissez un switch pour le déplacer."}
              {mode === "delete" && "Cliquez un switch ou un lien pour le supprimer."}
            </p>
          </div>

          <div className="glass rounded-xl p-3">
            <p className="text-xs text-[#64748b] mb-2">Priorités de pont</p>
            <div className="space-y-1.5">
              {nodes.map((n) => (
                <div key={n.id} className="flex items-center gap-2">
                  <span className="text-xs font-mono w-10" style={{ color: n.id === rootId ? "#00d4ff" : "#94a3b8" }}>{n.label}</span>
                  <input type="number" step={4096} value={n.priority} onChange={(e) => setPriority(n.id, parseInt(e.target.value) || 0)}
                    className="flex-1 bg-[#0f1117] border border-[#2a2d3a] px-2 py-1 rounded text-xs font-mono" />
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#64748b] mt-2">Plus bas = plus prioritaire pour devenir root bridge (défaut Cisco : 32768).</p>
          </div>

          <div className="glass rounded-xl p-3">
            <p className="text-xs text-[#64748b] mb-2">Rôles des ports</p>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {edges.flatMap((e) => [
                { node: e.from, edge: e }, { node: e.to, edge: e },
              ]).map(({ node, edge }, i) => {
                const n = nodes.find((nn) => nn.id === node)!;
                const other = nodes.find((nn) => nn.id === (edge.from === node ? edge.to : edge.from))!;
                const role = portRole(edge, node, rootId, dist, via);
                return (
                  <div key={i} className="flex justify-between text-[10px] font-mono">
                    <span className="text-[#64748b]">{n?.label}→{other?.label}</span>
                    <span style={{ color: ROLE_COLOR[role] }}>{ROLE_LABEL[role]}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={() => { setNodes(DEFAULT_NODES); setEdges(DEFAULT_EDGES); setNextId(4); setNextEdgeId(5); }}
            className="w-full py-1.5 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all">
            ↺ Reset exemple
          </button>
        </div>
      </div>
    </div>
  );
}
