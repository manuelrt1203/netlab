"use client";
import { useState } from "react";
import { Card, Field, Result, Divider, Hint, Tabs } from "@/components/ui/Calc";
import { parseCidr, intToIp, maskToString, ipv6Groups, ipv6Full, ipv6Compress } from "@/lib/ip";

/* ═══ VLSM ═══════════════════════════════════════════════════════════ */
interface Besoin { id: number; nom: string; hotes: string }
interface Alloc { nom: string; hotes: number; prefix: number; net: number; taille: number }

const COULEURS = ["#00d4ff", "#ec4899", "#22c55e", "#f59e0b", "#a78bfa", "#06b6d4", "#ef4444", "#84cc16"];

/** Plus petit préfixe offrant au moins h adresses utilisables (réseau + broadcast réservés) */
function prefixPour(h: number): number {
  if (h <= 2) return 30; // /31 (RFC 3021) volontairement ignoré : hors programme
  return 32 - Math.ceil(Math.log2(h + 2));
}

function vlsm(base: { net: number; prefix: number }, besoins: Besoin[]) {
  const tries = besoins
    .map((b) => ({ nom: b.nom || "?", hotes: Math.max(1, parseInt(b.hotes) || 0) }))
    .sort((a, b) => b.hotes - a.hotes);
  const fin = base.net + 2 ** (32 - base.prefix);
  const allocs: Alloc[] = [];
  let curseur = base.net;
  for (const b of tries) {
    const prefix = prefixPour(b.hotes);
    const taille = 2 ** (32 - prefix);
    curseur = Math.ceil(curseur / taille) * taille; // alignement sur la taille du bloc
    if (prefix < base.prefix || curseur + taille > fin) return { allocs, erreur: `Plus assez d'espace pour « ${b.nom} » (${b.hotes} hôtes → /${prefix}).` };
    allocs.push({ ...b, prefix, net: curseur, taille });
    curseur += taille;
  }
  return { allocs, erreur: null, utilise: curseur - base.net, total: fin - base.net };
}

function VLSM() {
  const [reseau, setReseau] = useState("192.168.10.0/24");
  const [besoins, setBesoins] = useState<Besoin[]>([
    { id: 1, nom: "LAN Étudiants", hotes: "100" }, { id: 2, nom: "LAN Profs", hotes: "50" },
    { id: 3, nom: "LAN Admin", hotes: "20" }, { id: 4, nom: "Serveurs", hotes: "10" },
    { id: 5, nom: "Lien R1-R2", hotes: "2" },
  ]);
  const [nextId, setNextId] = useState(6);

  const base = parseCidr(reseau);
  const res = base ? vlsm(base, besoins) : null;
  const maj = (id: number, p: Partial<Besoin>) => setBesoins((bs) => bs.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const total = base ? 2 ** (32 - base.prefix) : 1;

  return (
    <Card color="#00d4ff" title="Découpage VLSM" formula="préfixe = 32 − ⌈log₂(hôtes + 2)⌉   — on alloue du plus grand au plus petit sous-réseau"
      explainer={<>
        <p>Le VLSM (masque de longueur variable) donne à chaque sous-réseau un masque adapté à son nombre d&apos;hôtes, au lieu d&apos;un masque unique pour tous. On évite ainsi de gaspiller des adresses, par exemple un /24 entier pour un lien point à point de 2 routeurs.</p>
        <p>Méthode : trier les besoins par taille décroissante, puis pour chacun prendre le plus petit bloc 2ⁿ tel que 2ⁿ − 2 ≥ hôtes (on retire les adresses réseau et broadcast), placé à la première adresse libre alignée sur sa taille.</p>
      </>}>
      <Field text label="Réseau à découper (CIDR)" value={reseau} onChange={setReseau} />
      {!base ? <Hint>Réseau invalide (ex. 192.168.10.0/24).</Hint> : <>
        {base.raw !== base.net && <Hint>Adresse ramenée au réseau {intToIp(base.net)}/{base.prefix}.</Hint>}
        <div className="space-y-2">
          {besoins.map((b) => (
            <div key={b.id} className="flex gap-2 items-center">
              <input value={b.nom} onChange={(e) => maj(b.id, { nom: e.target.value })}
                className="flex-1 min-w-0 bg-[#0f1117] border border-[#2a2d3a] px-2 py-1.5 rounded text-xs" />
              <input type="number" value={b.hotes} onChange={(e) => maj(b.id, { hotes: e.target.value })}
                className="w-20 bg-[#0f1117] border border-[#2a2d3a] px-2 py-1.5 rounded text-xs font-mono" />
              <span className="text-[10px] text-[#64748b]">hôtes</span>
              <button onClick={() => setBesoins((bs) => bs.filter((x) => x.id !== b.id))} className="text-[#ef4444] text-xs px-1">✕</button>
            </div>
          ))}
          <button onClick={() => { setBesoins((bs) => [...bs, { id: nextId, nom: `Sous-réseau ${nextId}`, hotes: "10" }]); setNextId((n) => n + 1); }}
            className="w-full py-1.5 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white">+ Ajouter un sous-réseau</button>
        </div>

        {res && res.allocs.length > 0 && <>
          <div className="flex h-7 rounded overflow-hidden border border-[#2a2d3a]">
            {res.allocs.map((a, i) => (
              <div key={i} title={`${a.nom} — ${intToIp(a.net)}/${a.prefix}`} className="h-full"
                style={{ width: `${(a.taille / total) * 100}%`, marginLeft: i === 0 ? `${((a.net - base.net) / total) * 100}%` : `${((a.net - (res.allocs[i - 1].net + res.allocs[i - 1].taille)) / total) * 100}%`, background: COULEURS[i % COULEURS.length], opacity: 0.8 }} />
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono min-w-[720px]">
              <thead>
                <tr className="text-[#64748b] border-b border-[#2a2d3a] text-left">
                  {["Sous-réseau", "Besoin", "Réseau", "Masque", "1re utilisable", "Dernière utilisable", "Broadcast", "Dispo", "Perte"].map((h) => <th key={h} className="py-1.5 px-1 font-normal">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {res.allocs.map((a, i) => {
                  const dispo = a.prefix >= 31 ? a.taille : a.taille - 2;
                  return (
                    <tr key={i} className="border-b border-[#1c1f2a]">
                      <td className="py-1 px-1 font-sans" style={{ color: COULEURS[i % COULEURS.length] }}>{a.nom}</td>
                      <td className="px-1">{a.hotes}</td>
                      <td className="px-1 text-[#e2e8f0]">{intToIp(a.net)}/{a.prefix}</td>
                      <td className="px-1 text-[#94a3b8]">{maskToString(a.prefix)}</td>
                      <td className="px-1">{a.prefix >= 31 ? intToIp(a.net) : intToIp(a.net + 1)}</td>
                      <td className="px-1">{a.prefix >= 31 ? intToIp(a.net + a.taille - 1) : intToIp(a.net + a.taille - 2)}</td>
                      <td className="px-1 text-[#94a3b8]">{a.prefix >= 31 ? "—" : intToIp(a.net + a.taille - 1)}</td>
                      <td className="px-1">{dispo}</td>
                      <td className="px-1 text-[#f59e0b]">{Math.max(0, dispo - a.hotes)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}
        <Divider />
        {res?.erreur ? <Hint>✗ {res.erreur}</Hint> : res && "utilise" in res && (
          <>
            <Result label="Adresses allouées" value={`${res.utilise} / ${res.total} (${((res.utilise! / res.total!) * 100).toFixed(1)} %)`} accent />
            <Result label="Prochaine adresse libre" value={`${intToIp(base.net + res.utilise!)}`} />
          </>
        )}
      </>}
    </Card>
  );
}

/* ═══ IPv6 ═══════════════════════════════════════════════════════════ */
function typeIPv6(g: number[]): { nom: string; desc: string } {
  const h = g[0];
  if (g.every((x) => x === 0)) return { nom: "Non spécifiée (::)", desc: "Adresse « aucune », utilisée comme source avant configuration." };
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return { nom: "Boucle locale (::1)", desc: "Équivalent de 127.0.0.1." };
  if ((h & 0xffc0) === 0xfe80) return { nom: "Lien local (fe80::/10)", desc: "Valable uniquement sur le lien, jamais routée. Toujours présente sur chaque interface IPv6." };
  if ((h & 0xfe00) === 0xfc00) return { nom: "Unique locale ULA (fc00::/7)", desc: "Équivalent des adresses privées IPv4, non routée sur Internet." };
  if ((h & 0xff00) === 0xff00) return { nom: "Multicast (ff00::/8)", desc: "ff02::1 = tous les nœuds du lien, ff02::2 = tous les routeurs. IPv6 n'a pas de broadcast." };
  if (h === 0x2001 && g[1] === 0x0db8) return { nom: "Documentation (2001:db8::/32)", desc: "Réservée aux exemples et aux cours." };
  if ((h & 0xe000) === 0x2000) return { nom: "Globale unicast (2000::/3)", desc: "Adresse publique routable sur Internet." };
  return { nom: "Autre / réservée", desc: "" };
}

function IPv6Outil() {
  const [adr, setAdr] = useState("2001:0db8:0000:0000:0000:ff00:0042:8329/64");
  const [mac, setMac] = useState("00:1A:2B:3C:4D:5E");
  const [pref, setPref] = useState("2001:db8:acad:1::/64");

  const g = ipv6Groups(adr);
  const prefixLen = Number(adr.split("/")[1] ?? 64);
  const t = g ? typeIPv6(g) : null;

  // Préfixe réseau : on met à zéro les bits au-delà de prefixLen
  const reseau = g ? g.map((x, i) => {
    const bitsAvant = i * 16;
    if (prefixLen >= bitsAvant + 16) return x;
    if (prefixLen <= bitsAvant) return 0;
    return x & ((0xffff << (16 - (prefixLen - bitsAvant))) & 0xffff);
  }) : null;

  // EUI-64
  const octetsMac = mac.trim().split(/[:\-.]/).join("").match(/^[0-9a-fA-F]{12}$/) ? mac.replace(/[:\-.]/g, "").match(/.{2}/g)!.map((h) => parseInt(h, 16)) : null;
  const eui = octetsMac ? [octetsMac[0] ^ 0x02, octetsMac[1], octetsMac[2], 0xff, 0xfe, octetsMac[3], octetsMac[4], octetsMac[5]] : null;
  const idInterface = eui ? [0, 2, 4, 6].map((i) => (eui[i] << 8) | eui[i + 1]) : null;
  const gp = ipv6Groups(pref);
  const hex2 = (n: number) => n.toString(16).padStart(2, "0");

  return (
    <div className="space-y-5">
      <Card color="#a78bfa" title="Écriture d'une adresse IPv6" formula="128 bits = 8 groupes de 16 bits en hexadécimal"
        explainer={<>
          <p>Deux règles de simplification : on supprime les <strong>zéros en tête</strong> de chaque groupe (0db8 → db8), et on remplace <strong>une seule</strong> suite de groupes nuls par <code>::</code> (la plus longue, sinon l&apos;adresse serait ambiguë).</p>
          <p>Le préfixe /64 est la norme pour un réseau local : les 64 premiers bits identifient le réseau, les 64 derniers l&apos;interface.</p>
        </>}>
        <Field text label="Adresse IPv6 (avec ou sans /préfixe)" value={adr} onChange={setAdr} />
        {!g ? <Hint>Adresse invalide.</Hint> : <>
          <Result label="Forme complète" value={ipv6Full(g)} />
          <Result label="Forme compressée" value={ipv6Compress(g)} accent />
          <Result label="Type" value={t!.nom} accent />
          {t!.desc && <Hint>{t!.desc}</Hint>}
          <Divider />
          <Result label={`Préfixe réseau /${prefixLen}`} value={`${ipv6Compress(reseau!)}/${prefixLen}`} accent />
          <Result label="Identifiant d'interface" value={prefixLen <= 64 ? g.slice(4).map((x) => x.toString(16)).join(":") : "—"} />
          {prefixLen <= 64 && <Result label={`Sous-réseaux /64 dans ce /${prefixLen}`} value={prefixLen === 64 ? "1" : `2^${64 - prefixLen} = ${(2 ** (64 - prefixLen)).toLocaleString("fr-FR")}`} />}
          <div className="bg-black/30 rounded-lg p-3 overflow-x-auto">
            <div className="flex gap-1 font-mono text-xs">
              {g.map((x, i) => (
                <span key={i} className="px-1.5 py-1 rounded" style={i * 16 < prefixLen ? { background: "#a78bfa22", color: "#a78bfa" } : { background: "#22c55e18", color: "#22c55e" }}>
                  {x.toString(16).padStart(4, "0")}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-[#64748b] mt-2"><span className="text-[#a78bfa]">■</span> partie réseau · <span className="text-[#22c55e]">■</span> partie interface</p>
          </div>
        </>}
      </Card>

      <Card color="#22c55e" title="EUI-64 : identifiant d'interface à partir de la MAC" formula="MAC 48 bits → couper en deux, insérer FFFE, inverser le 7e bit (U/L)"
        explainer={<>
          <p>Avec SLAAC (autoconfiguration sans état), une machine peut fabriquer seule son adresse : le routeur annonce le préfixe /64, et la machine construit les 64 bits d&apos;interface à partir de sa MAC.</p>
          <p>On coupe la MAC en deux, on insère <code>FF:FE</code> au milieu, puis on inverse le 7e bit du premier octet (bit U/L). Les systèmes récents utilisent plutôt des identifiants aléatoires pour la vie privée (RFC 4941), mais Cisco utilise EUI-64 avec <code>ipv6 address … eui-64</code>.</p>
        </>}>
        <div className="grid sm:grid-cols-2 gap-2">
          <Field text label="Adresse MAC" value={mac} onChange={setMac} />
          <Field text label="Préfixe annoncé /64" value={pref} onChange={setPref} />
        </div>
        {!octetsMac ? <Hint>MAC invalide (ex. 00:1A:2B:3C:4D:5E).</Hint> : <>
          <div className="bg-black/30 rounded-lg p-3 text-xs font-mono space-y-1.5 overflow-x-auto">
            <div><span className="text-[#64748b] inline-block w-44">1. MAC</span>{octetsMac.map(hex2).join(":")}</div>
            <div><span className="text-[#64748b] inline-block w-44">2. Insertion de FFFE</span>{octetsMac.slice(0, 3).map(hex2).join(":")}:<span className="text-[#f59e0b]">ff:fe</span>:{octetsMac.slice(3).map(hex2).join(":")}</div>
            <div><span className="text-[#64748b] inline-block w-44">3. 1er octet en binaire</span>{octetsMac[0].toString(2).padStart(8, "0").slice(0, 6)}<span className="text-[#ef4444]">{octetsMac[0].toString(2).padStart(8, "0")[6]}</span>{octetsMac[0].toString(2).padStart(8, "0")[7]} → {(octetsMac[0] ^ 2).toString(2).padStart(8, "0").slice(0, 6)}<span className="text-[#22c55e]">{(octetsMac[0] ^ 2).toString(2).padStart(8, "0")[6]}</span>{(octetsMac[0] ^ 2).toString(2).padStart(8, "0")[7]}  ({hex2(octetsMac[0])} → {hex2(octetsMac[0] ^ 2)})</div>
            <div><span className="text-[#64748b] inline-block w-44">4. Identifiant d&apos;interface</span><span className="text-[#22c55e]">{idInterface!.map((x) => x.toString(16).padStart(4, "0")).join(":")}</span></div>
          </div>
          <Result label="Adresse lien local" value={ipv6Compress([0xfe80, 0, 0, 0, ...idInterface!])} accent />
          <Result label="Adresse globale (préfixe + EUI-64)" value={gp ? ipv6Compress([...gp.slice(0, 4), ...idInterface!]) : "préfixe invalide"} accent />
        </>}
      </Card>
    </div>
  );
}

type Onglet = "vlsm" | "ipv6";
const ONGLETS: { id: Onglet; icon: string; label: string; desc: string; color: string }[] = [
  { id: "vlsm", icon: "🧩", label: "VLSM", desc: "Découpage à masque variable", color: "#00d4ff" },
  { id: "ipv6", icon: "6️⃣", label: "IPv6", desc: "Compression, types, préfixe, EUI-64", color: "#a78bfa" },
];

export default function VlsmIpv6Page() {
  const [onglet, setOnglet] = useState<Onglet>("vlsm");
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🧩 VLSM & IPv6</h1>
      <p className="text-[#64748b] text-sm mb-6">Plan d&apos;adressage IPv4 optimisé et manipulation des adresses IPv6.</p>
      <Tabs tabs={ONGLETS} value={onglet} onChange={setOnglet} />
      {onglet === "vlsm" ? <VLSM /> : <IPv6Outil />}
    </div>
  );
}
