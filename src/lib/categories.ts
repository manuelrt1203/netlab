export type Annee = 1 | 2;

export interface Tool {
  href: string;
  icon: string;
  label: string;
  desc: string;
  /** Année du BUT R&T où la notion est vue (absente si l'outil n'est rattaché à aucun module identifié) */
  annee?: Annee;
  /** Ressource(s) du programme correspondante(s), quand elle est identifiée */
  module?: string;
}

export interface Category {
  label: string;
  color: string;
  tools: Tool[];
}

export const ANNEES: { value: Annee; label: string; court: string; color: string }[] = [
  { value: 1, label: "1re année", court: "BUT1", color: "#22c55e" },
  { value: 2, label: "2e année", court: "BUT2", color: "#f59e0b" },
];

export const CATEGORIES: Category[] = [
  {
    label: "Réseaux",
    color: "#00d4ff",
    tools: [
      { href: "/ip-geo",        icon: "🌐", label: "IP / Géolocalisation",   desc: "Lookup d'IP, carte, ASN, FAI",                               annee: 1, module: "R101" },
      { href: "/monitoring",    icon: "📡", label: "Monitoring réseau",      desc: "Ping, traceroute, latence",                                  annee: 1, module: "R101" },
      { href: "/cidr",          icon: "🔢", label: "Calcul CIDR",            desc: "Sous-réseaux, masques, plages",                              annee: 1, module: "R102" },
      { href: "/osi",           icon: "📚", label: "Modèle OSI",             desc: "7 couches, protocoles, encapsulation",                       annee: 1, module: "R102" },
      { href: "/trames",        icon: "🔬", label: "Analyseur de trames",    desc: "Ethernet, ARP, IPv4, TCP, UDP, ICMP — style Wireshark",      annee: 1, module: "R102" },
      { href: "/spanning-tree", icon: "🌳", label: "Spanning Tree Protocol", desc: "Root bridge, root/designated ports, blocage des boucles",     annee: 2, module: "R301" },
      { href: "/bgp",           icon: "🌍", label: "Sélection BGP",          desc: "Weight, Local Pref, AS-Path, MED — meilleur chemin pas à pas", annee: 2, module: "R302" },
    ],
  },
  {
    label: "Télécoms & Transmission",
    color: "#ec4899",
    tools: [
      { href: "/supports-transmission", icon: "🔌", label: "Supports de transmission", desc: "dBm/dBµV, atténuation des câbles, propagation, Z₀, réflexion", annee: 1, module: "R105" },
      { href: "/codage-ligne",          icon: "🔡", label: "Codage en ligne",          desc: "NRZ, RZ, Manchester, Miller, AMI + diagramme de l'œil",       annee: 2, module: "R305" },
      { href: "/fibre-optique",         icon: "🔦", label: "Fibre optique",            desc: "Snell-Descartes, ouverture numérique, modes, bilan, OTDR",      annee: 2, module: "R306" },
    ],
  },
  {
    label: "Signal & Électronique",
    color: "#06b6d4",
    tools: [
      { href: "/signaux", icon: "〰️", label: "Signaux périodiques",   desc: "Générateur sinus/carré/triangle, somme, déphasage, Fresnel", annee: 1, module: "R113" },
      { href: "/filtres", icon: "🎛", label: "Électronique & filtres", desc: "Impédances R/L/C, filtres RC/RL/RLC, diagramme de Bode",       annee: 1, module: "R104 · R205" },
      { href: "/fourier", icon: "🎼", label: "Séries de Fourier",      desc: "Reconstruction harmonique par harmonique, spectre, Parseval", annee: 2, module: "R314" },
    ],
  },
  {
    label: "Mathématiques",
    color: "#a78bfa",
    tools: [
      { href: "/complexes", icon: "ⅈ", label: "Nombres complexes",       desc: "Formes algébrique/exponentielle, opérations, plan complexe",               annee: 1, module: "R114" },
      { href: "/maths",     icon: "∑", label: "Calculateur pas à pas", desc: "Fonctions & dérivées, intégrales numériques, suites, matrices (Gauss-Jordan)", annee: 1, module: "R213 · R214" },
    ],
  },
  {
    label: "Programmation",
    color: "#7c3aed",
    tools: [
      { href: "/tri",           icon: "📊", label: "Visualisation des tris", desc: "Bulles, insertion, fusion, rapide — animé",      annee: 1, module: "R107" },
      { href: "/graphes",       icon: "🕸", label: "Graphes & Dijkstra",     desc: "Éditeur de graphe, plus court chemin animé",     annee: 1, module: "R201 · R301" },
    ],
  },
  {
    label: "Architecture & Bas niveau",
    color: "#f59e0b",
    tools: [
      { href: "/bases",    icon: "🔣", label: "Conversions de bases", desc: "Binaire ↔ Octal ↔ Décimal ↔ Hexadécimal",  annee: 1, module: "R106" },
      { href: "/circuits", icon: "⚡", label: "Circuits logiques",    desc: "Expression booléenne → table de vérité + FND", annee: 1, module: "R106" },
      { href: "/ieee754",  icon: "🔬", label: "IEEE 754",             desc: "Décomposition flottant 32/64 bits, bits colorés", annee: 1, module: "R106" },
      { href: "/arm",      icon: "⚙️", label: "Simulation ARM",       desc: "Exécution d'instructions, registres, trace",     annee: 1, module: "R106" },
    ],
  },
  {
    label: "Bases de données",
    color: "#3b82f6",
    tools: [
      { href: "/bdd", icon: "🗄", label: "Bases de données", desc: "Algèbre relationnelle (σ, π, ⋈) et normalisation 1FN/2FN/3FN pas à pas", annee: 2, module: "R310" },
    ],
  },
  {
    label: "Autres outils",
    color: "#94a3b8",
    tools: [
      { href: "/telecoms",       icon: "📶", label: "Calculateurs Télécoms",   desc: "Shannon, débit, atténuation, modulation QAM, bilan liaison" },
      { href: "/ordonnancement", icon: "⏱", label: "Ordonnancement CPU",      desc: "FIFO, SJF, SRTF, Round Robin, Priorité + Gantt" },
      { href: "/remplacement",   icon: "📄", label: "Remplacement de pages",   desc: "FIFO, LRU, Optimal — défauts de page" },
      { href: "/crypto",         icon: "🔐", label: "Cryptographie classique", desc: "César, Vigenère, XOR, analyse fréquentielle" },
      { href: "/simulation-3d",  icon: "🔷", label: "Simulation 3D",           desc: "Figures 3D, sommets éditables, rotation" },
    ],
  },
];
