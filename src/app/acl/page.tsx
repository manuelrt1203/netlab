"use client";
import { useState } from "react";
import { Card, Field, Select, Result, Divider, Hint } from "@/components/ui/Calc";
import { ipToInt, intToIp, toBin32 } from "@/lib/ip";

const octets = (n: number) => toBin32(n).replace(/(.{8})(?!$)/g, "$1.");
/** L'IP correspond si elle est égale à la base sur tous les bits où le wildcard vaut 0 */
const correspond = (ip: number, base: number, wc: number) => (((ip ^ base) & ~wc) >>> 0) === 0;

/* ═══ Calculateur de wildcard ═══════════════════════════════════════ */
function Wildcard() {
  const [base, setBase] = useState("192.168.16.0");
  const [wc, setWc] = useState("0.0.15.255");
  const [masque, setMasque] = useState("255.255.240.0");
  const [test, setTest] = useState("192.168.20.7");

  const b = ipToInt(base), w = ipToInt(wc), m = ipToInt(masque), t = ipToInt(test);
  const contigu = w !== null && ((w + 1) & w) === 0;
  const nb = w !== null ? 2 ** toBin32(w).split("").filter((c) => c === "1").length : 0;

  return (
    <Card color="#f59e0b" title="Masque générique (wildcard)" formula="wildcard = 255.255.255.255 − masque   —   bit 0 : doit correspondre · bit 1 : indifférent"
      explainer={<>
        <p>Les ACL et OSPF utilisent un <strong>masque inverse</strong> : un bit à 0 impose que le bit de l&apos;adresse soit identique à celui de la base, un bit à 1 accepte n&apos;importe quelle valeur.</p>
        <p>Pour un réseau, le wildcard est le complément du masque : /24 → 0.0.0.255, /20 → 0.0.15.255. Raccourcis Cisco : <code>host 10.0.0.1</code> = 10.0.0.1 0.0.0.0, et <code>any</code> = 0.0.0.0 255.255.255.255.</p>
      </>}>
      <div className="grid sm:grid-cols-2 gap-2">
        <Field text label="Masque de sous-réseau" value={masque} onChange={(v) => { setMasque(v); const mm = ipToInt(v); if (mm !== null) setWc(intToIp((~mm) >>> 0)); }} />
        <Field text label="Wildcard" value={wc} onChange={(v) => { setWc(v); const ww = ipToInt(v); if (ww !== null) setMasque(intToIp((~ww) >>> 0)); }} />
        <Field text label="Adresse de base" value={base} onChange={setBase} />
        <Field text label="Adresse à tester" value={test} onChange={setTest} />
      </div>
      {b === null || w === null || m === null ? <Hint>Adresse ou masque invalide.</Hint> : <>
        <div className="bg-black/30 rounded-lg p-3 text-[11px] font-mono overflow-x-auto space-y-0.5">
          <div className="whitespace-pre">Base      {octets(b)}  {intToIp(b)}</div>
          <div className="whitespace-pre text-[#f59e0b]">Wildcard  {octets(w)}  {intToIp(w)}</div>
          {t !== null && <div className="whitespace-pre" style={{ color: correspond(t, b, w) ? "#22c55e" : "#ef4444" }}>Test      {octets(t)}  {intToIp(t)}</div>}
        </div>
        <Result label="Plage couverte" value={contigu ? `${intToIp((b & ~w) >>> 0)} → ${intToIp(((b & ~w) | w) >>> 0)}` : "non contiguë"} accent />
        <Result label="Nombre d'adresses" value={nb.toLocaleString("fr-FR")} />
        {contigu && <Result label="Équivaut au préfixe" value={`/${32 - Math.log2(nb)}`} />}
        {t !== null && <Result label={`${intToIp(t)} correspond ?`} value={correspond(t, b, w) ? "OUI" : "NON"} accent />}
        {!contigu && <Hint>Wildcard non contigu : valide dans une ACL (ex. 0.0.254.255 = toutes les adresses paires du 3e octet), mais ne correspond à aucun préfixe.</Hint>}
      </>}
    </Card>
  );
}

/* ═══ Évaluateur d'ACL étendue ══════════════════════════════════════ */
type Proto = "ip" | "tcp" | "udp" | "icmp";
interface ACE { id: number; action: "permit" | "deny"; proto: Proto; src: string; srcWc: string; dst: string; dstWc: string; port: string }

const ACL_DEFAUT: ACE[] = [
  { id: 1, action: "permit", proto: "tcp", src: "192.168.10.0", srcWc: "0.0.0.255", dst: "10.0.0.80", dstWc: "0.0.0.0", port: "80" },
  { id: 2, action: "permit", proto: "tcp", src: "192.168.10.0", srcWc: "0.0.0.255", dst: "10.0.0.80", dstWc: "0.0.0.0", port: "443" },
  { id: 3, action: "deny", proto: "ip", src: "192.168.10.0", srcWc: "0.0.0.255", dst: "10.0.0.0", dstWc: "0.0.0.255", port: "" },
  { id: 4, action: "permit", proto: "ip", src: "0.0.0.0", srcWc: "255.255.255.255", dst: "0.0.0.0", dstWc: "255.255.255.255", port: "" },
];

function adresseCisco(ip: string, wc: string) {
  if (wc === "255.255.255.255") return "any";
  if (wc === "0.0.0.0") return `host ${ip}`;
  return `${ip} ${wc}`;
}

function ACL() {
  const [aces, setAces] = useState<ACE[]>(ACL_DEFAUT);
  const [nextId, setNextId] = useState(5);
  const [pkt, setPkt] = useState({ proto: "tcp" as Proto, src: "192.168.10.25", dst: "10.0.0.80", port: "22" });

  const s = ipToInt(pkt.src), d = ipToInt(pkt.dst);
  const evals = aces.map((a) => {
    const as = ipToInt(a.src), asw = ipToInt(a.srcWc), ad = ipToInt(a.dst), adw = ipToInt(a.dstWc);
    if (as === null || asw === null || ad === null || adw === null || s === null || d === null) return { ok: false, raison: "invalide" };
    if (a.proto !== "ip" && a.proto !== pkt.proto) return { ok: false, raison: `protocole ${pkt.proto} ≠ ${a.proto}` };
    if (!correspond(s, as, asw)) return { ok: false, raison: "source ne correspond pas" };
    if (!correspond(d, ad, adw)) return { ok: false, raison: "destination ne correspond pas" };
    if (a.port && (a.proto === "tcp" || a.proto === "udp") && a.port !== pkt.port) return { ok: false, raison: `port ${pkt.port} ≠ ${a.port}` };
    return { ok: true, raison: "correspond" };
  });
  const premier = evals.findIndex((e) => e.ok);
  const maj = (id: number, p: Partial<ACE>) => setAces((as) => as.map((a) => (a.id === id ? { ...a, ...p } : a)));
  const deplacer = (i: number, dir: number) => setAces((as) => {
    const j = i + dir; if (j < 0 || j >= as.length) return as;
    const c = [...as]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });
  const inp = "bg-[#0f1117] border border-[#2a2d3a] rounded px-1.5 py-0.5 font-mono";

  return (
    <Card color="#00d4ff" title="ACL étendue : quel paquet passe ?" formula="lecture de haut en bas · la 1re ligne qui correspond décide · deny any implicite à la fin"
      explainer={<>
        <p>Le routeur compare le paquet à chaque ligne (ACE) <strong>dans l&apos;ordre</strong> et applique la première qui correspond ; les suivantes sont ignorées. Si aucune ne correspond, le paquet est rejeté par le <strong>deny implicite</strong> invisible en fin de liste. Une ACL sans aucun permit bloque donc tout.</p>
        <p>ACL standard (1–99) : filtre sur la source seule, à placer <strong>près de la destination</strong>. ACL étendue (100–199) : source, destination, protocole et port, à placer <strong>près de la source</strong> pour éliminer le trafic au plus tôt.</p>
      </>}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[720px]">
          <thead><tr className="text-[#64748b] border-b border-[#2a2d3a] text-left">
            {["#", "Action", "Proto", "Source / wildcard", "Destination / wildcard", "Port", "Évaluation", ""].map((h) => <th key={h} className="py-1 px-1 font-normal">{h}</th>)}
          </tr></thead>
          <tbody>
            {aces.map((a, i) => {
              const e = evals[i];
              const style = i === premier ? { background: a.action === "permit" ? "#22c55e14" : "#ef444414" } : premier >= 0 && i > premier ? { opacity: 0.4 } : undefined;
              return (
                <tr key={a.id} className="border-b border-[#1c1f2a]" style={style}>
                  <td className="px-1 text-[#64748b]">{(i + 1) * 10}</td>
                  <td className="px-1"><select value={a.action} onChange={(ev) => maj(a.id, { action: ev.target.value as ACE["action"] })} className={inp} style={{ color: a.action === "permit" ? "#22c55e" : "#ef4444" }}><option>permit</option><option>deny</option></select></td>
                  <td className="px-1"><select value={a.proto} onChange={(ev) => maj(a.id, { proto: ev.target.value as Proto })} className={inp}>{["ip", "tcp", "udp", "icmp"].map((p) => <option key={p}>{p}</option>)}</select></td>
                  <td className="px-1 whitespace-nowrap"><input value={a.src} onChange={(ev) => maj(a.id, { src: ev.target.value })} className={`${inp} w-28`} /> <input value={a.srcWc} onChange={(ev) => maj(a.id, { srcWc: ev.target.value })} className={`${inp} w-28 text-[#f59e0b]`} /></td>
                  <td className="px-1 whitespace-nowrap"><input value={a.dst} onChange={(ev) => maj(a.id, { dst: ev.target.value })} className={`${inp} w-28`} /> <input value={a.dstWc} onChange={(ev) => maj(a.id, { dstWc: ev.target.value })} className={`${inp} w-28 text-[#f59e0b]`} /></td>
                  <td className="px-1"><input value={a.port} disabled={a.proto !== "tcp" && a.proto !== "udp"} onChange={(ev) => maj(a.id, { port: ev.target.value })} className={`${inp} w-12 disabled:opacity-30`} /></td>
                  <td className="px-1" style={{ color: e.ok ? (i === premier ? (a.action === "permit" ? "#22c55e" : "#ef4444") : "#94a3b8") : "#64748b" }}>
                    {i === premier ? `✓ ${a.action.toUpperCase()}` : premier >= 0 && i > premier ? "non évaluée" : e.raison}
                  </td>
                  <td className="px-1 whitespace-nowrap">
                    <button onClick={() => deplacer(i, -1)} className="text-[#64748b] px-0.5">▲</button>
                    <button onClick={() => deplacer(i, 1)} className="text-[#64748b] px-0.5">▼</button>
                    <button onClick={() => setAces((as) => as.filter((x) => x.id !== a.id))} className="text-[#ef4444] px-1">✕</button>
                  </td>
                </tr>
              );
            })}
            <tr style={premier < 0 ? { background: "#ef444414" } : { opacity: 0.4 }}>
              <td className="px-1 text-[#64748b]">—</td><td colSpan={5} className="px-1 py-1.5 font-mono text-[#64748b] italic">deny ip any any (implicite)</td>
              <td className="px-1" style={{ color: premier < 0 ? "#ef4444" : "#64748b" }}>{premier < 0 ? "✓ DENY" : "non évaluée"}</td><td />
            </tr>
          </tbody>
        </table>
      </div>
      <button onClick={() => { setAces((as) => [...as, { id: nextId, action: "deny", proto: "tcp", src: "0.0.0.0", srcWc: "255.255.255.255", dst: "0.0.0.0", dstWc: "255.255.255.255", port: "23" }]); setNextId((n) => n + 1); }}
        className="w-full py-1.5 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white">+ Ajouter une ligne</button>

      <Divider />
      <p className="text-xs font-semibold text-[#94a3b8]">Paquet à tester</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Select label="Protocole" value={pkt.proto} onChange={(v) => setPkt({ ...pkt, proto: v })} options={(["tcp", "udp", "icmp"] as Proto[]).map((p) => ({ value: p, label: p }))} />
        <Field text label="IP source" value={pkt.src} onChange={(v) => setPkt({ ...pkt, src: v })} />
        <Field text label="IP destination" value={pkt.dst} onChange={(v) => setPkt({ ...pkt, dst: v })} />
        <Field text label="Port destination" value={pkt.port} onChange={(v) => setPkt({ ...pkt, port: v })} />
      </div>
      <Result label="Verdict" value={premier < 0 ? "REJETÉ (deny implicite)" : `${aces[premier].action === "permit" ? "AUTORISÉ" : "REJETÉ"} par la ligne ${(premier + 1) * 10}`} accent />
      <div className="flex flex-wrap gap-2">
        {[["SSH vers le serveur", "tcp", "192.168.10.25", "10.0.0.80", "22"], ["Web vers le serveur", "tcp", "192.168.10.25", "10.0.0.80", "80"], ["Ping vers 10.0.0.5", "icmp", "192.168.10.25", "10.0.0.5", ""], ["Autre réseau", "tcp", "172.16.0.9", "10.0.0.80", "22"]].map(([l, p, s2, d2, po]) => (
          <button key={l} onClick={() => setPkt({ proto: p as Proto, src: s2, dst: d2, port: po })} className="px-2 py-1 text-xs border border-[#2a2d3a] text-[#94a3b8] rounded hover:text-white">{l}</button>
        ))}
      </div>
      <Divider />
      <p className="text-xs text-[#64748b]">Configuration Cisco équivalente :</p>
      <pre className="text-[11px] leading-5 text-[#94a3b8] bg-black/30 rounded-lg p-3 overflow-x-auto">{[
        "ip access-list extended FILTRE",
        ...aces.map((a, i) => ` ${(i + 1) * 10} ${a.action} ${a.proto} ${adresseCisco(a.src, a.srcWc)} ${adresseCisco(a.dst, a.dstWc)}${a.port && (a.proto === "tcp" || a.proto === "udp") ? ` eq ${a.port}` : ""}`),
        "!", "interface g0/0", " ip access-group FILTRE in",
      ].join("\n")}</pre>
    </Card>
  );
}

export default function AclPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🚦 ACL & wildcard</h1>
      <p className="text-[#64748b] text-sm mb-8">Masques génériques et listes de contrôle d&apos;accès Cisco : teste un paquet contre une ACL ligne par ligne.</p>
      <div className="space-y-5">
        <ACL />
        <Wildcard />
      </div>
    </div>
  );
}
