"use client";
import { useState } from "react";
import { Card, Select, Hint } from "@/components/ui/Calc";

/* Un switch 8 ports : ports 1-7 en mode access, port 8 en trunk 802.1Q vers un autre switch */
interface Port { num: number; hote: string; mac: string; vlan: number; trunk?: boolean }

const PORTS_DEFAUT: Port[] = [
  { num: 1, hote: "PC-A", mac: "00:1a:2b:00:00:0a", vlan: 10 },
  { num: 2, hote: "PC-B", mac: "00:1a:2b:00:00:0b", vlan: 10 },
  { num: 3, hote: "PC-C", mac: "00:1a:2b:00:00:0c", vlan: 20 },
  { num: 4, hote: "PC-D", mac: "00:1a:2b:00:00:0d", vlan: 20 },
  { num: 5, hote: "Imprimante", mac: "00:1a:2b:00:00:0e", vlan: 10 },
  { num: 6, hote: "Serveur", mac: "00:1a:2b:00:00:0f", vlan: 30 },
  { num: 7, hote: "PC-G", mac: "00:1a:2b:00:00:10", vlan: 30 },
  { num: 8, hote: "Switch 2 (trunk)", mac: "", vlan: 1, trunk: true },
];
const VLANS = [1, 10, 20, 30];
const COUL_VLAN: Record<number, string> = { 1: "#94a3b8", 10: "#00d4ff", 20: "#ec4899", 30: "#22c55e" };
const BROADCAST = "ff:ff:ff:ff:ff:ff";

interface Entree { vlan: number; mac: string; port: number; t: number }
interface Resultat { src: number; sortie: number[]; type: "unicast" | "inondation" | "filtrage" | "broadcast"; texte: string }

function Switch({ ports, res }: { ports: Port[]; res: Resultat | null }) {
  return (
    <svg viewBox="0 0 800 200" className="w-full bg-[#0f1117] rounded-lg">
      <rect x={40} y={70} width={720} height={50} rx={8} fill="#1a1d27" stroke="#2a2d3a" />
      <text x={400} y={100} fontSize={12} fill="#64748b" textAnchor="middle">Switch 1</text>
      {ports.map((p, i) => {
        const x = 85 + i * 90;
        const estSrc = res?.src === p.num, estSortie = res?.sortie.includes(p.num);
        const c = p.trunk ? "#f59e0b" : COUL_VLAN[p.vlan] ?? "#94a3b8";
        const lien = estSrc ? "#ffffff" : estSortie ? "#22c55e" : "#2a2d3a";
        return (
          <g key={p.num}>
            <line x1={x} y1={120} x2={x} y2={150} stroke={lien} strokeWidth={estSrc || estSortie ? 3 : 1.5} strokeDasharray={p.trunk ? "5 3" : undefined} />
            <rect x={x - 14} y={108} width={28} height={12} rx={2} fill={c} opacity={0.85} />
            <text x={x} y={117} fontSize={8} fill="#0f1117" textAnchor="middle" fontWeight={700}>{p.num}</text>
            <rect x={x - 40} y={150} width={80} height={34} rx={6} fill={estSrc ? "#ffffff18" : estSortie ? "#22c55e18" : "#1a1d27"} stroke={estSrc ? "#fff" : estSortie ? "#22c55e" : "#2a2d3a"} />
            <text x={x} y={165} fontSize={9.5} fill="#e2e8f0" textAnchor="middle">{p.hote.length > 12 ? p.hote.slice(0, 11) + "…" : p.hote}</text>
            <text x={x} y={178} fontSize={8.5} fill={c} textAnchor="middle">{p.trunk ? "trunk 802.1Q" : `VLAN ${p.vlan}`}</text>
            {estSortie && p.trunk && <text x={x} y={100} fontSize={8} fill="#f59e0b" textAnchor="middle">tag</text>}
          </g>
        );
      })}
      <text x={40} y={30} fontSize={11} fill="#94a3b8">{res ? res.texte : "Choisis une source et une destination, puis envoie une trame."}</text>
    </svg>
  );
}

export default function CommutationPage() {
  const [ports, setPorts] = useState<Port[]>(PORTS_DEFAUT);
  const [table, setTable] = useState<Entree[]>([]);
  const [horloge, setHorloge] = useState(0);
  const [src, setSrc] = useState("1");
  const [dst, setDst] = useState(PORTS_DEFAUT[1].mac);
  const [res, setRes] = useState<Resultat | null>(null);
  const [journal, setJournal] = useState<string[]>([]);

  const envoyer = () => {
    const ps = ports.find((p) => p.num === Number(src))!;
    const vlan = ps.vlan;
    const t = horloge + 1;
    const lignes: string[] = [];
    // 1. Apprentissage : (VLAN, MAC source) → port d'entrée
    let nt = table.filter((e) => !(e.vlan === vlan && e.mac === ps.mac));
    const deja = table.find((e) => e.vlan === vlan && e.mac === ps.mac);
    nt = [...nt, { vlan, mac: ps.mac, port: ps.num, t }];
    lignes.push(deja ? `Apprentissage : ${ps.mac} déjà connue sur le port ${deja.port}, âge remis à zéro.` : `Apprentissage : ${ps.mac} ajoutée sur le port ${ps.num}, VLAN ${vlan}.`);

    // 2. Acheminement dans le VLAN de la trame
    const membres = ports.filter((p) => p.num !== ps.num && (p.trunk || p.vlan === vlan)).map((p) => p.num);
    let r: Resultat;
    if (dst === BROADCAST) {
      r = { src: ps.num, sortie: membres, type: "broadcast", texte: `Broadcast : diffusé sur tous les ports du VLAN ${vlan} (et le trunk).` };
      lignes.push(`Destination broadcast → envoi sur les ports ${membres.join(", ")}.`);
    } else {
      const connue = nt.find((e) => e.vlan === vlan && e.mac === dst);
      if (connue && connue.port === ps.num) {
        r = { src: ps.num, sortie: [], type: "filtrage", texte: "Filtrage : destination sur le même port que la source, trame détruite." };
        lignes.push("Destination sur le port d'entrée → trame filtrée.");
      } else if (connue) {
        r = { src: ps.num, sortie: [connue.port], type: "unicast", texte: `Unicast : MAC connue → envoi uniquement sur le port ${connue.port}.` };
        lignes.push(`Recherche : ${dst} trouvée sur le port ${connue.port} → commutation directe.`);
      } else {
        r = { src: ps.num, sortie: membres, type: "inondation", texte: `Inondation : MAC inconnue dans le VLAN ${vlan} → envoi sur tous ses ports.` };
        lignes.push(`Recherche : ${dst} inconnue dans le VLAN ${vlan} → inondation (flooding) sur ${membres.join(", ")}.`);
      }
    }
    // Un hôte d'un autre VLAN ne reçoit jamais la trame, même inondée
    const pd = ports.find((p) => p.mac === dst);
    if (pd && pd.vlan !== vlan && !pd.trunk) lignes.push(`⚠ ${pd.hote} est dans le VLAN ${pd.vlan} : il ne recevra pas la trame. Il faut passer par un routeur (routage inter-VLAN).`);
    else if (pd && dst !== BROADCAST && r.type === "inondation") {
      // L'hôte destinataire répond : le switch apprend sa MAC
      nt = [...nt.filter((e) => !(e.vlan === pd.vlan && e.mac === pd.mac)), { vlan: pd.vlan, mac: pd.mac, port: pd.num, t: t + 0.5 }];
      lignes.push(`${pd.hote} répond : le switch apprend ${pd.mac} sur le port ${pd.num}.`);
    }
    setTable(nt); setHorloge(t); setRes(r);
    setJournal((j) => [`#${t} ${ps.hote} → ${dst === BROADCAST ? "broadcast" : ports.find((p) => p.mac === dst)?.hote ?? dst}`, ...lignes.map((l) => "   " + l), ...j].slice(0, 40));
  };

  const setVlan = (num: number, vlan: number) => {
    setPorts((ps) => ps.map((p) => (p.num === num ? { ...p, vlan } : p)));
    setTable((t) => t.filter((e) => e.port !== num)); // changer de VLAN vide les entrées du port
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🔀 Commutation & VLAN</h1>
      <p className="text-[#64748b] text-sm mb-8">Comment un switch apprend les adresses MAC et isole les VLAN : envoie des trames et regarde sa table se remplir.</p>
      <div className="space-y-5">
        <Card color="#00d4ff" title="Switch : apprentissage, inondation, filtrage" formula="table CAM : (VLAN, MAC) → port   —   apprentissage sur la MAC source, décision sur la MAC destination"
          explainer={<>
            <p>À chaque trame reçue, le switch <strong>apprend</strong> : il note que la MAC source se trouve derrière le port d&apos;entrée. Puis il regarde la MAC destination : si elle est connue, il envoie la trame sur ce seul port ; sinon il l&apos;<strong>inonde</strong> sur tous les ports du VLAN. Le broadcast est toujours inondé.</p>
            <p>Un <strong>VLAN</strong> découpe le switch en plusieurs switchs logiques : une trame ne sort jamais dans un autre VLAN. Pour communiquer entre VLAN, il faut un routeur (router-on-a-stick) ou un switch de niveau 3.</p>
            <p>Sur un lien <strong>trunk</strong>, les trames de plusieurs VLAN circulent avec une étiquette 802.1Q de 4 octets (TPID 0x8100, priorité, VLAN ID sur 12 bits). Le VLAN natif passe sans étiquette. Les entrées de la table vieillissent : 300 s par défaut chez Cisco.</p>
          </>}>
          <Switch ports={ports} res={res} />
          <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <Select label="Source" value={src} onChange={setSrc} options={ports.filter((p) => !p.trunk).map((p) => ({ value: String(p.num), label: `${p.hote} (port ${p.num})` }))} />
            <Select label="Destination" value={dst} onChange={setDst} options={[
              ...ports.filter((p) => !p.trunk).map((p) => ({ value: p.mac, label: `${p.hote} — ${p.mac}` })),
              { value: BROADCAST, label: "Broadcast ff:ff:ff:ff:ff:ff" },
            ]} />
            <button onClick={envoyer} className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff12] hover:bg-[#00d4ff22]">Envoyer la trame</button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-[#64748b]">Table MAC (<code>show mac address-table</code>)</p>
                <button onClick={() => { setTable([]); setRes(null); setJournal([]); }} className="text-[10px] text-[#64748b] hover:text-white">vider</button>
              </div>
              <table className="w-full text-xs font-mono">
                <thead><tr className="text-[#64748b] border-b border-[#2a2d3a] text-left">{["VLAN", "Adresse MAC", "Port", "Type"].map((h) => <th key={h} className="py-1 font-normal">{h}</th>)}</tr></thead>
                <tbody>
                  {[...table].sort((a, b) => a.vlan - b.vlan || a.port - b.port).map((e) => (
                    <tr key={`${e.vlan}-${e.mac}`} className="border-b border-[#1c1f2a]">
                      <td className="py-1" style={{ color: COUL_VLAN[e.vlan] }}>{e.vlan}</td>
                      <td>{e.mac}</td><td>Fa0/{e.port}</td><td className="text-[#64748b]">DYNAMIC</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {table.length === 0 && <Hint>Table vide : le switch ne connaît encore personne.</Hint>}
            </div>
            <div>
              <p className="text-xs text-[#64748b] mb-1">Journal</p>
              <pre className="text-[10.5px] leading-4 text-[#94a3b8] bg-black/30 rounded-lg p-2 h-48 overflow-y-auto whitespace-pre-wrap">{journal.join("\n") || "—"}</pre>
            </div>
          </div>
        </Card>

        <Card color="#ec4899" title="Affectation des VLAN" formula="switchport mode access · switchport access vlan N"
          explainer={<p>Change le VLAN d&apos;un port puis renvoie des trames : les hôtes de VLAN différents ne se voient plus, même en broadcast. Les commandes Cisco correspondantes sont affichées à droite.</p>}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              {ports.filter((p) => !p.trunk).map((p) => (
                <div key={p.num} className="flex items-center gap-2 text-xs">
                  <span className="w-28 text-[#e2e8f0]">{p.hote}</span>
                  <span className="text-[#64748b] w-12 font-mono">Fa0/{p.num}</span>
                  <div className="flex gap-1">
                    {VLANS.map((v) => (
                      <button key={v} onClick={() => setVlan(p.num, v)} className="px-2 py-0.5 rounded border font-mono"
                        style={p.vlan === v ? { borderColor: COUL_VLAN[v], color: COUL_VLAN[v], background: `${COUL_VLAN[v]}18` } : { borderColor: "#2a2d3a", color: "#475569" }}>{v}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <pre className="text-[10.5px] leading-4 text-[#94a3b8] bg-black/30 rounded-lg p-3 overflow-x-auto">{[
              "vlan 10", " name ETUDIANTS", "vlan 20", " name PROFS", "vlan 30", " name SERVEURS", "!",
              ...ports.filter((p) => !p.trunk).flatMap((p) => [`interface fa0/${p.num}`, " switchport mode access", ` switchport access vlan ${p.vlan}`]),
              "!", "interface fa0/8", " switchport mode trunk", " switchport trunk allowed vlan 10,20,30", " switchport trunk native vlan 1",
            ].join("\n")}</pre>
          </div>
        </Card>
      </div>
    </div>
  );
}
