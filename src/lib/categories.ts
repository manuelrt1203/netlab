export interface Tool {
  href: string;
  icon: string;
  label: string;
  desc: string;
}

export interface Category {
  label: string;
  color: string;
  tools: Tool[];
}

export const CATEGORIES: Category[] = [
  {
    label: "Réseaux",
    color: "#00d4ff",
    tools: [
      { href: "/ip-geo",        icon: "🌐", label: "IP / Géolocalisation",    desc: "Lookup d'IP, carte, ASN, FAI" },
      { href: "/monitoring",    icon: "📡", label: "Monitoring réseau",       desc: "Ping, traceroute, latence" },
      { href: "/cidr",          icon: "🔢", label: "Calcul CIDR",             desc: "Sous-réseaux, masques, plages" },
      { href: "/osi",           icon: "📚", label: "Modèle OSI",              desc: "7 couches, protocoles, encapsulation" },
      { href: "/trames",        icon: "🔬", label: "Analyseur de trames",     desc: "Ethernet, ARP, IPv4, TCP, UDP, ICMP — style Wireshark" },
      { href: "/codage-ligne",  icon: "🔡", label: "Codage en ligne",         desc: "NRZ, RZ, Manchester, Miller, AMI + diagramme de l'œil" },
      { href: "/spanning-tree", icon: "🌳", label: "Spanning Tree Protocol",  desc: "Root bridge, root/designated ports, blocage des boucles" },
      { href: "/bgp",           icon: "🌍", label: "Sélection BGP",           desc: "Weight, Local Pref, AS-Path, MED — meilleur chemin pas à pas" },
    ],
  },
  {
    label: "Télécommunications",
    color: "#ec4899",
    tools: [
      { href: "/telecoms",      icon: "📶", label: "Calculateurs Télécoms", desc: "Shannon, débit, atténuation, modulation QAM, bilan liaison" },
      { href: "/fibre-optique", icon: "🔦", label: "Fibre optique",         desc: "Bilan de liaison optique + simulateur de trace OTDR" },
    ],
  },
  {
    label: "Programmation",
    color: "#7c3aed",
    tools: [
      { href: "/graphes",       icon: "🕸", label: "Graphes & Dijkstra",     desc: "Éditeur de graphe, plus court chemin animé" },
      { href: "/tri",           icon: "📊", label: "Visualisation des tris", desc: "Bulles, insertion, fusion, rapide — animé" },
      { href: "/simulation-3d", icon: "🔷", label: "Simulation 3D",          desc: "Figures 3D, sommets éditables, rotation" },
    ],
  },
  {
    label: "Systèmes d'exploitation",
    color: "#22c55e",
    tools: [
      { href: "/ordonnancement", icon: "⏱", label: "Ordonnancement CPU",    desc: "FIFO, SJF, SRTF, Round Robin, Priorité + Gantt" },
      { href: "/remplacement",   icon: "📄", label: "Remplacement de pages", desc: "FIFO, LRU, Optimal — défauts de page" },
    ],
  },
  {
    label: "Architecture & Bas niveau",
    color: "#f59e0b",
    tools: [
      { href: "/arm",      icon: "⚙️", label: "Simulation ARM",     desc: "Exécution d'instructions, registres, trace" },
      { href: "/bases",    icon: "🔣", label: "Conversions de bases", desc: "Binaire ↔ Octal ↔ Décimal ↔ Hexadécimal" },
      { href: "/ieee754",  icon: "🔬", label: "IEEE 754",           desc: "Décomposition flottant 32/64 bits, bits colorés" },
      { href: "/circuits", icon: "⚡", label: "Circuits logiques",  desc: "Expression booléenne → table de vérité + FND" },
    ],
  },
  {
    label: "Sécurité / Cryptographie",
    color: "#ef4444",
    tools: [
      { href: "/crypto", icon: "🔐", label: "Cryptographie classique", desc: "César, Vigenère, XOR, analyse fréquentielle" },
    ],
  },
  {
    label: "Bases de données",
    color: "#3b82f6",
    tools: [
      { href: "/bdd", icon: "🗄", label: "Bases de données", desc: "Algèbre relationnelle (σ, π, ⋈) et normalisation 1FN/2FN/3FN pas à pas" },
    ],
  },
  {
    label: "Mathématiques",
    color: "#a78bfa",
    tools: [
      { href: "/maths", icon: "∑", label: "Calculateur pas à pas", desc: "Fonctions & dérivées, intégrales numériques, suites, matrices (Gauss-Jordan)" },
    ],
  },
];
