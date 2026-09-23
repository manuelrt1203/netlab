"use client";
import { useEffect, useState } from "react";
import { Card, Tabs } from "@/components/ui/Calc";

interface Msg {
  de: number; vers: number;
  nom: string;
  couleur: string;
  champs: [string, string][];
  explication: string;
  /** États TCP après le message [acteur 0, acteur 1] */
  etats?: [string, string];
}
interface Scenario { acteurs: string[]; intro: string; messages: Msg[] }

type Id = "dhcp" | "arp" | "dns" | "tcp";

const SCENARIOS: Record<Id, Scenario> = {
  dhcp: {
    acteurs: ["Client (sans IP)", "Serveur DHCP 192.168.1.1"],
    intro: "Le client vient de se connecter et n'a pas encore d'adresse IP. DHCP utilise UDP : port 68 côté client, 67 côté serveur. Les 4 échanges forment l'acronyme DORA.",
    messages: [
      { de: 0, vers: 1, nom: "DHCP DISCOVER", couleur: "#00d4ff",
        champs: [["IP source", "0.0.0.0"], ["IP destination", "255.255.255.255 (broadcast)"], ["Ports UDP", "68 → 67"], ["MAC destination", "ff:ff:ff:ff:ff:ff"], ["chaddr", "MAC du client"]],
        explication: "Le client ne connaît ni son adresse ni celle du serveur : il diffuse une demande à tout le réseau local (broadcast). Un routeur ne transmet pas ce broadcast, sauf s'il est configuré en relais DHCP (ip helper-address)." },
      { de: 1, vers: 0, nom: "DHCP OFFER", couleur: "#22c55e",
        champs: [["IP source", "192.168.1.1"], ["IP destination", "255.255.255.255 ou 192.168.1.50"], ["Ports UDP", "67 → 68"], ["yiaddr (adresse proposée)", "192.168.1.50"], ["Options", "masque /24, routeur 192.168.1.254, DNS, durée du bail 86400 s"]],
        explication: "Le serveur choisit une adresse libre dans sa plage (pool) et la propose avec les paramètres réseau. S'il y a plusieurs serveurs, le client peut recevoir plusieurs offres." },
      { de: 0, vers: 1, nom: "DHCP REQUEST", couleur: "#f59e0b",
        champs: [["IP source", "0.0.0.0"], ["IP destination", "255.255.255.255 (broadcast)"], ["Ports UDP", "68 → 67"], ["Option 50 (IP demandée)", "192.168.1.50"], ["Option 54 (serveur choisi)", "192.168.1.1"]],
        explication: "Le client accepte une offre. Il répond encore en broadcast pour que les autres serveurs sachent que leur offre est refusée et libèrent l'adresse proposée." },
      { de: 1, vers: 0, nom: "DHCP ACK", couleur: "#ec4899",
        champs: [["IP source", "192.168.1.1"], ["IP destination", "192.168.1.50"], ["Ports UDP", "67 → 68"], ["Bail", "24 h (renouvellement à T1 = 50 %, T2 = 87,5 %)"]],
        explication: "Le serveur confirme et enregistre le bail. Le client vérifie souvent que l'adresse est libre (ARP gratuit), puis configure son interface. À mi-bail, il redemande directement au serveur, en unicast." },
    ],
  },
  arp: {
    acteurs: ["PC A 192.168.1.10", "PC B 192.168.1.20"],
    intro: "A veut envoyer un paquet IP à B sur le même réseau local, mais il faut l'adresse MAC de B pour construire la trame Ethernet. ARP fait la traduction IP → MAC.",
    messages: [
      { de: 0, vers: 1, nom: "ARP Request", couleur: "#00d4ff",
        champs: [["MAC destination (Ethernet)", "ff:ff:ff:ff:ff:ff (broadcast)"], ["EtherType", "0x0806"], ["Opcode", "1 (requête)"], ["Question", "Qui a 192.168.1.20 ? Répondre à 192.168.1.10"], ["MAC cible", "00:00:00:00:00:00 (inconnue)"]],
        explication: "A diffuse la question à tout le domaine de broadcast. Toutes les machines la reçoivent, seule celle qui possède l'IP demandée répond. Au passage, B enregistre la correspondance IP/MAC de A." },
      { de: 1, vers: 0, nom: "ARP Reply", couleur: "#22c55e",
        champs: [["MAC destination", "MAC de A (unicast)"], ["Opcode", "2 (réponse)"], ["Réponse", "192.168.1.20 est à aa:bb:cc:dd:ee:02"]],
        explication: "B répond directement à A. A stocke la réponse dans son cache ARP (arp -a) pour quelques minutes et peut maintenant envoyer ses trames. Si B était sur un autre réseau, A aurait demandé la MAC de sa passerelle." },
    ],
  },
  dns: {
    acteurs: ["Client", "Résolveur (DNS du FAI)", "Serveur racine", "Serveur TLD .fr", "Serveur autoritaire exemple.fr"],
    intro: "Le client veut joindre www.exemple.fr. Il pose une question récursive à son résolveur, qui fait le travail itératif auprès de la hiérarchie DNS. Transport : UDP port 53 (TCP pour les grosses réponses et les transferts de zone).",
    messages: [
      { de: 0, vers: 1, nom: "www.exemple.fr ? (RD=1)", couleur: "#00d4ff",
        champs: [["Ports UDP", "port éphémère → 53"], ["Flag RD", "1 (récursion demandée)"], ["Type", "A (adresse IPv4)"]],
        explication: "Le client délègue toute la recherche au résolveur. Si la réponse est déjà dans le cache du résolveur (TTL non expiré), il répond immédiatement et les étapes suivantes n'ont pas lieu." },
      { de: 1, vers: 2, nom: "www.exemple.fr ?", couleur: "#7c3aed",
        champs: [["Destinataire", "un des 13 serveurs racine (a. à m.root-servers.net)"], ["Flag RD", "0 (requête itérative)"]],
        explication: "Le résolveur commence en haut de l'arbre. Il connaît les adresses des serveurs racine grâce à un fichier de configuration (root hints)." },
      { de: 2, vers: 1, nom: "Référence : voir les NS de .fr", couleur: "#7c3aed",
        champs: [["Section Authority", ".fr NS d.nic.fr, e.ext.nic.fr…"], ["Section Additional", "adresses IP de ces serveurs (glue)"]],
        explication: "La racine ne connaît pas la réponse, mais sait qui gère .fr : elle renvoie une délégation (referral)." },
      { de: 1, vers: 3, nom: "www.exemple.fr ?", couleur: "#f59e0b", champs: [["Destinataire", "serveur de l'AFNIC (registre .fr)"]],
        explication: "Le résolveur descend d'un niveau dans l'arborescence." },
      { de: 3, vers: 1, nom: "Référence : voir les NS de exemple.fr", couleur: "#f59e0b",
        champs: [["Section Authority", "exemple.fr NS ns1.exemple.fr"]],
        explication: "Le TLD délègue la zone exemple.fr aux serveurs de son propriétaire." },
      { de: 1, vers: 4, nom: "www.exemple.fr ?", couleur: "#22c55e", champs: [["Destinataire", "ns1.exemple.fr"]],
        explication: "Dernière étape : interroger le serveur qui fait autorité sur la zone." },
      { de: 4, vers: 1, nom: "www.exemple.fr A 203.0.113.80", couleur: "#22c55e",
        champs: [["Flag AA", "1 (réponse faisant autorité)"], ["TTL", "3600 s"], ["Enregistrement", "www IN A 203.0.113.80"]],
        explication: "Réponse définitive, tirée du fichier de zone. Le TTL indique combien de temps elle peut rester en cache." },
      { de: 1, vers: 0, nom: "→ 203.0.113.80", couleur: "#ec4899",
        champs: [["Flag RA", "1 (récursion disponible)"], ["Flag AA", "0 (réponse issue du cache du résolveur)"]],
        explication: "Le résolveur met la réponse en cache et la transmet. Le client peut maintenant ouvrir une connexion TCP vers 203.0.113.80. Test : nslookup, dig www.exemple.fr +trace." },
    ],
  },
  tcp: {
    acteurs: ["Client 192.168.1.50:51000", "Serveur web 203.0.113.80:80"],
    intro: "TCP est orienté connexion : ouverture en 3 temps (three-way handshake), échange de données avec accusés de réception, puis fermeture en 4 temps. Les numéros de séquence initiaux (ISN) sont tirés au hasard.",
    messages: [
      { de: 0, vers: 1, nom: "SYN  seq=1000", couleur: "#00d4ff", etats: ["SYN_SENT", "LISTEN"],
        champs: [["Flags", "SYN"], ["seq", "1000 (ISN client)"], ["Fenêtre", "64240 octets"], ["Options", "MSS 1460"]],
        explication: "Le client demande l'ouverture et annonce son numéro de séquence initial. Le SYN consomme 1 numéro de séquence." },
      { de: 1, vers: 0, nom: "SYN-ACK  seq=5000 ack=1001", couleur: "#22c55e", etats: ["SYN_SENT", "SYN_RECEIVED"],
        champs: [["Flags", "SYN, ACK"], ["seq", "5000 (ISN serveur)"], ["ack", "1001 = seq client + 1"]],
        explication: "Le serveur accepte, acquitte le SYN du client (ack = prochain octet attendu) et envoie son propre ISN." },
      { de: 0, vers: 1, nom: "ACK  seq=1001 ack=5001", couleur: "#f59e0b", etats: ["ESTABLISHED", "ESTABLISHED"],
        champs: [["Flags", "ACK"], ["ack", "5001"]],
        explication: "Le client acquitte le SYN du serveur : la connexion est établie des deux côtés." },
      { de: 0, vers: 1, nom: "PSH-ACK  seq=1001 (120 octets) GET /", couleur: "#a78bfa", etats: ["ESTABLISHED", "ESTABLISHED"],
        champs: [["Flags", "PSH, ACK"], ["seq", "1001"], ["Données", "120 octets (requête HTTP)"]],
        explication: "Le client envoie la requête HTTP. Les 120 octets occupent les numéros 1001 à 1120." },
      { de: 1, vers: 0, nom: "ACK  ack=1121 + réponse HTTP", couleur: "#a78bfa", etats: ["ESTABLISHED", "ESTABLISHED"],
        champs: [["ack", "1121 = 1001 + 120"], ["Données", "réponse HTTP 200 OK"]],
        explication: "L'accusé indique le prochain octet attendu. Sans ACK à temps, l'émetteur retransmet : c'est ce qui rend TCP fiable, contrairement à UDP." },
      { de: 0, vers: 1, nom: "FIN-ACK", couleur: "#ef4444", etats: ["FIN_WAIT_1", "ESTABLISHED"],
        champs: [["Flags", "FIN, ACK"]], explication: "Le client a fini d'envoyer : il ferme son sens de la connexion." },
      { de: 1, vers: 0, nom: "ACK", couleur: "#ef4444", etats: ["FIN_WAIT_2", "CLOSE_WAIT"],
        champs: [["Flags", "ACK"]], explication: "Le serveur acquitte. Il peut encore envoyer des données (connexion à moitié fermée)." },
      { de: 1, vers: 0, nom: "FIN-ACK", couleur: "#ef4444", etats: ["FIN_WAIT_2", "LAST_ACK"],
        champs: [["Flags", "FIN, ACK"]], explication: "Le serveur ferme à son tour." },
      { de: 0, vers: 1, nom: "ACK", couleur: "#ef4444", etats: ["TIME_WAIT", "CLOSED"],
        champs: [["Flags", "ACK"]], explication: "Dernier acquittement. Le client attend 2 × MSL (TIME_WAIT) pour absorber d'éventuels paquets retardataires, puis passe à CLOSED." },
    ],
  },
};

/* ─── Diagramme de séquence ─────────────────────────────────────────── */
function Sequence({ sc, etape, onSelect }: { sc: Scenario; etape: number; onSelect: (i: number) => void }) {
  const n = sc.acteurs.length;
  const W = 760, pas = 46, haut = 58, H = haut + sc.messages.length * pas + 20;
  const X = (i: number) => 70 + (i * (W - 140)) / (n - 1);

  return (
    <div className="overflow-x-auto bg-[#0f1117] rounded-lg">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[560px]">
        <defs>
          {sc.messages.map((m, i) => (
            <marker key={i} id={`fl-${i}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill={m.couleur} />
            </marker>
          ))}
        </defs>
        {sc.acteurs.map((a, i) => (
          <g key={a}>
            <rect x={X(i) - 62} y={8} width={124} height={34} rx={6} fill="#1a1d27" stroke="#2a2d3a" />
            {a.split(" ").reduce<string[]>((l, mot) => {
              const der = l[l.length - 1];
              if (der && (der + " " + mot).length <= 18) l[l.length - 1] = der + " " + mot; else l.push(mot);
              return l;
            }, []).slice(0, 2).map((ligne, k, arr) => (
              <text key={k} x={X(i)} y={25 + (k - (arr.length - 1) / 2) * 11 + 3} fontSize={10} fill="#e2e8f0" textAnchor="middle">{ligne}</text>
            ))}
            <line x1={X(i)} y1={42} x2={X(i)} y2={H - 8} stroke="#2a2d3a" strokeDasharray="4 4" />
          </g>
        ))}
        {sc.messages.map((m, i) => {
          if (i > etape) return null;
          const y = haut + i * pas + 20, x1 = X(m.de), x2 = X(m.vers), actif = i === etape;
          const dir = x2 > x1 ? 1 : -1;
          return (
            <g key={i} onClick={() => onSelect(i)} className="cursor-pointer" opacity={actif ? 1 : 0.55}>
              <line x1={x1} y1={y} x2={x2 - dir * 3} y2={y} stroke={m.couleur} strokeWidth={actif ? 2.5 : 1.5} markerEnd={`url(#fl-${i})`} />
              <text x={(x1 + x2) / 2} y={y - 7} fontSize={11} fill={m.couleur} textAnchor="middle" fontFamily="monospace" fontWeight={actif ? 700 : 400}>{m.nom}</text>
              <text x={8} y={y + 4} fontSize={9} fill="#475569">{i + 1}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Deroule({ id }: { id: Id }) {
  const sc = SCENARIOS[id];
  const dernier = sc.messages.length - 1;
  const [etape, setEtape] = useState(0);
  const [lecture, setLecture] = useState(false);
  const m = sc.messages[etape];
  const enLecture = lecture && etape < dernier;

  useEffect(() => {
    if (!enLecture) return;
    const t = setInterval(() => setEtape((e) => Math.min(e + 1, dernier)), 1800);
    return () => clearInterval(t);
  }, [enLecture, dernier]);

  const bouton = "px-3 py-1.5 text-xs border border-[#2a2d3a] rounded-lg text-[#94a3b8] hover:text-white disabled:opacity-30";
  return (
    <div className="space-y-3">
      <p className="text-sm text-[#94a3b8] leading-6">{sc.intro}</p>
      <div className="flex flex-wrap gap-2 items-center">
        <button className={bouton} onClick={() => { setLecture(false); setEtape(0); }}>⟲ Début</button>
        <button className={bouton} disabled={etape === 0} onClick={() => { setLecture(false); setEtape((e) => e - 1); }}>◀ Précédent</button>
        <button className={bouton} onClick={() => { if (enLecture) { setLecture(false); return; } if (etape >= dernier) setEtape(0); setLecture(true); }}>{enLecture ? "⏸ Pause" : "▶ Lecture"}</button>
        <button className={bouton} disabled={etape === dernier} onClick={() => { setLecture(false); setEtape((e) => e + 1); }}>Suivant ▶</button>
        <span className="text-xs text-[#64748b] ml-auto">Étape {etape + 1} / {sc.messages.length}</span>
      </div>
      <Sequence sc={sc} etape={etape} onSelect={(i) => { setLecture(false); setEtape(i); }} />
      <div className="rounded-lg border p-4 space-y-2" style={{ borderColor: `${m.couleur}55`, background: `${m.couleur}0a` }}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-sm" style={{ color: m.couleur }}>{m.nom}</span>
          <span className="text-xs text-[#64748b]">{sc.acteurs[m.de]} → {sc.acteurs[m.vers]}</span>
        </div>
        <p className="text-sm text-[#cbd5e1] leading-6">{m.explication}</p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 pt-1">
          {m.champs.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 text-xs border-b border-[#1c1f2a] py-1">
              <span className="text-[#64748b]">{k}</span><span className="font-mono text-[#e2e8f0] text-right">{v}</span>
            </div>
          ))}
        </div>
        {m.etats && (
          <div className="flex gap-4 text-xs pt-1">
            {m.etats.map((e, i) => <span key={i} className="text-[#64748b]">{sc.acteurs[i].split(" ")[0]} : <span className="font-mono text-[#f59e0b]">{e}</span></span>)}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Ports connus ──────────────────────────────────────────────────── */
const PORTS: [number, string, string, string][] = [
  [20, "FTP (données)", "TCP", "Transfert de fichiers, mode actif"], [21, "FTP (contrôle)", "TCP", "Commandes FTP"],
  [22, "SSH / SFTP / SCP", "TCP", "Administration à distance chiffrée"], [23, "Telnet", "TCP", "Administration en clair (à éviter)"],
  [25, "SMTP", "TCP", "Envoi de courriel entre serveurs"], [53, "DNS", "UDP/TCP", "Résolution de noms"],
  [67, "DHCP serveur", "UDP", "Attribution d'adresses"], [68, "DHCP client", "UDP", "Attribution d'adresses"],
  [69, "TFTP", "UDP", "Transfert simple (IOS, config, PXE)"], [80, "HTTP", "TCP", "Web non chiffré"],
  [110, "POP3", "TCP", "Relève de courriel"], [123, "NTP", "UDP", "Synchronisation d'horloge"],
  [143, "IMAP", "TCP", "Accès aux boîtes mail"], [161, "SNMP", "UDP", "Supervision (162 : traps)"],
  [389, "LDAP", "TCP", "Annuaire"], [443, "HTTPS", "TCP", "Web chiffré (TLS), aussi HTTP/3 en UDP"],
  [445, "SMB", "TCP", "Partage de fichiers Windows"], [514, "Syslog", "UDP", "Journalisation distante"],
  [587, "SMTP soumission", "TCP", "Envoi de courriel par un client"], [636, "LDAPS", "TCP", "Annuaire chiffré"],
  [993, "IMAPS", "TCP", "IMAP chiffré"], [995, "POP3S", "TCP", "POP3 chiffré"],
  [1812, "RADIUS", "UDP", "Authentification (802.1X, Wi-Fi)"], [3306, "MySQL", "TCP", "Base de données"],
  [3389, "RDP", "TCP", "Bureau à distance Windows"], [5060, "SIP", "UDP/TCP", "Signalisation VoIP"],
];

function Ports() {
  const [q, setQ] = useState("");
  const f = q.trim().toLowerCase();
  const liste = PORTS.filter(([p, n, t, d]) => !f || String(p).startsWith(f) || `${n} ${t} ${d}`.toLowerCase().includes(f));
  return (
    <Card color="#a78bfa" title="Ports bien connus" formula="0–1023 : ports système · 1024–49151 : enregistrés · 49152–65535 : éphémères (côté client)"
      explainer={<p>Un port identifie une application sur une machine. Le couple (IP, port) forme une socket ; une connexion TCP est identifiée par 4 valeurs : IP et port source, IP et port destination. Sous Linux : <code>ss -tulpn</code> liste les ports en écoute.</p>}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un port ou un service (ex. 53, ssh, mail)…"
        className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm outline-none focus:border-[#a78bfa]" />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <tbody>
            {liste.map(([p, n, t, d]) => (
              <tr key={`${p}-${n}`} className="border-b border-[#1c1f2a]">
                <td className="py-1.5 pr-3 font-mono font-bold text-[#a78bfa]">{p}</td>
                <td className="pr-3 text-[#e2e8f0]">{n}</td>
                <td className="pr-3 font-mono text-[#64748b]">{t}</td>
                <td className="text-[#94a3b8]">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {liste.length === 0 && <p className="text-xs text-[#64748b] py-2">Aucun résultat.</p>}
      </div>
    </Card>
  );
}

type Onglet = Id | "ports";
const ONGLETS: { id: Onglet; icon: string; label: string; desc: string; color: string }[] = [
  { id: "dhcp", icon: "🏷", label: "DHCP", desc: "DORA : obtenir une adresse IP", color: "#00d4ff" },
  { id: "arp", icon: "🔎", label: "ARP", desc: "Trouver la MAC d'une IP", color: "#f59e0b" },
  { id: "dns", icon: "📖", label: "DNS", desc: "Résolution récursive/itérative", color: "#7c3aed" },
  { id: "tcp", icon: "🤝", label: "TCP", desc: "Handshake, données, fermeture", color: "#22c55e" },
  { id: "ports", icon: "🔌", label: "Ports", desc: "Ports et services courants", color: "#a78bfa" },
];

export default function ServicesReseauPage() {
  const [onglet, setOnglet] = useState<Onglet>("dhcp");
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🛎 Services réseau</h1>
      <p className="text-[#64748b] text-sm mb-6">Les échanges de DHCP, ARP, DNS et TCP message par message, avec le contenu de chaque paquet.</p>
      <Tabs tabs={ONGLETS} value={onglet} onChange={setOnglet} />
      {onglet === "ports" ? <Ports /> : <Deroule key={onglet} id={onglet} />}
    </div>
  );
}
