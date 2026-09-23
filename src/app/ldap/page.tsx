"use client";
import { useState } from "react";
import { Card, Select, Hint } from "@/components/ui/Calc";

type Attrs = Record<string, string[]>;
interface Entree { dn: string; attrs: Attrs }

const BASE = "dc=iut-beziers,dc=fr";
const personne = (uid: string, prenom: string, nom: string, ou: string, uidNum: number, gid: number, titre: string): Entree => ({
  dn: `uid=${uid},ou=people,${BASE}`,
  attrs: {
    objectClass: ["inetOrgPerson", "posixAccount"], uid: [uid], cn: [`${prenom} ${nom}`], sn: [nom], givenName: [prenom],
    mail: [`${uid}@iut-beziers.fr`], departmentNumber: [ou], title: [titre],
    uidNumber: [String(uidNum)], gidNumber: [String(gid)], homeDirectory: [`/home/${uid}`], loginShell: ["/bin/bash"],
  },
});

const ANNUAIRE: Entree[] = [
  { dn: BASE, attrs: { objectClass: ["dcObject", "organization"], dc: ["iut-beziers"], o: ["IUT de Béziers"] } },
  { dn: `ou=people,${BASE}`, attrs: { objectClass: ["organizationalUnit"], ou: ["people"], description: ["Comptes utilisateurs"] } },
  { dn: `ou=groups,${BASE}`, attrs: { objectClass: ["organizationalUnit"], ou: ["groups"], description: ["Groupes POSIX"] } },
  personne("jdupont", "Jean", "Dupont", "RT", 10001, 5002, "Étudiant BUT2"),
  personne("mmartin", "Marie", "Martin", "RT", 10002, 5002, "Étudiante BUT2"),
  personne("lpetit", "Lucas", "Petit", "RT", 10003, 5001, "Étudiant BUT1"),
  personne("sbernard", "Sophie", "Bernard", "GEII", 10004, 5003, "Étudiante BUT1"),
  personne("aleroy", "Alain", "Leroy", "RT", 20001, 6000, "Enseignant"),
  { dn: `cn=rt1,ou=groups,${BASE}`, attrs: { objectClass: ["posixGroup"], cn: ["rt1"], gidNumber: ["5001"], memberUid: ["lpetit"] } },
  { dn: `cn=rt2,ou=groups,${BASE}`, attrs: { objectClass: ["posixGroup"], cn: ["rt2"], gidNumber: ["5002"], memberUid: ["jdupont", "mmartin"] } },
  { dn: `cn=profs,ou=groups,${BASE}`, attrs: { objectClass: ["posixGroup"], cn: ["profs"], gidNumber: ["6000"], memberUid: ["aleroy"] } },
];

const parent = (dn: string) => dn.split(",").slice(1).join(",");
/** Parcours en profondeur : chaque entrée est suivie de ses enfants */
function ordreArbre(dn: string): Entree[] {
  const e = ANNUAIRE.find((x) => x.dn === dn);
  const enfants = ANNUAIRE.filter((x) => parent(x.dn) === dn);
  return [...(e ? [e] : []), ...enfants.flatMap((c) => ordreArbre(c.dn))];
}
const rdn = (dn: string) => dn.split(",")[0];
const profondeur = (dn: string) => dn.split(",").length - BASE.split(",").length;

/* ─── Analyse d'un filtre LDAP (RFC 4515, sous-ensemble) ────────────── */
type Filtre =
  | { t: "et" | "ou"; f: Filtre[] }
  | { t: "non"; f: Filtre }
  | { t: "cmp"; attr: string; op: "=" | ">=" | "<=" | "~="; val: string };

function analyser(s: string): Filtre {
  let i = 0;
  const lire = (): Filtre => {
    if (s[i] !== "(") throw new Error(`« ( » attendue à la position ${i + 1}`);
    i++;
    let f: Filtre;
    if (s[i] === "&" || s[i] === "|") {
      const t = s[i] === "&" ? "et" : "ou"; i++;
      const liste: Filtre[] = [];
      while (s[i] === "(") liste.push(lire());
      if (!liste.length) throw new Error("opérateur & ou | sans sous-filtre");
      f = { t, f: liste };
    } else if (s[i] === "!") { i++; f = { t: "non", f: lire() }; }
    else {
      const fin = s.indexOf(")", i);
      if (fin < 0) throw new Error("« ) » manquante");
      const corps = s.slice(i, fin);
      const m = corps.match(/^([A-Za-z][\w-]*)(>=|<=|~=|=)(.*)$/);
      if (!m) throw new Error(`comparaison invalide « ${corps} »`);
      f = { t: "cmp", attr: m[1], op: m[2] as "=", val: m[3] };
      i = fin;
    }
    if (s[i] !== ")") throw new Error(`« ) » attendue à la position ${i + 1}`);
    i++;
    return f;
  };
  const f = lire();
  if (i !== s.length) throw new Error("caractères en trop après le filtre");
  return f;
}

function valeurs(e: Entree, attr: string): string[] {
  const k = Object.keys(e.attrs).find((a) => a.toLowerCase() === attr.toLowerCase());
  return k ? e.attrs[k] : [];
}

function teste(f: Filtre, e: Entree): boolean {
  switch (f.t) {
    case "et": return f.f.every((x) => teste(x, e));
    case "ou": return f.f.some((x) => teste(x, e));
    case "non": return !teste(f.f, e);
    case "cmp": {
      const vs = valeurs(e, f.attr).map((v) => v.toLowerCase()), v = f.val.toLowerCase();
      if (f.op === "=" && v === "*") return vs.length > 0;
      if (f.op === "=" && v.includes("*")) {
        const re = new RegExp("^" + v.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
        return vs.some((x) => re.test(x));
      }
      const num = (x: string) => (/^-?\d+$/.test(x) ? Number(x) : null);
      if (f.op === ">=") return vs.some((x) => (num(x) !== null && num(v) !== null ? num(x)! >= num(v)! : x >= v));
      if (f.op === "<=") return vs.some((x) => (num(x) !== null && num(v) !== null ? num(x)! <= num(v)! : x <= v));
      return vs.includes(v);
    }
  }
}

function ldif(e: Entree) {
  return [`dn: ${e.dn}`, ...Object.entries(e.attrs).flatMap(([k, vs]) => vs.map((v) => `${k}: ${v}`))].join("\n");
}

const EXEMPLES = [
  ["Tous les étudiants RT", "(&(objectClass=inetOrgPerson)(departmentNumber=RT)(title=Étudiant*))"],
  ["Nom commençant par M", "(sn=M*)"],
  ["Membres de rt2", "(&(objectClass=posixGroup)(cn=rt2))"],
  ["uidNumber ≥ 20000", "(uidNumber>=20000)"],
  ["Pas enseignant", "(&(objectClass=posixAccount)(!(title=Enseignant)))"],
  ["Dupont ou Martin", "(|(sn=Dupont)(sn=Martin))"],
];

export default function LdapPage() {
  const [sel, setSel] = useState(ANNUAIRE[3].dn);
  const [base, setBase] = useState(BASE);
  const [scope, setScope] = useState<"base" | "one" | "sub">("sub");
  const [filtre, setFiltre] = useState(EXEMPLES[0][1]);
  const [attrs, setAttrs] = useState("cn mail");

  let erreur: string | null = null, resultats: Entree[] = [];
  try {
    const f = analyser(filtre.trim());
    const dansScope = (e: Entree) => scope === "base" ? e.dn === base : scope === "one" ? parent(e.dn) === base : e.dn === base || e.dn.endsWith("," + base);
    resultats = ANNUAIRE.filter((e) => dansScope(e) && teste(f, e));
  } catch (e) { erreur = (e as Error).message; }

  const entree = ANNUAIRE.find((e) => e.dn === sel)!;
  const listeAttrs = attrs.trim().split(/\s+/).filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#22c55e] mb-2">📇 Annuaire LDAP</h1>
      <p className="text-[#64748b] text-sm mb-8">Explore l&apos;arbre d&apos;un annuaire OpenLDAP (DIT), lis les entrées en LDIF et teste des filtres de recherche comme avec <code>ldapsearch</code>.</p>
      <div className="space-y-5">
        <Card color="#22c55e" title="Arbre de l'annuaire (DIT)" formula="DN = RDN + DN du parent   ex. uid=jdupont,ou=people,dc=iut-beziers,dc=fr"
          explainer={<>
            <p>Un annuaire LDAP range ses entrées dans un <strong>arbre</strong> (Directory Information Tree). Chaque entrée est identifiée par son <strong>DN</strong> (Distinguished Name), lu de la feuille vers la racine : le premier élément est le <strong>RDN</strong>, le reste est le DN du parent.</p>
            <p>Les <strong>objectClass</strong> définissent les attributs obligatoires et facultatifs (le schéma) : inetOrgPerson pour une personne, posixAccount pour un compte Linux (uidNumber, homeDirectory…), posixGroup pour un groupe. Le format texte d&apos;échange est le <strong>LDIF</strong>, utilisé par <code>ldapadd</code> et <code>ldapmodify</code>.</p>
          </>}>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-black/30 rounded-lg p-2 text-xs font-mono">
              {ordreArbre(BASE).map((e) => {
                const p = profondeur(e.dn), trouve = resultats.some((r) => r.dn === e.dn);
                return (
                  <button key={e.dn} onClick={() => setSel(e.dn)} className="block w-full text-left py-0.5 px-1 rounded"
                    style={{ paddingLeft: 6 + p * 18, background: sel === e.dn ? "#22c55e18" : undefined, color: sel === e.dn ? "#22c55e" : trouve ? "#f59e0b" : "#cbd5e1" }}>
                    {p > 0 ? "└ " : ""}{p === 0 ? e.dn : rdn(e.dn)}{trouve ? "  ●" : ""}
                  </button>
                );
              })}
              <p className="text-[10px] text-[#64748b] mt-2 font-sans">● = entrée trouvée par la recherche ci-dessous</p>
            </div>
            <div>
              <p className="text-xs text-[#64748b] mb-1">Entrée sélectionnée (LDIF)</p>
              <pre className="text-[11px] leading-5 bg-black/30 rounded-lg p-3 overflow-x-auto text-[#cbd5e1]">{ldif(entree)}</pre>
              <p className="text-[11px] text-[#64748b] mt-2">RDN : <span className="font-mono text-[#e2e8f0]">{rdn(entree.dn)}</span> · parent : <span className="font-mono text-[#e2e8f0]">{parent(entree.dn) || "—"}</span></p>
            </div>
          </div>
        </Card>

        <Card color="#00d4ff" title="Recherche & filtres" formula="(attr=valeur) · (attr=val*) · (attr=*) · (attr>=n) · (&(…)(…)) · (|(…)(…)) · (!(…))"
          explainer={<>
            <p>Une recherche LDAP a trois paramètres : la <strong>base</strong> (où commencer), la <strong>portée</strong> (base : l&apos;entrée seule ; one : ses enfants directs ; sub : tout le sous-arbre) et le <strong>filtre</strong>.</p>
            <p>Les filtres utilisent la <strong>notation préfixée</strong> : l&apos;opérateur se place avant ses opérandes, et chaque condition est entre parenthèses. Le joker * permet la présence (cn=*) ou la recherche partielle (sn=Dup*). Les comparaisons sont insensibles à la casse pour la plupart des attributs.</p>
          </>}>
          <div className="grid sm:grid-cols-2 gap-2">
            <Select label="Base de recherche (-b)" value={base} onChange={setBase} options={ANNUAIRE.filter((e) => profondeur(e.dn) <= 1).map((e) => ({ value: e.dn, label: e.dn }))} />
            <Select label="Portée (-s)" value={scope} onChange={setScope} options={[{ value: "sub", label: "sub (sous-arbre)" }, { value: "one", label: "one (enfants directs)" }, { value: "base", label: "base (l'entrée seule)" }]} />
          </div>
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Filtre</label>
            <input value={filtre} onChange={(e) => setFiltre(e.target.value)} spellCheck={false}
              className="w-full bg-[#0f1117] border px-3 py-2 rounded-lg text-sm font-mono outline-none" style={{ borderColor: erreur ? "#ef4444" : "#2a2d3a" }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {EXEMPLES.map(([l, f]) => <button key={l} onClick={() => setFiltre(f)} className="px-2 py-1 text-xs border border-[#2a2d3a] text-[#94a3b8] rounded hover:text-white">{l}</button>)}
          </div>
          <div>
            <label className="text-xs text-[#64748b] mb-1 block">Attributs à afficher (vide = tous)</label>
            <input value={attrs} onChange={(e) => setAttrs(e.target.value)} className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono outline-none" />
          </div>
          <pre className="text-[11px] bg-black/30 rounded-lg p-3 overflow-x-auto text-[#94a3b8]">{`ldapsearch -x -H ldap://localhost -b "${base}" -s ${scope} "${filtre}" ${attrs}`}</pre>
          {erreur ? <Hint>✗ Filtre invalide : {erreur}</Hint> : (
            <>
              <p className="text-xs text-[#64748b]"># {resultats.length} entrée{resultats.length > 1 ? "s" : ""} trouvée{resultats.length > 1 ? "s" : ""}</p>
              <pre className="text-[11px] leading-5 bg-black/30 rounded-lg p-3 overflow-x-auto text-[#cbd5e1] max-h-80 overflow-y-auto">{resultats.map((e) => [
                `dn: ${e.dn}`,
                ...Object.entries(e.attrs).filter(([k]) => !listeAttrs.length || listeAttrs.some((a) => a.toLowerCase() === k.toLowerCase())).flatMap(([k, vs]) => vs.map((v) => `${k}: ${v}`)),
              ].join("\n")).join("\n\n") || "(aucun résultat)"}</pre>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
