"use client";
import { useState } from "react";

function ipToNum(ip: string): number {
  return ip.split(".").reduce((acc, b) => (acc << 8) | parseInt(b), 0) >>> 0;
}
function numToIp(n: number): string {
  return [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join(".");
}
function toBin8(n: number): string {
  return (n & 255).toString(2).padStart(8, "0");
}

interface CidrResult {
  network: string; broadcast: string; firstHost: string; lastHost: string;
  mask: string; wildcard: string; hosts: number; prefix: number;
  ipBin: string[]; maskBin: string[];
}

function calc(cidr: string): CidrResult | null {
  const m = cidr.trim().match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
  if (!m) return null;
  const [, ip, prefStr] = m;
  const prefix = parseInt(prefStr);
  if (prefix < 0 || prefix > 32) return null;
  const parts = ip.split(".").map(Number);
  if (parts.some(p => p < 0 || p > 255)) return null;

  const maskNum  = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const ipNum    = ipToNum(ip);
  const netNum   = (ipNum & maskNum) >>> 0;
  const bcastNum = (netNum | (~maskNum >>> 0)) >>> 0;

  return {
    network:   numToIp(netNum),
    broadcast: numToIp(bcastNum),
    firstHost: prefix >= 31 ? numToIp(netNum) : numToIp(netNum + 1),
    lastHost:  prefix >= 31 ? numToIp(bcastNum) : numToIp(bcastNum - 1),
    mask:      numToIp(maskNum),
    wildcard:  numToIp(~maskNum >>> 0),
    hosts:     prefix >= 32 ? 1 : prefix === 31 ? 2 : Math.pow(2, 32 - prefix) - 2,
    prefix,
    ipBin:   parts.map(toBin8),
    maskBin: [24,16,8,0].map(s => toBin8(maskNum >>> s)),
  };
}

const EXAMPLES = ["192.168.1.0/24","10.0.0.0/8","172.16.0.0/12","192.168.100.64/26","10.10.10.0/30"];

export default function CidrPage() {
  const [input, setInput] = useState("192.168.1.0/24");
  const result = calc(input);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#00d4ff] mb-2">🔢 Calcul de sous-réseau (CIDR)</h1>
      <p className="text-[#64748b] text-sm mb-6">Entrez une adresse au format <code className="text-[#00d4ff]">IP/préfixe</code></p>

      <div className="flex gap-3 mb-4">
        <input value={input} onChange={e=>setInput(e.target.value)}
          placeholder="192.168.1.0/24"
          className="flex-1 glass px-4 py-2.5 rounded-lg text-sm font-mono outline-none border border-[#2a2d3a] focus:border-[#00d4ff]" />
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        {EXAMPLES.map(ex=>(
          <button key={ex} onClick={()=>setInput(ex)}
            className="px-2.5 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-[#00d4ff] hover:border-[#00d4ff]/30 transition-all font-mono">
            {ex}
          </button>
        ))}
      </div>

      {!result && input && <p className="text-red-400 text-sm">Format invalide. Exemple : 192.168.1.0/24</p>}

      {result && (<>
        {/* Visualisation binaire */}
        <div className="glass rounded-xl p-5 mb-5">
          <p className="text-xs text-[#64748b] mb-3">Représentation binaire — <span className="text-[#00d4ff]">bits réseau</span> / <span className="text-[#f59e0b]">bits hôte</span></p>
          {["Adresse IP","Masque"].map((label,li)=>{
            const bins = li===0 ? result.ipBin : result.maskBin;
            return (
              <div key={label} className="flex items-center gap-3 mb-2 font-mono text-xs">
                <span className="text-[#64748b] w-20 shrink-0">{label}</span>
                <div className="flex gap-1">
                  {bins.map((oct,oi)=>(
                    <span key={oi} className="flex gap-0">
                      {oct.split("").map((bit,bi)=>{
                        const pos = oi*8+bi;
                        const isNet = pos < result.prefix;
                        return (
                          <span key={bi}
                            className={`w-5 h-6 flex items-center justify-center rounded-sm text-[11px] font-bold ${
                              isNet ? "bg-[#00d4ff]/15 text-[#00d4ff]" : "bg-[#f59e0b]/10 text-[#f59e0b]"}`}>
                            {bit}
                          </span>
                        );
                      })}
                      {oi<3 && <span className="text-[#2a2d3a] mx-1">·</span>}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Résultats */}
        <div className="glass rounded-xl p-5 grid grid-cols-2 gap-3 text-sm">
          {[
            ["Réseau",          result.network,   true],
            ["Broadcast",       result.broadcast, true],
            ["1ère adresse",    result.firstHost, false],
            ["Dernière adresse",result.lastHost,  false],
            ["Masque",          result.mask,      false],
            ["Masque inverse",  result.wildcard,  false],
            ["Hôtes utilisables", result.hosts.toLocaleString(), false],
            ["Préfixe",         `/`+result.prefix, false],
          ].map(([label,val,accent])=>(
            <div key={label as string} className="flex flex-col">
              <span className="text-[#64748b] text-xs">{label as string}</span>
              <span className={`font-mono font-semibold ${accent?"text-[#00d4ff]":"text-[#e2e8f0]"}`}>{val as string}</span>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}
