"use client";
import { useState } from "react";
import { Card, Field, Result, Divider, Hint } from "@/components/ui/Calc";
import { ipToInt, intToIp, parseCidr, inNetwork, maskInt, maskToString, toBin32 } from "@/lib/ip";

const octets = (n: number) => toBin32(n).replace(/(.{8})(?!$)/g, "$1.");

/* ═══ Table de routage ═══════════════════════════════════════════════ */
type Source = "C" | "S" | "O" | "R" | "B" | "D";
const SOURCES: Record<Source, { nom: string; ad: number }> = {
  C: { nom: "Directement connecté", ad: 0 },
  S: { nom: "Statique", ad: 1 },
  D: { nom: "EIGRP", ad: 90 },
  O: { nom: "OSPF", ad: 110 },
  R: { nom: "RIP", ad: 120 },
  B: { nom: "iBGP", ad: 200 },
};

interface Route { id: number; source: Source; reseau: string; ad: string; metrique: string; via: string }

const DEFAUT: Route[] = [
  { id: 1, source: "C", reseau: "192.168.1.0/24", ad: "0", metrique: "0", via: "G0/0" },
  { id: 2, source: "S", reseau: "0.0.0.0/0", ad: "1", metrique: "0", via: "203.0.113.1" },
  { id: 3, source: "O", reseau: "10.0.0.0/8", ad: "110", metrique: "20", via: "192.168.1.2" },
  { id: 4, source: "O", reseau: "10.1.0.0/16", ad: "110", metrique: "30", via: "192.168.1.3" },
  { id: 5, source: "R", reseau: "10.1.0.0/16", ad: "120", metrique: "2", via: "192.168.1.4" },
  { id: 6, source: "S", reseau: "10.1.4.0/22", ad: "1", metrique: "0", via: "192.168.1.5" },
];

function TableRoutage() {
  const [routes, setRoutes] = useState<Route[]>(DEFAUT);
  const [dest, setDest] = useState("10.1.5.20");
  const [nextId, setNextId] = useState(7);

  const ip = ipToInt(dest);
  const analyse = routes.map((r) => {
    const c = parseCidr(r.reseau);
    return { r, c, match: ip !== null && c !== null && inNetwork(ip, c.net, c.prefix) };
  });
  const candidats = analyse.filter((a) => a.match);
  const plusLong = Math.max(-1, ...candidats.map((a) => a.c!.prefix));
  const auPlusLong = candidats.filter((a) => a.c!.prefix === plusLong);
  const adMin = Math.min(...auPlusLong.map((a) => Number(a.r.ad)));
  const auAd = auPlusLong.filter((a) => Number(a.r.ad) === adMin);
  const metMin = Math.min(...auAd.map((a) => Number(a.r.metrique)));
  const gagnants = auAd.filter((a) => Number(a.r.metrique) === metMin);

  const maj = (id: number, p: Partial<Route>) => setRoutes((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const statut = (a: (typeof analyse)[number]) => {
    if (!a.c) return { txt: "invalide", color: "#ef4444" };
    if (!a.match) return { txt: "ne correspond pas", color: "#475569" };
    if (gagnants.includes(a)) return { txt: gagnants.length > 1 ? "✓ ECMP (partage de charge)" : "✓ ROUTE CHOISIE", color: "#22c55e" };
    if (a.c.prefix < plusLong) return { txt: `correspond, mais /${a.c.prefix} < /${plusLong}`, color: "#f59e0b" };
    if (Number(a.r.ad) > adMin) return { txt: `même préfixe, AD ${a.r.ad} > ${adMin}`, color: "#f59e0b" };
    return { txt: `même AD, métrique ${a.r.metrique} > ${metMin}`, color: "#f59e0b" };
  };

  return (
    <Card color="#00d4ff" title="Table de routage — choix de la route" formula="1) préfixe le plus long  →  2) distance administrative la plus faible  →  3) métrique la plus faible"
      explainer={<>
        <p>Pour chaque paquet, le routeur cherche toutes les routes dont le réseau contient l&apos;adresse de destination (ET logique entre l&apos;IP et le masque). Parmi elles, il garde la <strong>plus spécifique</strong> : celle qui a le préfixe le plus long (longest prefix match).</p>
        <p>La <strong>distance administrative</strong> (AD) départage des routes identiques apprises par des sources différentes : elle mesure la confiance dans la source (connecté 0, statique 1, OSPF 110, RIP 120…). En pratique, seule la meilleure source est installée dans la table.</p>
        <p>La <strong>métrique</strong> départage des routes d&apos;un même protocole (coût OSPF, nombre de sauts RIP). En cas d&apos;égalité parfaite, le trafic est réparti (ECMP). La route par défaut 0.0.0.0/0 correspond à tout, mais c&apos;est toujours la moins spécifique.</p>
      </>}>
      <Field text label="Adresse IP de destination" value={dest} onChange={setDest} />
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-mono min-w-[640px]">
          <thead>
            <tr className="text-[#64748b] border-b border-[#2a2d3a] text-left">
              {["Source", "Réseau / préfixe", "AD", "Métrique", "Via / interface", "Résultat", ""].map((h) => <th key={h} className="py-1.5 px-1 font-normal">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {analyse.map((a) => {
              const st = statut(a);
              return (
                <tr key={a.r.id} className="border-b border-[#1c1f2a]" style={gagnants.includes(a) ? { background: "#22c55e12" } : undefined}>
                  <td className="px-1 py-1">
                    <select value={a.r.source} onChange={(e) => { const s = e.target.value as Source; maj(a.r.id, { source: s, ad: String(SOURCES[s].ad) }); }}
                      className="bg-[#0f1117] border border-[#2a2d3a] rounded px-1 py-0.5" title={SOURCES[a.r.source].nom}>
                      {(Object.keys(SOURCES) as Source[]).map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  {(["reseau", "ad", "metrique", "via"] as const).map((k) => (
                    <td key={k} className="px-1">
                      <input value={a.r[k]} onChange={(e) => maj(a.r.id, { [k]: e.target.value })}
                        className={`bg-[#0f1117] border border-[#2a2d3a] rounded px-1.5 py-0.5 ${k === "reseau" ? "w-36" : k === "via" ? "w-28" : "w-12"}`} />
                    </td>
                  ))}
                  <td className="px-1" style={{ color: st.color }}>{st.txt}</td>
                  <td><button onClick={() => setRoutes((rs) => rs.filter((r) => r.id !== a.r.id))} className="text-[#ef4444] px-1">✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <button onClick={() => { setRoutes((rs) => [...rs, { id: nextId, source: "S", reseau: "172.16.0.0/12", ad: "1", metrique: "0", via: "192.168.1.254" }]); setNextId((n) => n + 1); }}
        className="w-full py-1.5 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white">+ Ajouter une route</button>
      <p className="text-[10px] text-[#64748b]">C = connecté · S = statique · D = EIGRP · O = OSPF · R = RIP · B = iBGP (codes de <code>show ip route</code> Cisco)</p>
      <Divider />
      {ip === null ? <Hint>Adresse de destination invalide.</Hint> : gagnants.length === 0 ? (
        <Result label="Décision" value="Aucune route : paquet détruit (ICMP « destination injoignable »)" accent />
      ) : (
        <>
          <Result label="Routes candidates" value={String(candidats.length)} />
          <Result label="Préfixe le plus long" value={`/${plusLong}`} />
          <Result label="Décision" value={gagnants.map((g) => `${g.r.reseau} via ${g.r.via}`).join("  +  ")} accent />
          <div className="bg-black/30 rounded-lg p-3 text-[11px] font-mono overflow-x-auto">
            <div className="text-[#64748b] mb-1">Vérification binaire pour la route choisie (ET logique IP ∧ masque) :</div>
            <div className="whitespace-pre">IP       {octets(ip)}  {intToIp(ip)}</div>
            <div className="whitespace-pre">Masque   {octets(maskInt(plusLong))}  {maskToString(plusLong)}</div>
            <div className="text-[#22c55e] whitespace-pre">Réseau   {octets((ip & maskInt(plusLong)) >>> 0)}  {intToIp(gagnants[0].c!.net)}</div>
          </div>
        </>
      )}
    </Card>
  );
}

/* ═══ Coût OSPF ══════════════════════════════════════════════════════ */
const INTERFACES = [
  { nom: "Série T1", bw: 1.544 }, { nom: "Ethernet", bw: 10 }, { nom: "FastEthernet", bw: 100 },
  { nom: "GigabitEthernet", bw: 1000 }, { nom: "10 GigabitEthernet", bw: 10000 },
];

function CoutOSPF() {
  const [ref, setRef] = useState("100");
  const [chemin, setChemin] = useState<number[]>([1000, 100, 1000]);
  const r = parseFloat(ref) || 100;
  const cout = (bw: number) => Math.max(1, Math.floor(r / bw));
  const total = chemin.reduce((s, bw) => s + cout(bw), 0);

  return (
    <Card color="#22c55e" title="Coût OSPF" formula="coût = bande passante de référence / bande passante de l'interface   (entier, minimum 1)"
      explainer={<>
        <p>OSPF calcule le plus court chemin avec l&apos;algorithme de <strong>Dijkstra</strong> (SPF). Le coût d&apos;un chemin est la somme des coûts des interfaces de <strong>sortie</strong> traversées.</p>
        <p>Par défaut, Cisco utilise une référence de 100 Mbit/s : FastEthernet, GigabitEthernet et 10G ont alors tous un coût de 1, OSPF ne les distingue plus. On relève la référence avec <code>auto-cost reference-bandwidth 10000</code> (en Mbit/s), à configurer sur tous les routeurs de la zone.</p>
      </>}>
      <Field label="Bande passante de référence" unit="Mbit/s" value={ref} onChange={setRef} hint="Cisco : 100 par défaut" />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
        {INTERFACES.map((i) => (
          <div key={i.nom} className="bg-black/20 rounded-lg p-2">
            <div className="text-[10px] text-[#64748b]">{i.nom}</div>
            <div className="text-[10px] text-[#475569]">{i.bw} Mbit/s</div>
            <div className="font-mono font-bold text-[#22c55e]">{cout(i.bw)}</div>
          </div>
        ))}
      </div>
      <Divider />
      <p className="text-xs text-[#64748b]">Chemin : interfaces de sortie traversées, dans l&apos;ordre</p>
      <div className="flex flex-wrap items-center gap-2">
        {chemin.map((bw, k) => (
          <div key={k} className="flex items-center gap-1">
            {k > 0 && <span className="text-[#475569]">→</span>}
            <select value={bw} onChange={(e) => setChemin((c) => c.map((x, j) => (j === k ? Number(e.target.value) : x)))}
              className="bg-[#0f1117] border border-[#2a2d3a] rounded px-2 py-1 text-xs">
              {INTERFACES.map((i) => <option key={i.nom} value={i.bw}>{i.nom} (coût {cout(i.bw)})</option>)}
            </select>
            <button onClick={() => setChemin((c) => c.filter((_, j) => j !== k))} className="text-[#ef4444] text-xs">✕</button>
          </div>
        ))}
        <button onClick={() => setChemin((c) => [...c, 100])} className="px-2 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded">+ lien</button>
      </div>
      <Result label="Coût total du chemin" value={`${chemin.map(cout).join(" + ")} = ${total}`} accent />
    </Card>
  );
}

/* ═══ Distances administratives ═════════════════════════════════════ */
function Distances() {
  const liste = [["Directement connecté", 0], ["Route statique", 1], ["eBGP", 20], ["EIGRP (interne)", 90], ["OSPF", 110], ["IS-IS", 115], ["RIP", 120], ["EIGRP (externe)", 170], ["iBGP", 200], ["Inconnue (jamais utilisée)", 255]] as const;
  return (
    <Card color="#f59e0b" title="Distances administratives (Cisco)"
      explainer={<p>Plus l&apos;AD est faible, plus la source est jugée fiable. Une route statique « flottante » (de secours) s&apos;obtient en lui donnant une AD supérieure à celle du protocole dynamique, par exemple <code>ip route 0.0.0.0 0.0.0.0 10.0.0.1 130</code>.</p>}>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
        {liste.map(([n, ad]) => <Result key={n} label={n} value={String(ad)} />)}
      </div>
    </Card>
  );
}

export default function RoutagePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🧭 Routage IP</h1>
      <p className="text-[#64748b] text-sm mb-8">
        Comment un routeur choisit une route : correspondance du préfixe le plus long, distance administrative, métrique et coût OSPF.
      </p>
      <div className="space-y-5">
        <TableRoutage />
        <CoutOSPF />
        <Distances />
      </div>
    </div>
  );
}
