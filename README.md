# NetLab

Suite d'outils interactifs pour la formation en informatique — 100% client, aucune inscription.

**[netlab-xi.vercel.app](https://netlab-xi.vercel.app)**

---

## Outils

### Réseaux
| Outil | Description |
|---|---|
| IP / Géolocalisation | Lookup d'adresse IP, ASN, FAI, localisation sur carte |
| Monitoring réseau | Ping, traceroute, mesure de latence |
| Calcul CIDR | Sous-réseaux, masques, plages d'adresses |
| Modèle OSI | 7 couches, protocoles associés, encapsulation |
| Analyseur de trames | Décodage Ethernet · ARP · IPv4 · ICMP · TCP · UDP style Wireshark |
| Codage en ligne | NRZ, RZ, Manchester, Manchester différentiel, Miller, bipolaire (AMI) + diagramme de l'œil |
| Spanning Tree Protocol | Éditeur de topologie de switches, élection du root bridge, root/designated/blocked ports |
| Sélection BGP | Comparateur de chemins pas à pas (Weight, Local Pref, AS-Path, Origine, MED, eBGP/iBGP, Router ID) |

### Systèmes d'exploitation
| Outil | Description |
|---|---|
| Ordonnancement CPU | FIFO, SJF, SRTF, Round Robin, Priorité — diagramme de Gantt animé |
| Remplacement de pages | FIFO, LRU, Optimal — compteur de défauts de page |

### Architecture & Bas niveau
| Outil | Description |
|---|---|
| Simulation ARM | Exécution d'instructions, registres, trace pas à pas |
| Conversions de bases | Binaire ↔ Octal ↔ Décimal ↔ Hexadécimal |
| IEEE 754 | Décomposition virgule flottante 32/64 bits, bits colorés |
| Circuits logiques | Expression booléenne → table de vérité + FND |

### Programmation
| Outil | Description |
|---|---|
| Graphes & Dijkstra | Éditeur de graphe, plus court chemin animé |
| Visualisation des tris | Bulles, insertion, fusion, rapide — animé |
| Simulation 3D | Figures géométriques 3D, sommets éditables, rotation |

### Télécommunications
| Outil | Description |
|---|---|
| Calculateurs Télécoms | Théorème de Shannon, débit, atténuation, modulation QAM, bilan de liaison |
| Fibre optique | Bilan de liaison optique (budget, marge) + simulateur de trace OTDR (réflectométrie) |

### Sécurité / Cryptographie
| Outil | Description |
|---|---|
| Cryptographie classique | César, Vigenère, XOR, analyse fréquentielle |

### Bases de données
| Outil | Description |
|---|---|
| Bases de données | Algèbre relationnelle (σ, π, ⋈) interactive + normalisation 1FN/2FN/3FN pas à pas à partir de dépendances fonctionnelles |

### Mathématiques
| Outil | Description |
|---|---|
| Fonctions & Dérivées | Tracé, dérivée symbolique, tangente, tableau de variation, racines, primitive — analyse automatique |
| Intégrales | Méthodes numériques (rectangles, trapèzes, Simpson) avec visualisation |
| Suites | Arithmétiques, géométriques, récurrence, Fibonacci |
| Matrices | Déterminant, inverse, élimination de Gauss-Jordan pas à pas |

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
