"use client";
import { useState } from "react";
import { Card, Select, Hint, Tabs } from "@/components/ui/Calc";

type Mode = "statique" | "dynamique" | "pat";

const HOTES = [
  { nom: "PC-1", ip: "10.0.0.1" }, { nom: "PC-2", ip: "10.0.0.2" },
  { nom: "PC-3", ip: "10.0.0.3" }, { nom: "Serveur web", ip: "10.0.0.200" },
];
const SERVEURS = [
  { nom: "site web 194.1.2.3:443", ip: "194.1.2.3", port: 443 },
  { nom: "DNS 9.9.9.9:53", ip: "9.9.9.9", port: 53 },
  { nom: "SSH 198.51.100.7:22", ip: "198.51.100.7", port: 22 },
];
const IP_PUBLIQUE = "192.0.0.1";
const POOL = ["192.0.0.5", "192.0.0.6"];
const STATIQUES: Record<string, string> = { "10.0.0.200": "192.0.0.254" };

interface Traduction { proto: string; il: string; ig: string; og: string; type: string }

const MODES: { id: Mode; icon: string; label: string; desc: string; color: string }[] = [
  { id: "statique", icon: "📌", label: "NAT statique", desc: "1 adresse privée ↔ 1 adresse publique fixe", color: "#00d4ff" },
  { id: "dynamique", icon: "🎲", label: "NAT dynamique", desc: "Adresses publiques prises dans un pool", color: "#ec4899" },
  { id: "pat", icon: "🔢", label: "PAT (overload)", desc: "Une seule IP publique, différenciée par le port", color: "#22c55e" },
];

const CONFIG: Record<Mode, string> = {
  statique: "interface g0/0\n ip nat inside\ninterface g0/1\n ip nat outside\n!\nip nat inside source static 10.0.0.200 192.0.0.254",
  dynamique: "access-list 1 permit 10.0.0.0 0.0.0.255\nip nat pool PUBLIC 192.0.0.5 192.0.0.6 netmask 255.255.255.0\nip nat inside source list 1 pool PUBLIC",
  pat: "access-list 1 permit 10.0.0.0 0.0.0.255\nip nat inside source list 1 interface g0/1 overload",
};

export default function NatPage() {
  const [mode, setMode] = useState<Mode>("pat");
  const [table, setTable] = useState<Traduction[]>([]);
  const [hote, setHote] = useState("10.0.0.1");
  const [serveur, setServeur] = useState("194.1.2.3");
  const [dernier, setDernier] = useState<{ avant: string[]; apres: string[] | null; msg: string } | null>(null);
  const [portSrc, setPortSrc] = useState(51000);

  const changerMode = (m: Mode) => { setMode(m); setTable([]); setDernier(null); };

  const connecter = () => {
    const srv = SERVEURS.find((s) => s.ip === serveur)!;
    const proto = srv.port === 53 ? "udp" : "tcp";
    const il = `${hote}:${portSrc}`, og = `${srv.ip}:${srv.port}`;
    const avant = [`src ${il}`, `dst ${og}`];
    let ig: string | null = null, type = "", msg = "";

    if (mode === "statique") {
      const pub = STATIQUES[hote];
      if (!pub) msg = `${hote} n'a pas d'entrée statique : le paquet part sans traduction et sera jeté par le FAI (adresse privée non routable).`;
      else { ig = `${pub}:${portSrc}`; type = "statique"; msg = `Correspondance fixe ${hote} ↔ ${pub}. Elle marche aussi dans l'autre sens : Internet peut joindre ${pub}.`; }
    } else if (mode === "dynamique") {
      const existant = table.find((t) => t.il.split(":")[0] === hote);
      const utilisees = new Set(table.map((t) => t.ig.split(":")[0]));
      const pub = existant ? existant.ig.split(":")[0] : POOL.find((p) => !utilisees.has(p));
      if (!pub) msg = `Pool épuisé (${POOL.length} adresses déjà attribuées) : ${hote} ne peut pas sortir tant qu'une entrée n'a pas expiré.`;
      else { ig = `${pub}:${portSrc}`; type = "dynamique"; msg = existant ? `${hote} garde l'adresse ${pub} déjà attribuée.` : `Adresse ${pub} prise dans le pool pour ${hote}.`; }
    } else {
      const ports = new Set(table.map((t) => Number(t.ig.split(":")[1])));
      let p = portSrc;
      while (ports.has(p)) p++;
      ig = `${IP_PUBLIQUE}:${p}`; type = "PAT";
      msg = p === portSrc ? `Le port source ${portSrc} est libre : il est conservé, seule l'IP change.` : `Le port ${portSrc} est déjà pris par une autre traduction : le routeur choisit le port ${p}.`;
    }
    if (ig) setTable((t) => [...t, { proto, il, ig: ig!, og, type }]);
    setDernier({ avant, apres: ig ? [`src ${ig}`, `dst ${og}`] : null, msg });
    setPortSrc((p) => (mode === "pat" ? p : p + 1));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🔁 NAT & PAT</h1>
      <p className="text-[#64748b] text-sm mb-6">Traduction d&apos;adresses entre le réseau privé 10.0.0.0/24 et Internet : ouvre des connexions et observe la table de traduction.</p>
      <Tabs tabs={MODES} value={mode} onChange={changerMode} />

      <Card color="#00d4ff" title="Table de traduction NAT" formula="inside local (privée) → inside global (publique)   —   show ip nat translations"
        explainer={<>
          <p>Les adresses privées (RFC 1918 : 10/8, 172.16/12, 192.168/16) ne sont pas routées sur Internet. Le routeur NAT remplace l&apos;adresse source privée (<strong>inside local</strong>) par une adresse publique (<strong>inside global</strong>) et mémorise la correspondance pour traduire les réponses en sens inverse.</p>
          <p><strong>Statique</strong> : correspondance fixe, sert à publier un serveur interne. <strong>Dynamique</strong> : une adresse du pool par hôte, tant qu&apos;il en reste. <strong>PAT</strong> (overload) : tous les hôtes partagent une seule IP, et c&apos;est le <strong>port source</strong> qui distingue les connexions. C&apos;est ce que fait une box Internet.</p>
        </>}>
        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
          <Select label="Hôte interne" value={hote} onChange={setHote} options={HOTES.map((h) => ({ value: h.ip, label: `${h.nom} (${h.ip})` }))} />
          <Select label="Destination sur Internet" value={serveur} onChange={setServeur} options={SERVEURS.map((s) => ({ value: s.ip, label: s.nom }))} />
          <button onClick={connecter} className="px-4 py-2 rounded-lg text-sm font-semibold border border-[#00d4ff] text-[#00d4ff] bg-[#00d4ff12] hover:bg-[#00d4ff22]">Ouvrir une connexion</button>
        </div>
        {mode === "pat" && <Hint>Tous les PC utilisent ici le même port source {portSrc}, pour forcer le routeur à en attribuer d&apos;autres.</Hint>}

        {dernier && (
          <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
            <div className="rounded-lg border border-[#2a2d3a] p-3 font-mono text-xs space-y-0.5">
              <div className="text-[10px] text-[#64748b] font-sans mb-1">Paquet côté LAN (inside)</div>
              {dernier.avant.map((l) => <div key={l}>{l}</div>)}
            </div>
            <div className="text-center text-[#f59e0b] text-xs">routeur NAT<br />→</div>
            <div className="rounded-lg border p-3 font-mono text-xs space-y-0.5" style={{ borderColor: dernier.apres ? "#22c55e66" : "#ef444466" }}>
              <div className="text-[10px] text-[#64748b] font-sans mb-1">Paquet côté Internet (outside)</div>
              {dernier.apres ? dernier.apres.map((l, i) => <div key={l} className={i === 0 ? "text-[#22c55e]" : ""}>{l}</div>) : <div className="text-[#ef4444]">pas de traduction</div>}
            </div>
          </div>
        )}
        {dernier && <p className="text-xs text-[#94a3b8] bg-black/20 rounded-lg p-3">{dernier.msg}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono min-w-[560px]">
            <thead><tr className="text-[#64748b] border-b border-[#2a2d3a] text-left">
              {["Proto", "Inside local", "Inside global", "Outside global", "Type"].map((h) => <th key={h} className="py-1 font-normal">{h}</th>)}
            </tr></thead>
            <tbody>
              {mode === "statique" && Object.entries(STATIQUES).map(([l, g]) => (
                <tr key={l} className="border-b border-[#1c1f2a] text-[#64748b]"><td className="py-1">—</td><td>{l}</td><td>{g}</td><td>—</td><td>statique (config)</td></tr>
              ))}
              {table.map((t, i) => (
                <tr key={i} className="border-b border-[#1c1f2a]">
                  <td className="py-1">{t.proto}</td><td>{t.il}</td><td className="text-[#22c55e]">{t.ig}</td><td>{t.og}</td><td className="text-[#64748b]">{t.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {table.length === 0 && <Hint>Aucune traduction active.</Hint>}
        </div>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <pre className="text-[11px] leading-5 text-[#94a3b8] bg-black/30 rounded-lg p-3 overflow-x-auto flex-1">{CONFIG[mode]}</pre>
          <button onClick={() => { setTable([]); setDernier(null); }} className="px-3 py-1.5 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white">clear ip nat translation *</button>
        </div>
      </Card>
    </div>
  );
}
