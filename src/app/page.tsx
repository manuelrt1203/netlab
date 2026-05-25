import Link from "next/link";

const CATEGORIES = [
  {
    label: "Réseaux", color: "#00d4ff",
    tools: [
      { href:"/ip-geo",     icon:"🌐", label:"IP / Géolocalisation",  desc:"Lookup d'IP, carte, ASN, FAI" },
      { href:"/monitoring", icon:"📡", label:"Monitoring réseau",      desc:"Ping, traceroute, latence" },
      { href:"/cidr",       icon:"🔢", label:"Calcul CIDR",           desc:"Sous-réseaux, masques, plages" },
      { href:"/osi",        icon:"📚", label:"Modèle OSI",            desc:"7 couches, protocoles, encapsulation" },
      { href:"/trames",     icon:"🔬", label:"Analyseur de trames",   desc:"Ethernet, ARP, IPv4, TCP, UDP, ICMP — style Wireshark" },
    ],
  },
  {
    label: "Systèmes d'exploitation", color: "#22c55e",
    tools: [
      { href:"/ordonnancement", icon:"⏱", label:"Ordonnancement CPU",    desc:"FIFO, SJF, SRTF, Round Robin, Priorité + Gantt" },
      { href:"/remplacement",   icon:"📄", label:"Remplacement de pages", desc:"FIFO, LRU, Optimal — défauts de page" },
    ],
  },
  {
    label: "Architecture & Bas niveau", color: "#f59e0b",
    tools: [
      { href:"/arm",     icon:"⚙️", label:"Simulation ARM",    desc:"Exécution d'instructions, registres, trace" },
      { href:"/bases",   icon:"🔣", label:"Conversions de bases", desc:"Binaire ↔ Octal ↔ Décimal ↔ Hexadécimal" },
      { href:"/ieee754", icon:"🔬", label:"IEEE 754",           desc:"Décomposition flottant 32/64 bits, bits colorés" },
      { href:"/circuits",icon:"⚡", label:"Circuits logiques",  desc:"Expression booléenne → table de vérité + FND" },
    ],
  },
  {
    label: "Algorithmique", color: "#7c3aed",
    tools: [
      { href:"/graphes",       icon:"🕸", label:"Graphes & Dijkstra", desc:"Éditeur de graphe, plus court chemin animé" },
      { href:"/tri",           icon:"📊", label:"Visualisation des tris", desc:"Bulles, insertion, fusion, rapide — animé" },
      { href:"/simulation-3d", icon:"🔷", label:"Simulation 3D",       desc:"Figures 3D, sommets éditables, rotation" },
    ],
  },
  {
    label: "Télécommunications", color: "#ec4899",
    tools: [
      { href:"/telecoms", icon:"📶", label:"Calculateurs Télécoms", desc:"Shannon, débit, atténuation, modulation QAM, bilan liaison" },
    ],
  },
  {
    label: "Sécurité / Cryptographie", color: "#ef4444",
    tools: [
      { href:"/crypto", icon:"🔐", label:"Cryptographie classique", desc:"César, Vigenère, XOR, analyse fréquentielle" },
    ],
  },
  {
    label: "Mathématiques", color: "#a78bfa",
    tools: [
      { href:"/maths", icon:"∑", label:"Calculateur pas à pas", desc:"Fonctions & dérivées, intégrales numériques, suites, matrices (Gauss-Jordan)" },
    ],
  },
];

export default function Home() {
  return (
    <div className="px-6 py-12 max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-[#00d4ff] tracking-widest mb-3">NetLab</h1>
        <p className="text-[#64748b]">Suite d&apos;outils interactifs pour la formation en informatique</p>
        <div className="flex justify-center gap-4 mt-3 text-xs text-[#2a2d3a]">
          {["16 outils","6 domaines","100% local"].map(t=>(
            <span key={t} className="px-3 py-1 border border-[#2a2d3a] rounded-full">{t}</span>
          ))}
        </div>
      </div>

      {CATEGORIES.map(cat=>(
        <div key={cat.label} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#2a2d3a]" />
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{color:cat.color}}>{cat.label}</h2>
            <div className="h-px flex-1 bg-[#2a2d3a]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cat.tools.map(t=>(
              <Link key={t.href} href={t.href}
                className="glass rounded-xl p-4 hover:scale-[1.02] transition-all border border-[#2a2d3a]"
                style={{borderColor:"#2a2d3a"}}>
                <div className="text-2xl mb-2">{t.icon}</div>
                <h3 className="font-semibold text-sm mb-1" style={{color:cat.color}}>{t.label}</h3>
                <p className="text-[#64748b] text-xs leading-4">{t.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
