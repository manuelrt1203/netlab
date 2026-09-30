"use client";
import { useState } from "react";

/* RDAP (RFC 9082/9083) est le successeur JSON de WHOIS. rdap.org redirige vers
   le serveur RDAP du registre compétent (Verisign pour .com, AFNIC pour .fr, RIPE/ARIN pour les IP…). */

interface RdapEvent { eventAction: string; eventDate: string }
interface RdapEntity { roles?: string[]; vcardArray?: [string, [string, object, string, string | string[]][]]; entities?: RdapEntity[] }
interface Rdap {
  objectClassName: string;
  ldhName?: string;
  handle?: string;
  name?: string;
  status?: string[];
  events?: RdapEvent[];
  entities?: RdapEntity[];
  nameservers?: { ldhName: string }[];
  secureDNS?: { delegationSigned?: boolean };
  startAddress?: string;
  endAddress?: string;
  cidr0_cidrs?: { v4prefix?: string; v6prefix?: string; length: number }[];
  country?: string;
  type?: string;
  port43?: string;
  errorCode?: number;
  title?: string;
}

const EVENTS: Record<string, string> = {
  registration: "Création",
  expiration: "Expiration",
  "last changed": "Dernière modification",
  "last update of RDAP database": "Mise à jour RDAP",
};

const ROLES: Record<string, string> = {
  registrar: "Bureau d'enregistrement",
  registrant: "Titulaire",
  abuse: "Contact abus",
  administrative: "Administratif",
  technical: "Technique",
};

const isIp = (s: string) => /^[\d.]+$/.test(s) || s.includes(":");

/** Nom lisible d'une entité à partir de sa vCard (champ "fn") */
function entityName(e: RdapEntity): string | null {
  const fn = e.vcardArray?.[1]?.find((f) => f[0] === "fn");
  return fn ? String(fn[3]) : null;
}

/** Aplatis les entités imbriquées (le contact abus est souvent sous le registrar) */
function flatten(list: RdapEntity[] = []): RdapEntity[] {
  return list.flatMap((e) => [e, ...flatten(e.entities)]);
}

export default function WhoisPage() {
  const [q, setQ] = useState("");
  const [data, setData] = useState<Rdap | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(0);

  const lookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = q.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!target) return;
    setLoading(true);
    setError("");
    setData(null);
    try {
      const res = await fetch(`https://rdap.org/${isIp(target) ? "ip" : "domain"}/${encodeURIComponent(target)}`, {
        headers: { accept: "application/rdap+json" },
      });
      if (res.status === 404) throw new Error("Aucun enregistrement : domaine libre ou extension sans serveur RDAP");
      const json: Rdap = await res.json();
      if (json.errorCode) throw new Error(json.title || `Erreur ${json.errorCode}`);
      setData(json);
      setFetchedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const entities = flatten(data?.entities)
    .map((e) => ({ roles: e.roles ?? [], name: entityName(e) }))
    .filter((e, i, all) => e.name && all.findIndex((x) => x.name === e.name && x.roles.join() === e.roles.join()) === i);
  const fmt = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const expiration = data?.events?.find((e) => e.eventAction === "expiration");
  const joursRestants = expiration ? Math.ceil((new Date(expiration.eventDate).getTime() - fetchedAt) / 86_400_000) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">📜 WHOIS / RDAP</h1>
      <p className="text-sm text-[#64748b] mb-8">
        Qui possède un domaine ou une plage d&apos;IP, depuis quand, et chez quel registre. RDAP est le successeur JSON du protocole WHOIS (port 43).
      </p>

      <form onSubmit={lookup} className="flex gap-3 mb-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Domaine ou IP (ex. wikipedia.org, 193.51.24.1)"
          className="flex-1 glass px-4 py-2.5 rounded-lg text-sm outline-none focus:border-[#00d4ff] border border-[#2a2d3a] transition-colors" />
        <button type="submit" disabled={loading}
          className="px-5 py-2.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg hover:bg-[#00d4ff]/20 transition-all text-sm font-medium disabled:opacity-50">
          {loading ? "..." : "Interroger"}
        </button>
      </form>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {data && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="glass rounded-xl p-5 space-y-2.5 text-sm">
              {data.objectClassName === "domain" ? (
                <>
                  <Row label="Domaine" value={data.ldhName?.toLowerCase()} accent />
                  {data.events?.filter((e) => EVENTS[e.eventAction]).map((e) => (
                    <Row key={e.eventAction} label={EVENTS[e.eventAction]} value={fmt(e.eventDate)} />
                  ))}
                  {joursRestants !== null && (
                    <Row label="Reste" value={`${joursRestants} jours`} warn={joursRestants < 30} />
                  )}
                  <Row label="DNSSEC" value={data.secureDNS?.delegationSigned ? "Signé" : "Non signé"} />
                </>
              ) : (
                <>
                  <Row label="Plage" value={`${data.startAddress} – ${data.endAddress}`} accent />
                  {data.cidr0_cidrs?.map((c) => (
                    <Row key={c.v4prefix ?? c.v6prefix} label="CIDR" value={`${c.v4prefix ?? c.v6prefix}/${c.length}`} />
                  ))}
                  <Row label="Nom" value={data.name} />
                  <Row label="Handle" value={data.handle} />
                  <Row label="Pays" value={data.country} />
                  <Row label="Type" value={data.type} />
                  {data.events?.filter((e) => EVENTS[e.eventAction]).map((e) => (
                    <Row key={e.eventAction} label={EVENTS[e.eventAction]} value={fmt(e.eventDate)} />
                  ))}
                </>
              )}
            </div>

            <div className="glass rounded-xl p-5 text-sm space-y-4">
              {entities.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Acteurs</h2>
                  <ul className="space-y-1.5">
                    {entities.map((e, i) => (
                      <li key={i} className="flex justify-between gap-3">
                        <span className="text-[#64748b]">{e.roles.map((r) => ROLES[r] ?? r).join(", ")}</span>
                        <span className="text-right text-[#e2e8f0]">{e.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {data.nameservers && data.nameservers.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Serveurs de noms (NS)</h2>
                  <ul className="font-mono text-xs text-[#e2e8f0] space-y-1">
                    {data.nameservers.map((n) => <li key={n.ldhName}>{n.ldhName.toLowerCase()}</li>)}
                  </ul>
                </div>
              )}
              {data.status && data.status.length > 0 && (
                <div>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Statuts EPP</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {data.status.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded text-[11px] border border-[#2a2d3a] text-[#94a3b8]">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <button onClick={() => setRaw((r) => !r)} className="text-xs text-[#64748b] hover:text-white cursor-pointer">
            {raw ? "▴ Masquer" : "▾ Voir"} la réponse RDAP brute (JSON)
          </button>
          {raw && (
            <pre className="glass rounded-xl p-4 text-[11px] text-[#94a3b8] overflow-x-auto max-h-96">{JSON.stringify(data, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent, warn }: { label: string; value?: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#64748b]">{label}</span>
      <span className={`font-mono text-right ${warn ? "text-yellow-400" : accent ? "text-[#00d4ff]" : "text-[#e2e8f0]"}`}>{value || "—"}</span>
    </div>
  );
}
