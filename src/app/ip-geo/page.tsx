"use client";
import { useState, useCallback } from "react";
import dynamic from "next/dynamic";

const IpMap = dynamic(() => import("@/components/IpMap"), { ssr: false });

interface IpData {
  status: string;
  query: string;
  country: string;
  countryCode: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  mobile: boolean;
  proxy: boolean;
  hosting: boolean;
  message?: string;
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
      if (json.status === "fail") {
        setError(json.message || "IP introuvable");
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
            <Row label="IP" value={data.query} accent />
            <Row label="Pays" value={`${data.country} (${data.countryCode})`} />
            <Row label="Région" value={data.regionName} />
            <Row label="Ville" value={`${data.city} ${data.zip}`} />
            <Row label="Coordonnées" value={`${data.lat}, ${data.lon}`} />
            <Row label="Fuseau" value={data.timezone} />
            <Row label="FAI" value={data.isp} />
            <Row label="Org" value={data.org} />
            <Row label="AS" value={data.as} />
            <div className="flex gap-3 pt-2 border-t border-[#2a2d3a]">
              <Tag active={data.mobile} label="Mobile" />
              <Tag active={data.proxy} label="Proxy" color="red" />
              <Tag active={data.hosting} label="Hébergement" color="yellow" />
            </div>
          </div>

          <div className="glass rounded-xl overflow-hidden" style={{ height: "320px" }}>
            <IpMap lat={data.lat} lon={data.lon} label={`${data.city}, ${data.country}`} />
          </div>
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
