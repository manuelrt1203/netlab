"use client";
import { useState } from "react";

export default function MonitoringPage() {
  const [host, setHost] = useState("");
  const [action, setAction] = useState<"ping" | "traceroute">("ping");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!host.trim()) return;
    setLoading(true);
    setOutput("");
    try {
      const res = await fetch(`/api/monitor?host=${encodeURIComponent(host)}&action=${action}`);
      const json = await res.json();
      setOutput(json.output || json.error || "Aucun résultat");
    } catch {
      setOutput("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  const presets = ["google.com", "8.8.8.8", "cloudflare.com", "1.1.1.1"];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-[#22c55e] mb-8">📡 Monitoring Réseau</h1>

      <div className="glass rounded-xl p-5 mb-5">
        <div className="flex gap-3 mb-4">
          <input
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="IP ou domaine cible"
            className="flex-1 bg-transparent border border-[#2a2d3a] px-4 py-2.5 rounded-lg text-sm outline-none focus:border-[#22c55e] transition-colors"
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value as "ping" | "traceroute")}
            className="bg-[#1a1d27] border border-[#2a2d3a] px-3 py-2.5 rounded-lg text-sm outline-none"
          >
            <option value="ping">Ping</option>
            <option value="traceroute">Traceroute</option>
          </select>
          <button
            onClick={run}
            disabled={loading || !host.trim()}
            className="px-5 py-2.5 bg-[#22c55e]/10 border border-[#22c55e]/30 text-[#22c55e] rounded-lg hover:bg-[#22c55e]/20 transition-all text-sm font-medium disabled:opacity-50"
          >
            {loading ? "..." : "Lancer"}
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => { setHost(p); }}
              className="px-2.5 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-white hover:border-[#22c55e]/30 transition-all"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {(output || loading) && (
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3 text-xs text-[#64748b]">
            <span className={`w-2 h-2 rounded-full ${loading ? "bg-yellow-400 animate-pulse" : "bg-[#22c55e]"}`} />
            {loading ? "En cours..." : `${action.toUpperCase()} → ${host}`}
          </div>
          <pre className="text-xs text-[#e2e8f0] font-mono whitespace-pre-wrap leading-5 max-h-96 overflow-y-auto">
            {loading ? "Connexion en cours..." : output}
          </pre>
        </div>
      )}
    </div>
  );
}
