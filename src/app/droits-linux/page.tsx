"use client";
import { useState } from "react";
import { Card, Result, Divider, Hint } from "@/components/ui/Calc";

const QUI = [["u", "Propriétaire (user)"], ["g", "Groupe (group)"], ["o", "Autres (others)"]] as const;
const DROITS = [["r", 4, "lecture"], ["w", 2, "écriture"], ["x", 1, "exécution"]] as const;
const SPECIAUX = [
  { nom: "setuid", val: 4, desc: "le programme s'exécute avec les droits de son propriétaire (ex. /usr/bin/passwd)" },
  { nom: "setgid", val: 2, desc: "exécution avec les droits du groupe ; sur un dossier, les nouveaux fichiers héritent du groupe" },
  { nom: "sticky", val: 1, desc: "sur un dossier, seul le propriétaire d'un fichier peut le supprimer (ex. /tmp)" },
];

/** Chaîne façon ls -l, en tenant compte des bits spéciaux (s, S, t, T) */
function chaineLs(mode: number, dossier: boolean): string {
  const bits = ["r", "w", "x", "r", "w", "x", "r", "w", "x"].map((c, i) => ((mode >> (8 - i)) & 1 ? c : "-"));
  const sp = (mode >> 9) & 7;
  const special = (pos: number, lettre: string) => { bits[pos] = bits[pos] === "x" ? lettre : lettre.toUpperCase(); };
  if (sp & 4) special(2, "s");
  if (sp & 2) special(5, "s");
  if (sp & 1) special(8, "t");
  return (dossier ? "d" : "-") + bits.join("");
}

function symbolique(mode: number): string {
  return QUI.map(([q], i) => `${q}=${DROITS.filter(([, v]) => (mode >> ((2 - i) * 3)) & v).map(([l]) => l).join("")}`).join(",");
}

function Chmod() {
  const [mode, setMode] = useState(0o754);
  const [dossier, setDossier] = useState(false);
  const [octal, setOctal] = useState("754");
  const [sym, setSym] = useState("rwxr-xr--");

  const appliquer = (m: number) => {
    setMode(m);
    setOctal(((m >> 9) & 7 ? ((m >> 9) & 7).toString() : "") + (m & 0o777).toString(8).padStart(3, "0"));
    setSym(chaineLs(m, false).slice(1));
  };
  const basculer = (bit: number) => appliquer(mode ^ bit);

  const depuisOctal = (v: string) => {
    setOctal(v);
    if (/^[0-7]{3,4}$/.test(v)) { const m = parseInt(v, 8); setMode(m); setSym(chaineLs(m, false).slice(1)); }
  };
  const depuisSym = (v: string) => {
    setSym(v);
    if (/^[r-][w-][xsS-][r-][w-][xsS-][r-][w-][xtT-]$/.test(v)) {
      let m = 0;
      v.split("").forEach((c, i) => { if (c !== "-" && c !== "S" && c !== "T") m |= 1 << (8 - i); });
      if ("sS".includes(v[2])) m |= 0o4000;
      if ("sS".includes(v[5])) m |= 0o2000;
      if ("tT".includes(v[8])) m |= 0o1000;
      setMode(m);
      setOctal(((m >> 9) & 7 ? ((m >> 9) & 7).toString() : "") + (m & 0o777).toString(8).padStart(3, "0"));
    }
  };

  const oct = ((mode >> 9) & 7 ? ((mode >> 9) & 7).toString() : "") + (mode & 0o777).toString(8).padStart(3, "0");
  const inp = "w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono outline-none focus:border-[#22c55e]";

  return (
    <Card color="#22c55e" title="Droits d'accès & chmod" formula="r = 4 · w = 2 · x = 1   →   un chiffre octal par catégorie : propriétaire, groupe, autres"
      explainer={<>
        <p>Chaque fichier a un propriétaire et un groupe. Les droits sont définis pour 3 catégories : le <strong>propriétaire</strong> (u), les membres du <strong>groupe</strong> (g) et tous les <strong>autres</strong> (o). Pour chacune : lecture (r), écriture (w), exécution (x).</p>
        <p>Sur un <strong>dossier</strong>, r permet de lister son contenu, w d&apos;y créer ou supprimer des fichiers, et x d&apos;y entrer (cd) et d&apos;accéder aux fichiers qu&apos;il contient. Un chiffre facultatif devant les trois autres code les bits spéciaux (setuid, setgid, sticky).</p>
      </>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-[#64748b]">
            <th className="text-left font-normal py-1"></th>
            {DROITS.map(([l, v, n]) => <th key={l} className="font-normal">{n}<br /><span className="font-mono">{l} = {v}</span></th>)}
            <th className="font-normal">octal</th>
          </tr></thead>
          <tbody>
            {QUI.map(([q, nom], i) => {
              const decal = (2 - i) * 3, chiffre = (mode >> decal) & 7;
              return (
                <tr key={q} className="border-t border-[#1c1f2a]">
                  <td className="py-2 text-xs text-[#94a3b8]">{nom}</td>
                  {DROITS.map(([l, v]) => {
                    const actif = (mode >> decal) & v;
                    return (
                      <td key={l} className="text-center">
                        <button onClick={() => basculer(v << decal)} className="w-10 h-9 rounded-md border font-mono font-bold"
                          style={actif ? { borderColor: "#22c55e", color: "#22c55e", background: "#22c55e18" } : { borderColor: "#2a2d3a", color: "#475569" }}>
                          {actif ? l : "-"}
                        </button>
                      </td>
                    );
                  })}
                  <td className="text-center font-mono text-lg text-[#00d4ff] font-bold">{chiffre}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        {SPECIAUX.map((s) => {
          const actif = (mode >> 9) & s.val;
          return (
            <button key={s.nom} title={s.desc} onClick={() => basculer(s.val << 9)} className="px-2.5 py-1 text-xs rounded border font-mono"
              style={actif ? { borderColor: "#f59e0b", color: "#f59e0b", background: "#f59e0b18" } : { borderColor: "#2a2d3a", color: "#64748b" }}>
              {s.nom} ({s.val}000)
            </button>
          );
        })}
        <label className="flex items-center gap-2 text-xs text-[#94a3b8] ml-auto cursor-pointer">
          <input type="checkbox" checked={dossier} onChange={(e) => setDossier(e.target.checked)} /> c&apos;est un dossier
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-xs text-[#64748b] mb-1 block">Notation octale</label><input value={octal} onChange={(e) => depuisOctal(e.target.value)} className={inp} /></div>
        <div><label className="text-xs text-[#64748b] mb-1 block">Notation rwx</label><input value={sym} onChange={(e) => depuisSym(e.target.value)} className={inp} /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {[["644 fichier", 0o644], ["755 script", 0o755], ["600 clé SSH", 0o600], ["700 dossier privé", 0o700], ["1777 /tmp", 0o1777], ["4755 passwd", 0o4755]].map(([l, m]) => (
          <button key={l as string} onClick={() => appliquer(m as number)} className="px-2 py-1 text-xs border border-[#2a2d3a] text-[#94a3b8] rounded hover:text-white">{l}</button>
        ))}
      </div>
      <Divider />
      <Result label="Affichage ls -l" value={`${chaineLs(mode, dossier)}  1 etudiant rt  ${dossier ? "4096 mon_dossier" : "1024 fichier"}`} accent />
      <Result label="Commande octale" value={`chmod ${oct} ${dossier ? "mon_dossier" : "fichier"}`} accent />
      <Result label="Commande symbolique" value={`chmod ${symbolique(mode)} ${dossier ? "mon_dossier" : "fichier"}`} />
      <Hint>
        {(mode & 0o002) ? "⚠ Écriture pour tous (o+w) : n'importe quel utilisateur peut modifier." :
          dossier && (mode & 0o444) && !(mode & 0o111) ? "⚠ Dossier lisible sans x : on voit les noms mais on ne peut ni entrer ni ouvrir les fichiers." :
          "Lecture de gauche à droite : propriétaire, groupe, autres."}
      </Hint>
    </Card>
  );
}

function Umask() {
  const [umask, setUmask] = useState("022");
  const u = /^[0-7]{3,4}$/.test(umask) ? parseInt(umask, 8) & 0o777 : null;
  return (
    <Card color="#00d4ff" title="umask : droits par défaut" formula="fichier = 666 ET NON umask     dossier = 777 ET NON umask"
      explainer={<p>Le <strong>umask</strong> retire des droits à la création. Un fichier part de 666 (jamais exécutable par défaut), un dossier de 777. Avec le umask 022 courant, on obtient 644 et 755 : seul le propriétaire peut écrire. Commande : <code>umask</code> pour l&apos;afficher, <code>umask 077</code> pour le changer dans la session.</p>}>
      <div>
        <label className="text-xs text-[#64748b] mb-1 block">umask</label>
        <input value={umask} onChange={(e) => setUmask(e.target.value)} className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono outline-none focus:border-[#00d4ff]" />
      </div>
      <div className="flex gap-2">{["022", "002", "027", "077"].map((m) => <button key={m} onClick={() => setUmask(m)} className="px-2 py-1 text-xs border border-[#2a2d3a] text-[#94a3b8] rounded font-mono">{m}</button>)}</div>
      {u === null ? <Hint>umask invalide (3 chiffres octaux).</Hint> : <>
        <Result label="Nouveau fichier" value={`${(0o666 & ~u).toString(8).padStart(3, "0")}  ${chaineLs(0o666 & ~u, false)}`} accent />
        <Result label="Nouveau dossier" value={`${(0o777 & ~u).toString(8).padStart(3, "0")}  ${chaineLs(0o777 & ~u, true)}`} accent />
      </>}
    </Card>
  );
}

export default function DroitsLinuxPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#22c55e] mb-2">🐧 Droits Linux</h1>
      <p className="text-[#64748b] text-sm mb-8">Clique sur les droits pour construire un mode, ou tape-le en octal ou en rwx : les deux notations restent synchronisées.</p>
      <div className="space-y-5">
        <Chmod />
        <Umask />
      </div>
    </div>
  );
}
