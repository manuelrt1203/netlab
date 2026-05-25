"use client";
import dynamic from "next/dynamic";

const TrameAnalyzer = dynamic(() => import("@/components/trames/TrameAnalyzer"), { ssr: false });

export default function TramesPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-[#60a5fa] mb-1">Analyseur de trames</h1>
      <p className="text-[#64748b] text-sm mb-6">
        Décodage Ethernet · ARP · IPv4 · ICMP · TCP · UDP — survoler un octet pour l&apos;identifier, cliquer pour le verrouiller.
      </p>
      <TrameAnalyzer />
    </div>
  );
}
