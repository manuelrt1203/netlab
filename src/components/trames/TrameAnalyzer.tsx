"use client";
import { useState, useMemo } from "react";

// ── Types ──────────────────────────────────────────────────────────────────────

type Field = {
  name: string;
  value: string;
  start: number;
  end: number;
  desc: string;
};

type Layer = {
  name: string;
  color: string;
  bg: string;
  start: number;
  end: number;
  fields: Field[];
};

// ── Presets ────────────────────────────────────────────────────────────────────

const PRESETS = [
  {
    label: "ARP Request",
    desc: "Qui a l'IP 192.168.1.100 ?",
    color: "#a78bfa",
    hex: "ffffffffffff aabbccddeeff 0806 0001 0800 06 04 0001 aabbccddeeff c0a80101 000000000000 c0a80164",
  },
  {
    label: "ICMP Ping",
    desc: "Echo Request vers 192.168.1.100",
    color: "#f87171",
    hex: "001122334455 aabbccddeeff 0800 4500001cabcd0000400100000c0a80101c0a80164 0800f7ff00010001",
  },
  {
    label: "TCP SYN",
    desc: "Ouverture de connexion HTTP",
    color: "#c084fc",
    hex: "001122334455 aabbccddeeff 0800 45000028123440004006000ac0a80164d83ad64e c0000050000000010000000050027210 00000000",
  },
  {
    label: "UDP DNS",
    desc: "Requête DNS → 8.8.8.8",
    color: "#fb923c",
    hex: "001122334455 aabbccddeeff 0800 4500003c567800004011b23ac0a8016408080808 c0010035002800000 abcd0100000100000000000007 6578616d706c6503636f6d0000010001",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array | null {
  const clean = hex.replace(/[\s:]/g, "");
  if (clean.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(clean)) return null;
  const b = new Uint8Array(clean.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return b;
}

function mac(b: Uint8Array, o: number) {
  return Array.from(b.slice(o, o + 6)).map(x => x.toString(16).padStart(2, "0")).join(":");
}
function ip4(b: Uint8Array, o: number) { return `${b[o]}.${b[o+1]}.${b[o+2]}.${b[o+3]}`; }
function u16(b: Uint8Array, o: number) { return (b[o] << 8) | b[o + 1]; }
function u32(b: Uint8Array, o: number) { return ((b[o] << 24) | (b[o+1] << 16) | (b[o+2] << 8) | b[o+3]) >>> 0; }
function hex4(v: number) { return "0x" + v.toString(16).padStart(4, "0").toUpperCase(); }

// ── Parsers ───────────────────────────────────────────────────────────────────

const ETHERTYPES: Record<number, string> = { 0x0800: "IPv4", 0x0806: "ARP", 0x86DD: "IPv6", 0x8100: "VLAN (802.1Q)", 0x0842: "WoL" };
const IP_PROTOS: Record<number, string>  = { 1: "ICMP", 6: "TCP", 17: "UDP", 89: "OSPF", 132: "SCTP" };
const PORTS: Record<number, string>      = { 20:"FTP-data", 21:"FTP", 22:"SSH", 23:"Telnet", 25:"SMTP", 53:"DNS", 67:"DHCP srv", 68:"DHCP clt", 80:"HTTP", 110:"POP3", 123:"NTP", 143:"IMAP", 161:"SNMP", 443:"HTTPS", 3306:"MySQL", 5353:"mDNS" };

function f(name: string, value: string, start: number, end: number, desc: string): Field {
  return { name, value, start, end, desc };
}

function parseEthernet(b: Uint8Array): Layer {
  const et = u16(b, 12);
  const isBroadcast = b.slice(0, 6).every(x => x === 0xff);
  return {
    name: "Ethernet II", color: "#60a5fa", bg: "#1e3a5f22",
    start: 0, end: 14,
    fields: [
      f("Destination MAC", mac(b, 0) + (isBroadcast ? "  (Broadcast)" : ""), 0, 6,
        "Adresse MAC du destinataire. FF:FF:FF:FF:FF:FF = diffusion vers toutes les machines du réseau local."),
      f("Source MAC", mac(b, 6), 6, 12,
        "Adresse MAC de l'émetteur. Gravée dans la carte réseau (NIC), unique mondialement (OUI + numéro fabricant)."),
      f("EtherType", `${hex4(et)}  —  ${ETHERTYPES[et] ?? "Inconnu"}`, 12, 14,
        `Identifie le protocole de couche 3 transporté. 0x0800 = IPv4, 0x0806 = ARP, 0x86DD = IPv6.`),
    ],
  };
}

function parseARP(b: Uint8Array, o: number): Layer {
  const op = u16(b, o + 6);
  return {
    name: "ARP", color: "#a78bfa", bg: "#3b1f7a22",
    start: o, end: o + 28,
    fields: [
      f("Hardware Type", u16(b, o) === 1 ? "1  —  Ethernet" : String(u16(b, o)), o, o+2,
        "Type de réseau physique. 1 = Ethernet IEEE 802.3."),
      f("Protocol Type", u16(b, o+2) === 0x0800 ? "0x0800  —  IPv4" : hex4(u16(b, o+2)), o+2, o+4,
        "Protocole de couche 3. 0x0800 = IPv4."),
      f("HW Addr Length", `${b[o+4]} octet(s)`, o+4, o+5,
        "Longueur d'une adresse matérielle. 6 pour MAC Ethernet."),
      f("Proto Addr Length", `${b[o+5]} octet(s)`, o+5, o+6,
        "Longueur d'une adresse protocole. 4 pour IPv4."),
      f("Opcode", op === 1 ? "1  —  Requête (Request)" : op === 2 ? "2  —  Réponse (Reply)" : `${op}  —  Inconnu`, o+6, o+8,
        "1 = « Qui a cette IP ? » (broadcast). 2 = « C'est moi ! » (unicast vers le demandeur)."),
      f("Sender MAC", mac(b, o+8), o+8, o+14,
        "Adresse MAC de la machine qui émet la trame ARP."),
      f("Sender IP", ip4(b, o+14), o+14, o+18,
        "Adresse IP de la machine émettrice."),
      f("Target MAC", mac(b, o+18) + (b[o+18] === 0 && b[o+19] === 0 ? "  (inconnue)" : ""), o+18, o+24,
        "MAC de la cible recherchée. Mise à 00:00:00:00:00:00 dans une requête car inconnue."),
      f("Target IP", ip4(b, o+24), o+24, o+28,
        "IP recherchée dans une requête ARP, ou IP du demandeur dans une réponse."),
    ],
  };
}

function parseIPv4(b: Uint8Array, o: number): { layer: Layer; ihl: number; proto: number } {
  const ihl = (b[o] & 0x0f) * 4;
  const proto = b[o + 9];
  const flagsB = b[o + 6] >> 5;
  const fragOff = ((b[o + 6] & 0x1f) << 8) | b[o + 7];
  const flagStr = [flagsB & 2 ? "DF" : "", flagsB & 1 ? "MF" : ""].filter(Boolean).join(", ") || "Aucun";
  return {
    layer: {
      name: "IPv4", color: "#34d399", bg: "#05402022",
      start: o, end: o + ihl,
      fields: [
        f("Version", `${b[o] >> 4}  (IPv4)`, o, o+1, "Version du protocole IP. 4 = IPv4, 6 = IPv6."),
        f("IHL", `${b[o] & 0xf}  →  ${ihl} octets`, o, o+1,
          "Internet Header Length : longueur de l'en-tête en mots de 32 bits. Minimum 5 (20 octets). Augmente si options présentes."),
        f("DSCP / ECN", hex4(b[o+1]), o+1, o+2,
          "Qualité de service (6 bits DSCP) + notification de congestion (2 bits ECN). Souvent à 0x00."),
        f("Total Length", `${u16(b, o+2)} octets`, o+2, o+4,
          "Longueur totale du paquet IP = en-tête + données. Utilisé par le récepteur pour délimiter le paquet."),
        f("Identification", hex4(u16(b, o+4)), o+4, o+6,
          "Identifiant unique du datagramme. Permet de ré-assembler les fragments d'un même paquet."),
        f("Flags", flagStr, o+6, o+7,
          "DF (Don't Fragment) : interdit la fragmentation par les routeurs. MF (More Fragments) : d'autres fragments suivent."),
        f("Fragment Offset", `${fragOff * 8} octets`, o+6, o+8,
          "Position en octets de ce fragment dans le datagramme original. 0 si pas de fragmentation."),
        f("TTL", `${b[o+8]} sauts`, o+8, o+9,
          "Time To Live : décrémenté de 1 à chaque routeur. Quand TTL=0, le routeur détruit le paquet et envoie un ICMP « Time Exceeded »."),
        f("Protocol", `${proto}  —  ${IP_PROTOS[proto] ?? "Inconnu"}`, o+9, o+10,
          `Protocole de couche 4 encapsulé. 1=ICMP, 6=TCP, 17=UDP.`),
        f("Header Checksum", hex4(u16(b, o+10)), o+10, o+12,
          "Somme de contrôle de l'en-tête IPv4 uniquement (pas des données). Recalculée à chaque routeur (TTL change)."),
        f("Source IP", ip4(b, o+12), o+12, o+16,
          "Adresse IP source. Peut être falsifiée (IP spoofing) — IPv4 ne l'authentifie pas nativement."),
        f("Destination IP", ip4(b, o+16), o+16, o+20,
          "Adresse IP de destination. Utilisée par les routeurs pour acheminer le paquet."),
      ],
    },
    ihl, proto,
  };
}

function parseICMP(b: Uint8Array, o: number): Layer {
  const type = b[o], code = b[o + 1];
  const typeNames: Record<number, string> = { 0:"Echo Reply", 3:"Destination Unreachable", 5:"Redirect", 8:"Echo Request", 11:"Time Exceeded" };
  return {
    name: "ICMP", color: "#f87171", bg: "#4a1c1c22",
    start: o, end: Math.min(b.length, o + 8),
    fields: [
      f("Type", `${type}  —  ${typeNames[type] ?? "Inconnu"}`, o, o+1,
        "8=Ping envoyé, 0=Réponse ping, 3=Destination inaccessible, 11=TTL expiré (traceroute)."),
      f("Code", `${code}`, o+1, o+2,
        "Sous-type du message. Pour Echo Request/Reply (ping), code=0. Pour Unreachable, code précise la raison (0=réseau, 1=hôte, 3=port…)."),
      f("Checksum", hex4(u16(b, o+2)), o+2, o+4,
        "Somme de contrôle ICMP (en-tête + données)."),
      f("Identifier", `${u16(b, o+4)}`, o+4, o+6,
        "Identifiant de session ping. Permet d'associer une requête à sa réponse quand plusieurs pings sont en vol."),
      f("Sequence", `${u16(b, o+6)}`, o+6, o+8,
        "Numéro de séquence, incrémenté à chaque Echo Request. Détecte les pertes et les réordonnements."),
    ],
  };
}

function parseTCP(b: Uint8Array, o: number): Layer {
  const dataOff = (b[o + 12] >> 4) * 4;
  const fl = b[o + 13];
  const flags = [fl&0x01?"FIN":"", fl&0x02?"SYN":"", fl&0x04?"RST":"", fl&0x08?"PSH":"", fl&0x10?"ACK":"", fl&0x20?"URG":""].filter(Boolean).join(" | ") || "Aucun";
  const sp = u16(b, o), dp = u16(b, o+2);
  return {
    name: "TCP", color: "#c084fc", bg: "#2d1b4e22",
    start: o, end: o + dataOff,
    fields: [
      f("Source Port", `${sp}${PORTS[sp] ? "  —  " + PORTS[sp] : ""}`, o, o+2,
        "Port source. < 1024 = ports privilégiés. > 1024 = ports éphémères (client). Identifie le processus émetteur."),
      f("Destination Port", `${dp}${PORTS[dp] ? "  —  " + PORTS[dp] : ""}`, o+2, o+4,
        "Port destination. 80=HTTP, 443=HTTPS, 22=SSH, 53=DNS. Identifie le service cible."),
      f("Sequence Number", `${u32(b, o+4)}`, o+4, o+8,
        "Numéro de l'octet de début des données dans le flux. Aléatoire à l'ouverture (ISN) pour la sécurité."),
      f("Ack Number", `${u32(b, o+8)}`, o+8, o+12,
        "Numéro du prochain octet attendu de l'autre côté. Valide seulement si flag ACK activé."),
      f("Data Offset", `${b[o+12]>>4}  →  ${dataOff} octets`, o+12, o+13,
        "Longueur de l'en-tête TCP en mots de 32 bits. Minimum 5 (20 octets). Augmente avec les options (SACK, timestamps…)."),
      f("Flags", flags, o+13, o+14,
        "SYN=ouverture connexion, ACK=accusé réception, FIN=fermeture propre, RST=réinitialisation forcée, PSH=envoi immédiat, URG=données urgentes."),
      f("Window Size", `${u16(b, o+14)} octets`, o+14, o+16,
        "Taille du tampon de réception disponible. Contrôle de flux : l'émetteur ne peut envoyer que ce que la fenêtre autorise."),
      f("Checksum", hex4(u16(b, o+16)), o+16, o+18,
        "Couvre l'en-tête TCP + données + pseudo-en-tête IP (src/dst IP, protocole, longueur)."),
      f("Urgent Pointer", `${u16(b, o+18)}`, o+18, o+20,
        "Valide si URG activé. Indique le décalage des données urgentes par rapport au numéro de séquence."),
    ],
  };
}

function parseUDP(b: Uint8Array, o: number): Layer {
  const sp = u16(b, o), dp = u16(b, o+2);
  return {
    name: "UDP", color: "#fb923c", bg: "#7c2d0022",
    start: o, end: o + 8,
    fields: [
      f("Source Port", `${sp}${PORTS[sp] ? "  —  " + PORTS[sp] : ""}`, o, o+2,
        "Port source de l'émetteur (éphémère si client)."),
      f("Destination Port", `${dp}${PORTS[dp] ? "  —  " + PORTS[dp] : ""}`, o+2, o+4,
        "Port destination. 53=DNS, 67/68=DHCP, 123=NTP, 161=SNMP. UDP n'ouvre pas de connexion."),
      f("Length", `${u16(b, o+4)} octets`, o+4, o+6,
        "Longueur totale du segment UDP = 8 (en-tête) + données. Minimum 8."),
      f("Checksum", hex4(u16(b, o+6)), o+6, o+8,
        "Optionnel en IPv4 (0x0000 = non calculé). Obligatoire en IPv6. Couvre pseudo-en-tête + UDP."),
    ],
  };
}

function parseFrame(hex: string): { layers: Layer[]; raw: Uint8Array; error?: string } {
  const raw = hexToBytes(hex);
  if (!raw) return { layers: [], raw: new Uint8Array(), error: "Hex invalide — vérifier les caractères (0-9, a-f) et la longueur (paire)." };
  if (raw.length < 14) return { layers: [], raw, error: `Trame trop courte : ${raw.length} octet(s) (minimum 14 pour Ethernet).` };

  const layers: Layer[] = [];
  layers.push(parseEthernet(raw));
  const et = u16(raw, 12);

  if (et === 0x0806) {
    if (raw.length >= 42) layers.push(parseARP(raw, 14));
  } else if (et === 0x0800) {
    if (raw.length < 34) return { layers, raw, error: "En-tête IPv4 tronquée." };
    const { layer: ipL, ihl, proto } = parseIPv4(raw, 14);
    layers.push(ipL);
    const next = 14 + ihl;
    if      (proto === 1  && raw.length >= next + 8)  layers.push(parseICMP(raw, next));
    else if (proto === 6  && raw.length >= next + 20) layers.push(parseTCP(raw, next));
    else if (proto === 17 && raw.length >= next + 8)  layers.push(parseUDP(raw, next));
  }

  const lastEnd = layers[layers.length - 1]?.end ?? 0;
  if (lastEnd < raw.length) {
    const rem = raw.length - lastEnd;
    layers.push({
      name: "Payload", color: "#94a3b8", bg: "#2a2d3a22",
      start: lastEnd, end: raw.length,
      fields: [f("Données", `${rem} octet(s)`, lastEnd, raw.length, "Données applicatives — HTTP, DNS, contenu de la requête, etc.")],
    });
  }
  return { layers, raw };
}

// ── Bytes view ────────────────────────────────────────────────────────────────

function BytesView({ raw, layers, active, onHover, onClick }: {
  raw: Uint8Array;
  layers: Layer[];
  active: Field | null;
  onHover: (f: Field | null) => void;
  onClick: (f: Field | null) => void;
}) {
  const byteField = useMemo(() => {
    const map: (Field | null)[] = new Array(raw.length).fill(null);
    for (const l of layers) for (const fld of l.fields) for (let i = fld.start; i < fld.end; i++) map[i] = fld;
    return map;
  }, [raw, layers]);

  const byteLayer = useMemo(() => {
    const map: (Layer | null)[] = new Array(raw.length).fill(null);
    for (const l of layers) for (let i = l.start; i < l.end; i++) map[i] = l;
    return map;
  }, [raw, layers]);

  const COLS = 16;
  const rows: number[][] = [];
  for (let i = 0; i < raw.length; i += COLS) rows.push(Array.from({ length: Math.min(COLS, raw.length - i) }, (_, j) => i + j));

  return (
    <div className="font-mono text-xs overflow-x-auto">
      {rows.map((row, ri) => (
        <div key={ri} className="flex items-center gap-3 hover:bg-white/[0.02] px-1 rounded">
          {/* offset */}
          <span className="text-[#2a2d3a] w-8 shrink-0 select-none">{(ri * COLS).toString(16).padStart(4, "0")}</span>
          {/* hex */}
          <div className="flex gap-0.5 flex-1">
            {row.map(i => {
              const layer = byteLayer[i];
              const field = byteField[i];
              const isActive = active && field?.name === active.name;
              return (
                <span key={i}
                  className="w-5 text-center rounded cursor-pointer transition-all select-none"
                  style={{
                    background: isActive ? (layer?.color + "44") : (layer?.bg ?? "transparent"),
                    color: isActive ? layer?.color : "#64748b",
                    outline: active && field === active ? `1px solid ${layer?.color ?? "#fff"}55` : "none",
                  }}
                  onMouseEnter={() => field && onHover(field)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onClick(field === active ? null : field)}>
                  {raw[i].toString(16).padStart(2, "0")}
                </span>
              );
            })}
            {row.length < COLS && <span className="flex-1" />}
          </div>
          {/* separator */}
          <span className="text-[#2a2d3a] select-none">│</span>
          {/* ascii */}
          <div className="flex w-32 shrink-0">
            {row.map(i => {
              const layer = byteLayer[i];
              const field = byteField[i];
              const isActive = active && field?.name === active.name;
              const ch = raw[i] >= 0x20 && raw[i] < 0x7f ? String.fromCharCode(raw[i]) : "·";
              return (
                <span key={i}
                  className="w-2 cursor-pointer select-none"
                  style={{ color: isActive ? layer?.color : "#475569" }}
                  onMouseEnter={() => field && onHover(field)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onClick(field === active ? null : field)}>
                  {ch}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Layer tree ────────────────────────────────────────────────────────────────

function LayerTree({ layers, active, onSelect }: {
  layers: Layer[];
  active: Field | null;
  onSelect: (f: Field | null) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  return (
    <div className="space-y-1.5 font-mono text-xs">
      {layers.map(layer => {
        const isOpen = open[layer.name] !== false;
        return (
          <div key={layer.name} className="rounded-lg overflow-hidden border" style={{ borderColor: layer.color + "33" }}>
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-left"
              style={{ background: layer.bg, color: layer.color }}
              onClick={() => setOpen(o => ({ ...o, [layer.name]: !isOpen }))}>
              <span className="text-[10px]">{isOpen ? "▼" : "▶"}</span>
              <span className="font-bold">{layer.name}</span>
              <span className="text-[#64748b] text-[10px] ml-auto">{layer.end - layer.start} oct. · offset {layer.start}</span>
            </button>
            {isOpen && (
              <div className="divide-y divide-[#2a2d3a]">
                {layer.fields.map(field => {
                  const isActive = active?.name === field.name && active?.start === field.start;
                  return (
                    <button key={field.name + field.start}
                      className="w-full flex gap-2 px-3 py-1.5 text-left hover:bg-white/5 transition-all"
                      style={{ background: isActive ? layer.color + "18" : undefined }}
                      onClick={() => onSelect(isActive ? null : field)}>
                      <span className="text-[#64748b] shrink-0 w-36 truncate">{field.name}</span>
                      <span style={{ color: isActive ? layer.color : "#e2e8f0" }} className="flex-1">{field.value}</span>
                      <span className="text-[#2a2d3a] text-[10px] shrink-0">{field.end - field.start}o</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TrameAnalyzer() {
  const [hex, setHex] = useState(PRESETS[0].hex);
  const [active, setActive] = useState<Field | null>(null);
  const [hovered, setHovered] = useState<Field | null>(null);

  const { layers, raw, error } = useMemo(() => parseFrame(hex), [hex]);
  const displayed = hovered ?? active;

  return (
    <div className="space-y-4">

      {/* ── Saisie ──────────────────────────────────────────────────────── */}
      <div className="glass rounded-xl p-5 space-y-3">
        <div>
          <label className="text-xs text-[#64748b] block mb-1">Trame hexadécimale (espaces et : acceptés)</label>
          <textarea
            value={hex}
            onChange={e => { setHex(e.target.value); setActive(null); }}
            rows={3}
            className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg font-mono text-xs outline-none focus:border-[#00d4ff] resize-none leading-5"
            placeholder="ff ff ff ff ff ff ..." />
        </div>
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(p => (
            <button key={p.label}
              onClick={() => { setHex(p.hex); setActive(null); }}
              className="px-3 py-1.5 text-xs rounded-lg border transition-all"
              style={{ borderColor: p.color + "44", color: p.color, background: p.color + "11" }}>
              {p.label}
              <span className="text-[#64748b] ml-1.5 hidden sm:inline">{p.desc}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-4 text-[10px] text-[#64748b]">
          <span>{raw.length} octets</span>
          {error && <span className="text-red-400">⚠ {error}</span>}
          {!error && layers.length > 0 && (
            <span className="text-[#22c55e]">
              ✓ {layers.filter(l => l.name !== "Payload").map(l => l.name).join(" / ")}
            </span>
          )}
        </div>
      </div>

      {/* ── Analyse ─────────────────────────────────────────────────────── */}
      {layers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Bytes */}
          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Vue octets</h3>
            <BytesView raw={raw} layers={layers} active={displayed} onHover={setHovered} onClick={setActive} />
          </div>

          {/* Tree */}
          <div className="glass rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748b]">Décodage</h3>
            <LayerTree layers={layers} active={displayed} onSelect={setActive} />
          </div>
        </div>
      )}

      {/* ── Détail champ sélectionné ─────────────────────────────────────── */}
      {displayed && (
        <div className="glass rounded-xl p-4 border border-[#00d4ff]/20">
          <div className="flex gap-6 flex-wrap mb-2">
            <div>
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider">Champ</span>
              <p className="text-sm font-bold text-[#00d4ff]">{displayed.name}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider">Valeur</span>
              <p className="text-sm font-mono text-[#e2e8f0]">{displayed.value}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider">Offset</span>
              <p className="text-sm font-mono text-[#94a3b8]">{displayed.start} – {displayed.end - 1}</p>
            </div>
            <div>
              <span className="text-[10px] text-[#64748b] uppercase tracking-wider">Taille</span>
              <p className="text-sm font-mono text-[#94a3b8]">{displayed.end - displayed.start} octet(s)</p>
            </div>
          </div>
          <p className="text-xs text-[#94a3b8] leading-5">{displayed.desc}</p>
        </div>
      )}
    </div>
  );
}
