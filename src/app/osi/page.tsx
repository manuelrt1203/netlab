"use client";
import { useState } from "react";

const LAYERS = [
  {
    num: 7, name: "Application", color: "#ec4899",
    pdu: "Données", role: "Interface entre l'utilisateur et le réseau. Fournit les services réseau aux applications.",
    protocols: ["HTTP/HTTPS","FTP","SMTP/IMAP","DNS","DHCP","SSH","Telnet","SNMP"],
    exemple: "Votre navigateur envoie une requête HTTP GET vers un serveur.",
  },
  {
    num: 6, name: "Présentation", color: "#f59e0b",
    pdu: "Données", role: "Encode, chiffre, compresse les données. Traduit entre formats d'application.",
    protocols: ["SSL/TLS","JPEG","MPEG","ASCII","UTF-8","GIF","PNG"],
    exemple: "Le serveur chiffre la réponse avec TLS avant de l'envoyer.",
  },
  {
    num: 5, name: "Session", color: "#84cc16",
    pdu: "Données", role: "Établit, gère et ferme les sessions de communication entre applications.",
    protocols: ["NetBIOS","RPC","PPTP","SIP","SQL (sessions)"],
    exemple: "La session TCP est établie et maintenue pendant l'échange.",
  },
  {
    num: 4, name: "Transport", color: "#22c55e",
    pdu: "Segment (TCP) / Datagramme (UDP)", role: "Assure le transfert fiable de bout en bout. Contrôle de flux, de congestion, multiplexage.",
    protocols: ["TCP","UDP","SCTP"],
    exemple: "TCP découpe les données en segments, numérotés pour être réassemblés.",
  },
  {
    num: 3, name: "Réseau", color: "#00d4ff",
    pdu: "Paquet", role: "Adressage logique (IP) et routage des paquets entre réseaux différents.",
    protocols: ["IPv4","IPv6","ICMP","ARP","OSPF","BGP","RIP"],
    exemple: "Le paquet reçoit les adresses IP source et destination. Les routeurs choisissent le chemin.",
  },
  {
    num: 2, name: "Liaison de données", color: "#7c3aed",
    pdu: "Trame", role: "Adressage physique (MAC), détection d'erreurs, contrôle d'accès au médium (CSMA/CD).",
    protocols: ["Ethernet","Wi-Fi (802.11)","PPP","VLAN","STP","ARP"],
    exemple: "La trame Ethernet encapsule le paquet avec les adresses MAC source et destination.",
  },
  {
    num: 1, name: "Physique", color: "#64748b",
    pdu: "Bit", role: "Transmission des bits bruts sur le médium physique (câble, fibre, ondes radio).",
    protocols: ["RJ45","Fibre optique","Wi-Fi (radio)","Bluetooth","USB","RS-232"],
    exemple: "Les bits sont convertis en signaux électriques, lumineux ou radio sur le câble.",
  },
];

export default function OsiPage() {
  const [open, setOpen] = useState<number | null>(null);
  const [animPacket, setAnimPacket] = useState(false);
  const [packetPos, setPacketPos] = useState(7);

  const runAnim = () => {
    setAnimPacket(true);
    let pos = 7;
    setPacketPos(7);
    const iv = setInterval(()=>{
      pos--;
      setPacketPos(pos);
      if(pos<=1){ clearInterval(iv); setTimeout(()=>setAnimPacket(false),800); }
    },500);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">📚 Modèle OSI</h1>
      <p className="text-[#64748b] text-sm mb-3">Cliquez une couche pour voir les détails. Le modèle OSI organise les protocoles réseau en 7 couches.</p>

      <div className="flex justify-between items-center mb-5">
        <div className="flex gap-3 text-xs text-[#64748b]">
          <span className="px-2 py-1 border border-[#2a2d3a] rounded">Couches hautes — services</span>
          <span className="px-2 py-1 border border-[#2a2d3a] rounded">Couches basses — transport</span>
        </div>
        <button onClick={runAnim} disabled={animPacket}
          className="px-3 py-1.5 text-xs bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg hover:bg-[#00d4ff]/20 transition-all disabled:opacity-50">
          ▶ Animer l&apos;encapsulation
        </button>
      </div>

      <div className="space-y-1.5">
        {LAYERS.map(layer=>(
          <div key={layer.num}>
            <button
              onClick={()=>setOpen(open===layer.num?null:layer.num)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left"
              style={{
                background: open===layer.num||animPacket&&packetPos===layer.num
                  ? `${layer.color}18` : "rgba(26,29,39,0.6)",
                border: `1px solid ${open===layer.num||animPacket&&packetPos===layer.num ? layer.color+"44" : "#2a2d3a"}`,
                boxShadow: animPacket&&packetPos===layer.num ? `0 0 20px ${layer.color}44` : "none",
              }}>
              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                style={{background:`${layer.color}20`,color:layer.color}}>
                {layer.num}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{color:layer.color}}>{layer.name}</div>
                <div className="text-[#64748b] text-xs truncate">{layer.pdu}</div>
              </div>
              <div className="flex gap-1.5 flex-wrap justify-end">
                {layer.protocols.slice(0,3).map(p=>(
                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded font-mono"
                    style={{background:`${layer.color}15`,color:layer.color}}>{p}</span>
                ))}
              </div>
              <span className="text-[#2a2d3a] ml-2">{open===layer.num?"▲":"▼"}</span>
            </button>

            {open===layer.num && (
              <div className="mx-2 mb-2 glass rounded-b-xl p-4 border-t-0 text-sm space-y-3"
                style={{borderColor:`${layer.color}22`}}>
                <p className="text-[#94a3b8] leading-5">{layer.role}</p>
                <div>
                  <p className="text-xs text-[#64748b] mb-1.5">Protocoles :</p>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.protocols.map(p=>(
                      <span key={p} className="text-xs px-2 py-0.5 rounded font-mono border"
                        style={{color:layer.color,borderColor:`${layer.color}30`,background:`${layer.color}10`}}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3 text-xs text-[#64748b] italic">
                  Exemple : {layer.exemple}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="glass rounded-xl p-4 mt-5 text-xs text-[#64748b] leading-5">
        <strong className="text-[#e2e8f0]">Moyen mnémotechnique (de 7 à 1) :</strong><br/>
        <span className="font-mono text-[#00d4ff]">A</span>ll <span className="font-mono text-[#f59e0b]">P</span>eople <span className="font-mono text-[#84cc16]">S</span>eem <span className="font-mono text-[#22c55e]">T</span>o <span className="font-mono text-[#00d4ff]">N</span>eed <span className="font-mono text-[#7c3aed]">D</span>ata <span className="font-mono text-[#64748b]">P</span>rocessing
        <br/>(Application · Présentation · Session · Transport · Réseau · Data Link · Physical)
      </div>
    </div>
  );
}
