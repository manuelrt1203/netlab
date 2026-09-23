# NetLab

Suite d'outils interactifs pour le BUT Réseaux & Télécommunications — 100% client, aucune inscription.

Chaque outil porte une pastille **BUT1** / **BUT2** et, quand elle est identifiée, la ressource du programme (ex. `R113`). La page d'accueil peut être filtrée par année.

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
| VLSM & IPv6 (BUT1 · R102 · R201) | Plan d'adressage à masque variable ; compression IPv6, types d'adresses, préfixe, EUI-64 |
| Routage IP (BUT1 · R201 · R301) | Table de routage éditable : préfixe le plus long, distance administrative, métrique ; coût OSPF |
| Services réseau (BUT1 · R203) | DHCP (DORA), ARP, DNS récursif/itératif, TCP (handshake, fermeture) en diagramme de séquence ; ports connus |
| Spanning Tree Protocol | Éditeur de topologie de switches, élection du root bridge, root/designated/blocked ports |
| Sélection BGP | Comparateur de chemins pas à pas (Weight, Local Pref, AS-Path, Origine, MED, eBGP/iBGP, Router ID) |

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
| Graphes & Dijkstra (BUT1 · R201 · R301) | Éditeur de graphe, plus court chemin animé |
| Visualisation des tris | Bulles, insertion, fusion, rapide — animé |

### Télécoms & Transmission
| Outil | Année | Description |
|---|---|---|
| Supports de transmission | BUT1 · R105 | Convertisseur dBm/dBW/dBµV, atténuation d'un câble, vitesse de propagation, impédance caractéristique Z₀, coefficient de réflexion et ROS, onde EM plane |
| Codes correcteurs | BUT2 · R305 | Parité, CRC avec division polynomiale pas à pas, Hamming (7,4) avec syndrome, distance de Hamming — erreurs injectables au clic |
| Codage en ligne | BUT2 · R305 | NRZ, RZ, Manchester, Manchester différentiel, Miller, bipolaire (AMI) + diagramme de l'œil |
| Fibre optique | BUT2 · R306 | Snell-Descartes, ouverture numérique, fréquence normalisée V, mono/multimode, dispersion intermodale, bilan de liaison, trace OTDR |

### Signal & Électronique
| Outil | Année | Description |
|---|---|---|
| Signaux périodiques | BUT1 · R113 | Générateur sinus/carré/triangle/scie, somme de signaux, valeurs moyenne et efficace, déphasage, vecteurs de Fresnel |
| Échantillonnage & numérisation | BUT1 · R206 | Shannon-Nyquist, repliement de spectre, quantification (CAN), débit PCM |
| Électronique & filtres | BUT1 · R104 · R205 | Impédances R/L/C en série/parallèle, filtres RC/RL/RLC, dérivateur/intégrateur, diagramme de Bode réel + asymptotique |
| Séries de Fourier | BUT2 · R314 | Reconstruction harmonique par harmonique, spectre d'amplitude, tableau des coefficients, Parseval |

### Bases de données
| Outil | Description |
|---|---|
| Bases de données | Algèbre relationnelle (σ, π, ⋈) interactive + normalisation 1FN/2FN/3FN pas à pas à partir de dépendances fonctionnelles |

### Mathématiques
| Outil | Description |
|---|---|
| Nombres complexes (BUT1 · R114) | Formes algébrique/trigonométrique/exponentielle, opérations, plan complexe, impédances |
| Fonctions & Dérivées | Tracé, dérivée symbolique, tangente, tableau de variation, racines, primitive — analyse automatique |
| Intégrales | Méthodes numériques (rectangles, trapèzes, Simpson) avec visualisation |
| Suites | Arithmétiques, géométriques, récurrence, Fibonacci |
| Matrices | Déterminant, inverse, élimination de Gauss-Jordan pas à pas |

### Autres
Outils qui ne sont rattachés à aucun module identifié du programme (pas de pastille d'année).

| Outil | Description |
|---|---|
| Calculateurs Télécoms | Théorème de Shannon, débit, atténuation, modulation QAM, bilan de liaison |
| Ordonnancement CPU | FIFO, SJF, SRTF, Round Robin, Priorité — diagramme de Gantt animé |
| Remplacement de pages | FIFO, LRU, Optimal — compteur de défauts de page |
| Cryptographie classique | César, Vigenère, XOR, analyse fréquentielle |
| Simulation 3D | Figures géométriques 3D, sommets éditables, rotation |

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
