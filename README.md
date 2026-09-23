# NetLab

Suite d'outils interactifs pour le BUT Réseaux & Télécommunications — 100% client, aucune inscription.

**[netlab-xi.vercel.app](https://netlab-xi.vercel.app)**

---

## Outils

Chaque outil porte une pastille **BUT1** / **BUT2** et la ressource du programme quand elle est identifiée. La page d'accueil peut être filtrée par année.

### Réseaux
| Outil | Année · ressource | Description |
|---|---|---|
| [IP / Géolocalisation](/ip-geo) | BUT1 · R101 | Lookup d'IP, carte, ASN, FAI |
| [Monitoring réseau](/monitoring) | BUT1 · R101 | Ping, traceroute, latence |
| [Calcul CIDR](/cidr) | BUT1 · R102 | Sous-réseaux, masques, plages |
| [VLSM & IPv6](/vlsm-ipv6) | BUT1 · R102 · R201 | Plan d'adressage à masque variable, compression IPv6, EUI-64 |
| [Modèle OSI](/osi) | BUT1 · R102 | 7 couches, protocoles, encapsulation |
| [Analyseur de trames](/trames) | BUT1 · R102 | Ethernet, ARP, IPv4, TCP, UDP, ICMP — style Wireshark |
| [Routage IP](/routage) | BUT1 · R201 · R301 | Préfixe le plus long, distance administrative, coût OSPF |
| [Services réseau](/services-reseau) | BUT1 · R203 | DHCP, ARP, DNS, TCP message par message + ports connus |
| [Commutation & VLAN](/commutation) | BUT1 · R103 · R301 | Table MAC, apprentissage, inondation, VLAN et trunk 802.1Q |
| [ACL & wildcard](/acl) | BUT1 · R103 · R201 | Masque générique, évaluation d'une ACL étendue ligne par ligne |
| [NAT & PAT](/nat) | BUT1 · R201 | NAT statique, dynamique et PAT : table de traduction animée |
| [Spanning Tree Protocol](/spanning-tree) | BUT2 · R301 | Root bridge, root/designated ports, blocage des boucles |
| [Sélection BGP](/bgp) | BUT2 · R302 | Weight, Local Pref, AS-Path, MED — meilleur chemin pas à pas |

### Télécoms & Transmission
| Outil | Année · ressource | Description |
|---|---|---|
| [Supports de transmission](/supports-transmission) | BUT1 · R105 | dBm/dBµV, atténuation des câbles, propagation, Z₀, réflexion |
| [Téléphonie & VoIP](/telephonie) | BUT1 · R204 | Débit d'un appel VoIP par codec, Erlang B, délai de bout en bout |
| [Télécoms spatiales](/telecoms-spatiales) | BUT1 · R121 · R221 · R321 | Espace libre, gain d'antenne, bilan satellite, mélangeur, FDM |
| [Codes correcteurs](/codes-correcteurs) | BUT2 · R305 | Parité, CRC pas à pas, Hamming (7,4), distance de Hamming |
| [Modulations numériques](/modulations) | BUT2 · R305 | Constellations PSK/QAM, bruit, TEB selon Eb/N0, débit |
| [Codage en ligne](/codage-ligne) | BUT2 · R305 | NRZ, RZ, Manchester, Miller, AMI + diagramme de l'œil |
| [Fibre optique](/fibre-optique) | BUT2 · R306 | Snell-Descartes, ouverture numérique, modes, bilan, OTDR |
| [Réseaux d'accès](/reseaux-acces) | BUT2 · R307 | Budget optique GPON, taux de partage, débit xDSL selon la distance |

### Signal & Électronique
| Outil | Année · ressource | Description |
|---|---|---|
| [Signaux périodiques](/signaux) | BUT1 · R113 | Générateur sinus/carré/triangle, somme, déphasage, Fresnel |
| [Échantillonnage](/echantillonnage) | BUT1 · R206 | Shannon-Nyquist, repliement, quantification, débit PCM |
| [Électronique & filtres](/filtres) | BUT1 · R104 · R205 | Impédances R/L/C, filtres RC/RL/RLC, diagramme de Bode |
| [Séries de Fourier](/fourier) | BUT2 · R314 | Reconstruction harmonique par harmonique, spectre, Parseval |

### Mathématiques
| Outil | Année · ressource | Description |
|---|---|---|
| [Nombres complexes](/complexes) | BUT1 · R114 | Formes algébrique/exponentielle, opérations, plan complexe |
| [Calculateur pas à pas](/maths) | BUT1 · R213 · R214 | Fonctions & dérivées, intégrales numériques, suites, matrices (Gauss-Jordan) |

### Programmation
| Outil | Année · ressource | Description |
|---|---|---|
| [Visualisation des tris](/tri) | BUT1 · R107 | Bulles, insertion, fusion, rapide — animé |
| [Graphes & Dijkstra](/graphes) | BUT1 · R201 · R301 | Éditeur de graphe, plus court chemin animé |

### Architecture
| Outil | Année · ressource | Description |
|---|---|---|
| [Conversions de bases](/bases) | BUT1 · R106 | Binaire ↔ Octal ↔ Décimal ↔ Hexadécimal |
| [Circuits logiques](/circuits) | BUT1 · R106 | Expression booléenne → table de vérité + FND |
| [IEEE 754](/ieee754) | BUT1 · R106 | Décomposition flottant 32/64 bits, bits colorés |
| [Simulation ARM](/arm) | BUT1 · R106 | Exécution d'instructions, registres, trace |

### Systèmes & Données
| Outil | Année · ressource | Description |
|---|---|---|
| [Droits Linux](/droits-linux) | BUT1 · R108 | chmod en octal et rwx, bits spéciaux, umask |
| [Bases de données](/bdd) | BUT2 · R310 | Algèbre relationnelle (σ, π, ⋈) et normalisation 1FN/2FN/3FN pas à pas |
| [Annuaire LDAP](/ldap) | BUT2 · R304 | Arbre DIT, LDIF, filtres de recherche testés comme ldapsearch |

### Autres
| Outil | Année · ressource | Description |
|---|---|---|
| [Calculateurs Télécoms](/telecoms) | — | Shannon, débit, atténuation, modulation QAM, bilan liaison |
| [Ordonnancement CPU](/ordonnancement) | — | FIFO, SJF, SRTF, Round Robin, Priorité + Gantt |
| [Remplacement de pages](/remplacement) | — | FIFO, LRU, Optimal — défauts de page |
| [Cryptographie classique](/crypto) | — | César, Vigenère, XOR, analyse fréquentielle |
| [Simulation 3D](/simulation-3d) | — | Figures 3D, sommets éditables, rotation |

---

## Stack

- **Next.js 16** (App Router) — React Server Components
- **Tailwind CSS** — design sombre, composants `glass`
- **mathjs** — calcul symbolique (dérivées, évaluation d'expressions)
- **Canvas API** — tous les graphes et animations sont dessinés en 2D/3D natif
- Déployé sur **Vercel** (CD automatique sur chaque push)

## Lancer localement

```bash
git clone https://github.com/manuelrt1203/netlab.git
cd netlab
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Structure

```
src/
├── app/
│   ├── page.tsx          # Page d'accueil
│   ├── trames/           # Analyseur de trames
│   ├── maths/            # Calculateur mathématiques
│   ├── graphes/          # Graphes & Dijkstra
│   ├── arm/              # Simulation ARM
│   ├── spanning-tree/    # STP — root bridge, root/designated ports
│   ├── bgp/              # Sélection du meilleur chemin BGP
│   ├── bdd/              # Algèbre relationnelle & normalisation
│   └── ...               # 22 outils au total
├── components/
│   ├── Navbar.tsx        # Navigation par onglets de domaine (menu déroulant)
│   ├── maths/            # FonctionsTab, MatricesTab, SuitesTab, IntegraesTab
│   └── trames/           # TrameAnalyzer
└── lib/
    └── categories.ts     # Source unique des domaines/outils (page d'accueil + navbar)
```
