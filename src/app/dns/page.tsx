"use client";
import { useState } from "react";

/* Requêtes DNS over HTTPS (RFC 8484, format JSON) envoyées directement depuis le navigateur
   vers deux résolveurs publics, pour comparer leurs réponses. */

const TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA", "CAA"] as const;
type RType = (typeof TYPES)[number];

// Numéros de type (RFC 1035 & suivantes) → nom
const TYPE_NAMES: Record<number, string> = { 1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 15: "MX", 16: "TXT", 28: "AAAA", 257: "CAA" };

// Codes RCODE les plus courants
const RCODES: Record<number, string> = { 0: "NOERROR", 1: "FORMERR", 2: "SERVFAIL", 3: "NXDOMAIN", 5: "REFUSED" };

const RESOLVERS = [
  { name: "Google", ip: "8.8.8.8", url: (n: string, t: string) => `https://dns.google/resolve?name=${n}&type=${t}` },
  { name: "Cloudflare", ip: "1.1.1.1", url: (n: string, t: string) => `https://cloudflare-dns.com/dns-query?name=${n}&type=${t}` },
];

interface Answer { name: string; type: number; TTL: number; data: string }
interface DohResponse { Status: number; AD: boolean; Answer?: Answer[] }
interface Result { resolver: string; ip: string; ms: number; status: number; dnssec: boolean; answers: Answer[]; error?: string }

async function query(r: (typeof RESOLVERS)[number], name: string, type: RType): Promise<Result> {
  const start = performance.now();
  try {
    const res = await fetch(r.url(encodeURIComponent(name), type), { headers: { accept: "application/dns-json" } });
    const json: DohResponse = await res.json();
    return {
      resolver: r.name, ip: r.ip, ms: Math.round(performance.now() - start),
      status: json.Status, dnssec: json.AD, answers: json.Answer ?? [],
    };
  } catch {
    return { resolver: r.name, ip: r.ip, ms: 0, status: -1, dnssec: false, answers: [], error: "Résolveur injoignable" };
  }
}

const sameAnswers = (a: Answer[], b: Answer[]) =>
  JSON.stringify(a.map((x) => x.data).sort()) === JSON.stringify(b.map((x) => x.data).sort());

export default function DnsPage() {
  const [name, setName] = useState("");
  const [type, setType] = useState<RType>("A");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (t: RType = type) => {
    const domain = name.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain) return;
    setType(t);
    setLoading(true);
    setResults(await Promise.all(RESOLVERS.map((r) => query(r, domain, t))));
    setLoading(false);
  };

  const agree = results && results.every((r) => !r.error) && sameAnswers(results[0].answers, results[1].answers);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🔎 Lookup DNS</h1>
      <p className="text-sm text-[#64748b] mb-8">
        Interroge deux résolveurs publics en DNS over HTTPS (RFC 8484) et compare leurs réponses — l&apos;équivalent de <span className="font-mono">dig</span> depuis le navigateur.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="flex gap-3 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de domaine (ex. univ-montp3.fr)"
          className="flex-1 glass px-4 py-2.5 rounded-lg text-sm outline-none focus:border-[#00d4ff] border border-[#2a2d3a] transition-colors" />
        <button type="submit" disabled={loading}
          className="px-5 py-2.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg hover:bg-[#00d4ff]/20 transition-all text-sm font-medium disabled:opacity-50">
          {loading ? "..." : "Résoudre"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-8" role="group" aria-label="Type d'enregistrement">
        {TYPES.map((t) => (
          <button key={t} onClick={() => (name.trim() ? lookup(t) : setType(t))} aria-pressed={t === type}
            className={`px-3 py-1 rounded text-xs font-mono border transition-all cursor-pointer ${t === type
              ? "text-[#00d4ff] border-[#00d4ff]/40 bg-[#00d4ff]/10"
              : "text-[#64748b] border-[#2a2d3a] hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {results && (
        <>
          <p className={`text-xs mb-4 ${agree ? "text-green-400" : "text-yellow-400"}`}>
            {agree ? "✓ Les deux résolveurs renvoient la même réponse" : "⚠ Réponses différentes (propagation en cours, GeoDNS ou load balancing)"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {results.map((r) => (
              <div key={r.resolver} className="glass rounded-xl p-5 text-sm">
                <div className="flex justify-between items-baseline mb-3">
                  <h2 className="font-semibold text-[#e2e8f0]">{r.resolver} <span className="font-mono text-xs text-[#64748b]">{r.ip}</span></h2>
                  {!r.error && <span className="text-xs text-[#64748b]">{r.ms} ms</span>}
                </div>
                {r.error ? <p className="text-red-400 text-xs">{r.error}</p> : (
                  <>
                    <div className="flex gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded text-xs border font-mono ${r.status === 0 ? "text-green-400 border-green-400/30" : "text-red-400 border-red-400/30"}`}>
                        {RCODES[r.status] ?? `RCODE ${r.status}`}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs border ${r.dnssec ? "text-green-400 border-green-400/30" : "text-[#475569] border-[#2a2d3a]"}`}
                        title="Bit AD : le résolveur a validé la chaîne DNSSEC">
                        DNSSEC {r.dnssec ? "validé" : "non validé"}
                      </span>
                    </div>
                    {r.answers.length === 0 ? (
                      <p className="text-xs text-[#64748b]">Aucun enregistrement {type}.</p>
                    ) : (
                      <table className="w-full text-xs">
                        <thead><tr className="text-[#64748b] text-left"><th className="pb-1 font-normal">Type</th><th className="pb-1 font-normal">TTL</th><th className="pb-1 font-normal">Valeur</th></tr></thead>
                        <tbody>
                          {r.answers.map((a, i) => (
                            <tr key={i} className="border-t border-[#2a2d3a] align-top">
                              <td className="py-1.5 pr-2 font-mono text-[#00d4ff]">{TYPE_NAMES[a.type] ?? a.type}</td>
                              <td className="py-1.5 pr-2 font-mono text-[#94a3b8]">{a.TTL}s</td>
                              <td className="py-1.5 font-mono text-[#e2e8f0] break-all">{a.data}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
