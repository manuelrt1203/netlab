"use client";
import { useState } from "react";

/* Une adresse MAC (EUI-48) = OUI (3 octets, attribué par l'IEEE au constructeur) + 3 octets propres à la carte.
   Les deux bits de poids faible du premier octet ont un sens particulier :
   - bit 0 (I/G) : 0 = unicast, 1 = multicast/broadcast
   - bit 1 (U/L) : 0 = adresse universelle (gravée), 1 = administrée localement (aléatoire, VM…) */

const EXEMPLES = [
  { mac: "00:1A:2B:3C:4D:5E", note: "Unicast universel" },
  { mac: "FC:FB:FB:01:FA:21", note: "Cisco" },
  { mac: "01:00:5E:00:00:FB", note: "Multicast IPv4 (mDNS)" },
  { mac: "FF:FF:FF:FF:FF:FF", note: "Broadcast" },
  { mac: "DA:A1:19:12:34:56", note: "MAC aléatoire (smartphone)" },
];

function parseMac(s: string): string[] | null {
  const hex = s.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
  if (hex.length !== 12) return null;
  return hex.match(/../g);
}

export default function MacPage() {
  const [input, setInput] = useState("");
  const [octets, setOctets] = useState<string[] | null>(null);
  const [vendor, setVendor] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const lookup = async (mac: string) => {
    const o = parseMac(mac);
    setError("");
    setVendor(undefined);
    if (!o) {
      setOctets(null);
      setError("Format attendu : 12 chiffres hexadécimaux (00:1A:2B:3C:4D:5E, 00-1A-2B-…, 001A.2B3C.4D5E)");
      return;
    }
    setOctets(o);
    const first = parseInt(o[0], 16);
    // Pas de constructeur pour une adresse multicast ou administrée localement
    if (first & 0b11) {
      setVendor(null);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/mac?mac=${o.join("")}`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else setVendor(json.vendor);
    } catch {
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const first = octets ? parseInt(octets[0], 16) : 0;
  const ig = first & 1;
  const ul = (first >> 1) & 1;
  const broadcast = octets?.every((o) => o === "FF");

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🏷 Adresse MAC & constructeur</h1>
      <p className="text-sm text-[#64748b] mb-8">
        Retrouve le fabricant d&apos;une carte réseau à partir de son OUI (registre IEEE) et décode les bits I/G et U/L du premier octet.
      </p>

      <form onSubmit={(e) => { e.preventDefault(); lookup(input); }} className="flex gap-3 mb-4">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Adresse MAC (ex. 00:1A:2B:3C:4D:5E)"
          className="flex-1 glass px-4 py-2.5 rounded-lg text-sm font-mono outline-none focus:border-[#00d4ff] border border-[#2a2d3a] transition-colors" />
        <button type="submit" disabled={loading}
          className="px-5 py-2.5 bg-[#00d4ff]/10 border border-[#00d4ff]/30 text-[#00d4ff] rounded-lg hover:bg-[#00d4ff]/20 transition-all text-sm font-medium disabled:opacity-50">
          {loading ? "..." : "Analyser"}
        </button>
      </form>

      <div className="flex flex-wrap gap-2 mb-8">
        {EXEMPLES.map((ex) => (
          <button key={ex.mac} onClick={() => { setInput(ex.mac); lookup(ex.mac); }} title={ex.mac}
            className="px-2.5 py-1 text-xs glass rounded border border-[#2a2d3a] text-[#64748b] hover:text-white transition-all cursor-pointer">
            {ex.note}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

      {octets && (
        <div className="space-y-5">
          {/* Octets : OUI | NIC */}
          <div className="glass rounded-xl p-5">
            <div className="flex justify-center gap-1.5 sm:gap-3 font-mono text-lg sm:text-2xl mb-2">
              {octets.map((o, i) => (
                <span key={i} className={`px-2 py-1 rounded ${i < 3 ? "text-[#00d4ff] bg-[#00d4ff]/10" : "text-[#ec4899] bg-[#ec4899]/10"}`}>{o}</span>
              ))}
            </div>
            <div className="grid grid-cols-2 text-center text-xs text-[#64748b]">
              <span>OUI — constructeur (24 bits)</span>
              <span>NIC — propre à l&apos;interface (24 bits)</span>
            </div>
          </div>

          {/* Premier octet bit à bit */}
          <div className="glass rounded-xl p-5 text-sm">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748b] mb-3">
              Premier octet : 0x{octets[0]} = {first.toString(2).padStart(8, "0")}
            </h2>
            <div className="flex justify-center gap-1 font-mono mb-4">
              {first.toString(2).padStart(8, "0").split("").map((b, i) => (
                <span key={i} className={`w-8 h-8 flex items-center justify-center rounded border ${i === 7
                  ? "border-yellow-400/50 text-yellow-400" : i === 6 ? "border-green-400/50 text-green-400" : "border-[#2a2d3a] text-[#475569]"}`}>
                  {b}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <p><span className="text-yellow-400 font-semibold">Bit I/G = {ig}</span> → {broadcast ? "broadcast (tous les hôtes du segment)" : ig ? "multicast (groupe d'hôtes)" : "unicast (une seule interface)"}</p>
              <p><span className="text-green-400 font-semibold">Bit U/L = {ul}</span> → {broadcast ? "sans objet pour le broadcast (tous les bits sont à 1)" : ul ? "administrée localement (MAC aléatoire, VM, conteneur)" : "universelle (attribuée par l'IEEE, gravée en usine)"}</p>
            </div>
          </div>

          {/* Constructeur */}
          <div className="glass rounded-xl p-5 text-sm flex justify-between gap-4">
            <span className="text-[#64748b]">Constructeur</span>
            <span className="text-right text-[#e2e8f0] font-semibold">
              {loading ? "…" : vendor === undefined ? "—"
                : vendor ?? (ig || ul ? "Aucun (adresse non attribuée par l'IEEE)" : "OUI inconnu du registre")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
