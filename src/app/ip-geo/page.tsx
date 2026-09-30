"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

const IpMap = dynamic(() => import("@/components/IpMap"), { ssr: false });

interface IpData {
  query: string;
  resolvedFrom: string | null;
  type: string;
  country: string;
  countryCode: string;
  flag: string;
  region: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  domain: string;
  privacy: {
    verdict: string;
    confidence: number;
    isVpn: boolean;
    isProxy: boolean;
    isTor: boolean;
    isDatacenter: boolean;
    provider: string | null;
    prefix: string | null;
    abuseContact: string | null;
    signals: { detail: string; weight: number }[];
  } | null;
  reputation: {
    listed: number;
    networkType: string | null;
    sources: { list: string; category: string; maintainer: string | null; since: string | null }[];
  } | null;
  error?: string;
}

export default function IpGeoPage() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<IpData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const lookup = useCallback(async (q: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ip?q=${encodeURIComponent(q)}`);
      const json: IpData = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || "IP introuvable");
        setData(null);
      } else {
        setData(json);
        setHistory((h) => [json.query, ...h.filter((x) => x !== json.query)].slice(0, 8));
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookup(query);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-8">🌐 IP / Géolocalisation</h1>

      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="IP ou domaine (vide = ma propre IP)"
          className="flex-1 glass px-4 py-2.5 rounded-lg text-sm outline-none focus:border-[#00d4ff] border border-[#2a2d3a] transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg hover:bg-[#00d4ff]/20 transition-all text-sm font-medium disabled:opacity-50"
        >
          {loading ? "..." : "Rechercher"}
        </button>
        <button
          type="button"
          onClick={() => lookup("")}
          className="px-4 py-2.5 glass border border-[#2a2d3a] text-[#64748b] rounded-lg hover:text-white transition-all text-sm"
        >
          Ma IP
        </button>
      </form>

      {history.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6">
          {history.map((h) => (
            <button
              key={h}
              onClick={() => { setQuery(h); lookup(h); }}
              className="px-2.5 py-1 text-xs glass rounded border border-[#2a2d3a] text-[#64748b] hover:text-white transition-all"
            >
              {h}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-5 space-y-2.5 text-sm">
            <Row label="IP" value={`${data.query} (${data.type})`} accent />
            {data.resolvedFrom && <Row label="Domaine" value={data.resolvedFrom} />}
            <Row label="Pays" value={`${data.flag} ${data.country} (${data.countryCode})`} />
            <Row label="Région" value={data.region} />
            <Row label="Ville" value={`${data.city} ${data.zip}`} />
            <Row label="Coordonnées" value={`${data.lat}, ${data.lon}`} />
            <Row label="Fuseau" value={data.timezone} />
            <Row label="FAI" value={data.isp} />
            <Row label="Org" value={data.org} />
            <Row label="AS" value={data.as} />
            {data.privacy?.prefix && <Row label="Préfixe" value={data.privacy.prefix} />}
            {data.privacy && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[#2a2d3a]">
                <Tag active={data.privacy.isVpn} label="VPN" color="red" />
                <Tag active={data.privacy.isProxy} label="Proxy" color="red" />
                <Tag active={data.privacy.isTor} label="Tor" color="red" />
                <Tag active={data.privacy.isDatacenter} label="Datacenter" color="yellow" />
              </div>
            )}
          </div>

          <div className="glass rounded-xl overflow-hidden" style={{ height: "320px" }}>
            <IpMap lat={data.lat} lon={data.lon} label={`${data.city}, ${data.country}`} />
          </div>

          <div className="md:col-span-2">
            <Reputation data={data} />
          </div>
        </div>
      )}
    </div>
  );
}

const VERDICTS: Record<string, string> = {
  clean: "Aucun signe d'anonymisation",
  vpn_detected: "VPN / anonymiseur détecté",
  proxy_detected: "Proxy détecté",
  suspicious: "Suspect",
};

function Reputation({ data }: { data: IpData }) {
  const { privacy, reputation } = data;
  if (!privacy && !reputation) {
    return <p className="text-xs text-[#64748b]">Services de réputation indisponibles pour le moment.</p>;
  }
  const listed = reputation?.listed ?? 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {privacy && (
        <div className="glass rounded-xl p-5 text-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-3">Anonymisation</h2>
          <p className={`font-semibold mb-1 ${privacy.verdict === "clean" ? "text-green-400" : "text-red-400"}`}>
            {VERDICTS[privacy.verdict] ?? privacy.verdict}
            {privacy.provider && <span className="font-normal text-[#94a3b8]"> · {privacy.provider}</span>}
          </p>
          <p className="text-xs text-[#64748b] mb-3">Confiance : {Math.round(privacy.confidence * 100)} %</p>
          {privacy.signals.length > 0 && (
            <ul className="space-y-1.5 text-xs text-[#94a3b8]">
              {privacy.signals.map((s) => (
                <li key={s.detail} className="flex gap-2">
                  <span className={s.weight > 0 ? "text-red-400" : "text-[#475569]"}>{s.weight > 0 ? "●" : "○"}</span>
                  {s.detail}
                </li>
              ))}
            </ul>
          )}
          {privacy.abuseContact && (
            <p className="text-xs text-[#64748b] mt-3">Contact abus : <span className="font-mono">{privacy.abuseContact}</span></p>
          )}
          <p className="text-[10px] text-[#475569] mt-3">Source : IPLogs</p>
        </div>
      )}

      {reputation && (
        <div className="glass rounded-xl p-5 text-sm">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-3">Listes noires</h2>
          <p className={`font-semibold mb-3 ${listed ? "text-red-400" : "text-green-400"}`}>
            {listed ? `Présente dans ${listed} liste${listed > 1 ? "s" : ""}` : "Absente des listes noires publiques"}
          </p>
          {listed > 0 && (
            <ul className="space-y-1.5 text-xs max-h-48 overflow-y-auto">
              {reputation.sources.map((s) => (
                <li key={s.list} className="flex justify-between gap-3">
                  <span className="font-mono text-[#e2e8f0]">{s.list}</span>
                  <span className="text-[#64748b] text-right">
                    {s.category}{s.since && ` · depuis le ${new Date(s.since).toLocaleDateString("fr-FR")}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[10px] text-[#475569] mt-3">Source : IPGuardian (140+ listes publiques)</p>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[#64748b]">{label}</span>
      <span className={`font-mono text-right ${accent ? "text-[#00d4ff]" : "text-[#e2e8f0]"}`}>{value || "—"}</span>
    </div>
  );
}

function Tag({ active, label, color = "cyan" }: { active: boolean; label: string; color?: string }) {
  const colors: Record<string, string> = {
    cyan: "text-[#00d4ff] border-[#00d4ff]/30 bg-[#00d4ff]/10",
    red: "text-red-400 border-red-400/30 bg-red-400/10",
    yellow: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${active ? colors[color] : "text-[#2a2d3a] border-[#2a2d3a]"}`}>
      {label}
    </span>
  );
}
