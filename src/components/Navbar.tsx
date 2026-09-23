"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import YearBadge from "@/components/YearBadge";

export default function Navbar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);

  const activeCategory = CATEGORIES.find((cat) =>
    cat.tools.some((t) => pathname === t.href || pathname.startsWith(t.href + "/"))
  );

  const [openDomain, setOpenDomain] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);

  // Ferme les menus dès que la page change (rendu, pas d'effet — évite les cascades de re-render)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpenDomain(null);
    setMobileOpen(false);
  }

  // Clic en dehors / Échap → ferme le dropdown desktop
  useEffect(() => {
    if (!openDomain) return;
    const onClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenDomain(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenDomain(null); };
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [openDomain]);

  const toggleMobile = () => {
    setMobileOpen((o) => {
      const next = !o;
      if (next) setMobileExpanded(activeCategory?.label ?? null);
      return next;
    });
  };

  const openDomainData = CATEGORIES.find((c) => c.label === openDomain);

  return (
    <nav ref={navRef} className="glass sticky top-0 z-50 border-b border-[#2a2d3a]">
      {/* Barre principale */}
      <div className="px-4 py-2.5 flex items-center gap-1">
        <Link href="/" className="text-[#00d4ff] font-bold text-base tracking-widest shrink-0 mr-3" onClick={() => setOpenDomain(null)}>
          NetLab
        </Link>

        {/* Desktop : onglets par domaine */}
        <div className="hidden lg:flex items-center gap-0.5 flex-1 overflow-x-auto">
          {CATEGORIES.map((cat) => {
            const isActive = cat.label === activeCategory?.label;
            const isOpen = cat.label === openDomain;
            return (
              <button
                key={cat.label}
                onClick={() => setOpenDomain((d) => (d === cat.label ? null : cat.label))}
                aria-expanded={isOpen}
                className="px-2 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer border-b-2"
                style={
                  isOpen
                    ? { color: cat.color, background: `${cat.color}18`, borderBottomColor: "transparent" }
                    : isActive
                      ? { color: cat.color, borderBottomColor: cat.color }
                      : { color: "#64748b", borderBottomColor: "transparent" }
                }
              >
                {cat.label}
                <span className="text-[9px] opacity-60">{isOpen ? "▴" : "▾"}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile : hamburger */}
        <button onClick={toggleMobile} aria-expanded={mobileOpen}
          className="lg:hidden ml-auto text-[#64748b] hover:text-white text-xl px-2 cursor-pointer">
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Desktop : panneau du domaine ouvert (mega-menu) */}
      {openDomainData && (
        <div className="hidden lg:block border-t border-[#2a2d3a] px-4 py-4">
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 max-w-6xl">
            {openDomainData.tools.map((t) => {
              const isCurrent = pathname === t.href || pathname.startsWith(t.href + "/");
              return (
                <Link key={t.href} href={t.href} onClick={() => setOpenDomain(null)}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg border transition-all"
                  style={isCurrent
                    ? { borderColor: openDomainData.color, background: `${openDomainData.color}12` }
                    : { borderColor: "#2a2d3a" }}>
                  <span className="text-base leading-none mt-0.5">{t.icon}</span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold" style={{ color: isCurrent ? openDomainData.color : "#e2e8f0" }}>{t.label}</span>
                      <YearBadge tool={t} />
                    </span>
                    <span className="block text-[10px] text-[#64748b] leading-[14px] mt-0.5">{t.desc}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile : accordéon */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#2a2d3a] px-2 py-2 max-h-[75vh] overflow-y-auto">
          {CATEGORIES.map((cat) => {
            const isActive = cat.label === activeCategory?.label;
            const isExpanded = cat.label === mobileExpanded;
            return (
              <div key={cat.label} className="mb-1">
                <button
                  onClick={() => setMobileExpanded((d) => (d === cat.label ? null : cat.label))}
                  aria-expanded={isExpanded}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all cursor-pointer"
                  style={isActive ? { color: cat.color, background: `${cat.color}0f` } : { color: "#94a3b8" }}>
                  <span className="text-xs font-bold uppercase tracking-wider">{cat.label}</span>
                  <span className="text-[10px] opacity-60">{isExpanded ? "▴" : "▾"}</span>
                </button>
                {isExpanded && (
                  <div className="pl-2 pb-1">
                    {cat.tools.map((t) => {
                      const isCurrent = pathname === t.href || pathname.startsWith(t.href + "/");
                      return (
                        <Link key={t.href} href={t.href} onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all"
                          style={isCurrent ? { color: cat.color, background: `${cat.color}12` } : { color: "#64748b" }}>
                          <span>{t.icon}</span>
                          <span>{t.label}</span>
                          <span className="ml-auto"><YearBadge tool={t} compact /></span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
}
