"use client";
import { useMemo, useState } from "react";

type Origin = "IGP" | "EGP" | "INCOMPLETE";
type BgpType = "eBGP" | "iBGP";

interface Route {
  id: number;
  label: string;
  weight: number;
  localPref: number;
  asPath: string;
  origin: Origin;
  med: number;
  type: BgpType;
  igpMetric: number;
  routerId: string;
}

const ORIGIN_RANK: Record<Origin, number> = { IGP: 0, EGP: 1, INCOMPLETE: 2 };

const DEFAULT_ROUTES: Route[] = [
  { id: 1, label: "Route A", weight: 0, localPref: 100, asPath: "65010 65020", origin: "IGP", med: 20, type: "eBGP", igpMetric: 10, routerId: "1.1.1.1" },
  { id: 2, label: "Route B", weight: 0, localPref: 150, asPath: "65030", origin: "IGP", med: 5, type: "eBGP", igpMetric: 5, routerId: "2.2.2.2" },
  { id: 3, label: "Route C", weight: 0, localPref: 150, asPath: "65030 65040 65050", origin: "EGP", med: 5, type: "iBGP", igpMetric: 1, routerId: "3.3.3.3" },
];

function asPathLen(s: string) { return s.trim() ? s.trim().split(/\s+/).length : 0; }
function routerIdNum(rid: string) { return rid.split(".").reduce((acc, p) => acc * 256 + (parseInt(p) || 0), 0); }

interface Criterion { name: string; hint: string; score: (r: Route) => number; display: (r: Route) => string; }

const CRITERIA: Criterion[] = [
  { name: "1. Weight le plus élevé", hint: "Attribut Cisco propriétaire, local au routeur, jamais annoncé aux voisins.", score: (r) => r.weight, display: (r) => String(r.weight) },
  { name: "2. Local Preference la plus élevée", hint: "Diffusée à tous les routeurs iBGP internes ; exprime la préférence de sortie de l'AS.", score: (r) => r.localPref, display: (r) => String(r.localPref) },
  { name: "3. AS-Path le plus court", hint: "Nombre d'AS traversés — un chemin plus court est préféré.", score: (r) => -asPathLen(r.asPath), display: (r) => `${asPathLen(r.asPath)} AS` },
  { name: "4. Origine la plus basse (IGP < EGP < Incomplete)", hint: "IGP (réseau déclaré via network) est jugée plus fiable qu'EGP ou qu'une route redistribuée (Incomplete).", score: (r) => -ORIGIN_RANK[r.origin], display: (r) => r.origin },
  { name: "5. MED le plus bas", hint: "Multi-Exit Discriminator : suggéré par l'AS voisin, comparé seulement entre routes venant du même AS voisin (simplifié ici).", score: (r) => -r.med, display: (r) => String(r.med) },
  { name: "6. eBGP préféré à iBGP", hint: "Une route apprise d'un AS externe est préférée à une route apprise en interne.", score: (r) => (r.type === "eBGP" ? 1 : 0), display: (r) => r.type },
  { name: "7. Métrique IGP la plus basse vers le next-hop", hint: "Coût IGP (OSPF, EIGRP…) pour atteindre l'adresse next-hop du chemin BGP.", score: (r) => -r.igpMetric, display: (r) => String(r.igpMetric) },
  { name: "8. Router ID le plus bas", hint: "Dernier critère de départage : le routeur annonçant le plus petit Router ID gagne.", score: (r) => -routerIdNum(r.routerId), display: (r) => r.routerId },
];

interface StepResult { criterion: Criterion; survivors: number[]; eliminated: number[]; decisive: boolean; }

function evaluate(routes: Route[]): StepResult[] {
  let pool = routes.map((r) => r.id);
  const steps: StepResult[] = [];
  for (const c of CRITERIA) {
    if (pool.length <= 1) break;
    const scores = pool.map((id) => ({ id, s: c.score(routes.find((r) => r.id === id)!) }));
    const max = Math.max(...scores.map((x) => x.s));
    const survivors = scores.filter((x) => x.s === max).map((x) => x.id);
    const eliminated = pool.filter((id) => !survivors.includes(id));
    steps.push({ criterion: c, survivors, eliminated, decisive: eliminated.length > 0 });
    pool = survivors;
  }
  return steps;
}

function RouteEditor({ route, onChange, onRemove, canRemove }: { route: Route; onChange: (r: Route) => void; onRemove: () => void; canRemove: boolean }) {
  const set = <K extends keyof Route>(k: K, v: Route[K]) => onChange({ ...route, [k]: v });
  const inputCls = "w-full bg-[#0f1117] border border-[#2a2d3a] px-2 py-1.5 rounded text-xs font-mono outline-none focus:border-[#00d4ff] transition-colors";
  return (
    <div className="glass rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <input value={route.label} onChange={(e) => set("label", e.target.value)}
          className="bg-transparent text-sm font-bold text-[#00d4ff] outline-none border-b border-transparent focus:border-[#2a2d3a] w-24" />
        {canRemove && <button onClick={onRemove} className="text-xs text-[#ef4444] hover:opacity-70">✕</button>}
      </div>
      <div>
        <label className="text-[10px] text-[#64748b] block mb-0.5">Weight</label>
        <input type="number" value={route.weight} onChange={(e) => set("weight", parseInt(e.target.value) || 0)} className={inputCls} />
      </div>
      <div>
        <label className="text-[10px] text-[#64748b] block mb-0.5">Local Preference</label>
        <input type="number" value={route.localPref} onChange={(e) => set("localPref", parseInt(e.target.value) || 0)} className={inputCls} />
      </div>
      <div>
        <label className="text-[10px] text-[#64748b] block mb-0.5">AS-Path (ASNs séparés par espace)</label>
        <input value={route.asPath} onChange={(e) => set("asPath", e.target.value)} className={inputCls} />
      </div>
      <div>
        <label className="text-[10px] text-[#64748b] block mb-0.5">Origine</label>
        <select value={route.origin} onChange={(e) => set("origin", e.target.value as Origin)} className={inputCls}>
          <option value="IGP">IGP</option><option value="EGP">EGP</option><option value="INCOMPLETE">Incomplete</option>
        </select>
      </div>
      <div>
        <label className="text-[10px] text-[#64748b] block mb-0.5">MED</label>
        <input type="number" value={route.med} onChange={(e) => set("med", parseInt(e.target.value) || 0)} className={inputCls} />
      </div>
      <div>
        <label className="text-[10px] text-[#64748b] block mb-0.5">Type</label>
        <select value={route.type} onChange={(e) => set("type", e.target.value as BgpType)} className={inputCls}>
          <option value="eBGP">eBGP</option><option value="iBGP">iBGP</option>
        </select>
      </div>
      <div>
        <label className="text-[10px] text-[#64748b] block mb-0.5">Métrique IGP → next-hop</label>
        <input type="number" value={route.igpMetric} onChange={(e) => set("igpMetric", parseInt(e.target.value) || 0)} className={inputCls} />
      </div>
      <div>
        <label className="text-[10px] text-[#64748b] block mb-0.5">Router ID</label>
        <input value={route.routerId} onChange={(e) => set("routerId", e.target.value)} className={inputCls} />
      </div>
    </div>
  );
}

export default function BgpPage() {
  const [routes, setRoutes] = useState<Route[]>(DEFAULT_ROUTES);
  const [nextId, setNextId] = useState(4);

  const steps = useMemo(() => evaluate(routes), [routes]);
  const winnerIds = steps.length > 0 ? steps[steps.length - 1].survivors : routes.map((r) => r.id);
  const finalWinners = winnerIds.length > 0 ? winnerIds : routes.map((r) => r.id);

  const updateRoute = (r: Route) => setRoutes((rs) => rs.map((x) => (x.id === r.id ? r : x)));
  const removeRoute = (id: number) => setRoutes((rs) => rs.filter((r) => r.id !== id));
  const addRoute = () => {
    if (routes.length >= 4) return;
    setRoutes((rs) => [...rs, { id: nextId, label: `Route ${String.fromCharCode(65 + rs.length)}`, weight: 0, localPref: 100, asPath: "65099", origin: "IGP", med: 0, type: "eBGP", igpMetric: 1, routerId: `4.4.4.${nextId}` }]);
    setNextId((i) => i + 1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#f59e0b] mb-2">🌍 Sélection du meilleur chemin BGP</h1>
      <p className="text-[#64748b] text-sm mb-6">
        Configurez plusieurs chemins BGP reçus pour le même préfixe et observez, critère par critère, l&apos;algorithme de sélection du meilleur chemin utilisé par les routeurs.
      </p>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${routes.length >= 3 ? "lg:grid-cols-3" : ""} ${routes.length >= 4 ? "xl:grid-cols-4" : ""} gap-3 mb-3`}>
        {routes.map((r) => (
          <div key={r.id} className="relative">
            {finalWinners.includes(r.id) && finalWinners.length === 1 && (
              <span className="absolute -top-2 -right-2 z-10 bg-[#22c55e] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">✓ MEILLEUR</span>
            )}
            <RouteEditor route={r} onChange={updateRoute} onRemove={() => removeRoute(r.id)} canRemove={routes.length > 2} />
          </div>
        ))}
      </div>
      {routes.length < 4 && (
        <button onClick={addRoute} className="w-full mb-6 py-1.5 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white transition-all">
          + Ajouter un chemin
        </button>
      )}

      <div className="glass rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2d3a]">
          <h3 className="text-sm font-bold text-[#f59e0b]">Déroulé de la sélection</h3>
          <p className="text-[#64748b] text-xs mt-0.5">Chaque critère élimine les chemins qui ne sont pas au meilleur score, jusqu&apos;à ce qu&apos;il n&apos;en reste qu&apos;un.</p>
        </div>
        <div className="p-4 space-y-2">
          {steps.map((s, i) => (
            <div key={i} className={`rounded-lg p-3 ${s.decisive ? "bg-[#22c55e]/5 border border-[#22c55e]/20" : "bg-black/20"}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#e2e8f0]">{s.criterion.name}</span>
                {s.decisive && <span className="text-[10px] text-[#22c55e]">✓ décisif</span>}
              </div>
              <p className="text-[10px] text-[#64748b] mb-2">{s.criterion.hint}</p>
              <div className="flex flex-wrap gap-2">
                {routes.map((r) => {
                  const inPool = s.survivors.includes(r.id) || s.eliminated.includes(r.id);
                  if (!inPool) return null;
                  const survived = s.survivors.includes(r.id);
                  return (
                    <span key={r.id} className={`text-[11px] font-mono px-2 py-0.5 rounded border ${survived ? "border-[#22c55e]/40 text-[#22c55e]" : "border-[#2a2d3a] text-[#64748b] line-through opacity-50"}`}>
                      {r.label}: {s.criterion.display(r)}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
          {steps.length === 0 && <p className="text-xs text-[#64748b]">Toutes les valeurs sont identiques sur les critères comparés — égalité complète.</p>}
          <div className="pt-2 border-t border-[#2a2d3a] flex items-center gap-2">
            <span className="text-xs text-[#64748b]">Résultat :</span>
            {finalWinners.length === 1 ? (
              <span className="text-sm font-bold text-[#22c55e]">{routes.find((r) => r.id === finalWinners[0])?.label} installée dans la table de routage</span>
            ) : (
              <span className="text-sm font-bold text-[#f59e0b]">Égalité entre {finalWinners.map((id) => routes.find((r) => r.id === id)?.label).join(" et ")} — load-balancing possible (si activé)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
