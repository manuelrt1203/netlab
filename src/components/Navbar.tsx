"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const CATEGORIES = [
  {
    label: "Réseaux",
    color: "#00d4ff",
    tools: [
      { href:"/ip-geo",     icon:"🌐", label:"IP / Géo"  },
      { href:"/monitoring", icon:"📡", label:"Monitoring" },
      { href:"/cidr",       icon:"🔢", label:"CIDR"       },
      { href:"/osi",        icon:"📚", label:"OSI"        },
    ],
  },
  {
    label: "Systèmes",
    color: "#22c55e",
    tools: [
      { href:"/ordonnancement", icon:"⏱", label:"Ordo CPU" },
      { href:"/remplacement",   icon:"📄", label:"Pages"    },
    ],
  },
  {
    label: "Architecture",
    color: "#f59e0b",
    tools: [
      { href:"/arm",     icon:"⚙️", label:"ARM"     },
      { href:"/bases",   icon:"🔣", label:"Bases"   },
      { href:"/ieee754", icon:"🔬", label:"IEEE 754" },
      { href:"/circuits",icon:"⚡", label:"Circuits" },
    ],
  },
  {
    label: "Algorithmique",
    color: "#7c3aed",
    tools: [
      { href:"/graphes",       icon:"🕸", label:"Graphes" },
      { href:"/tri",           icon:"📊", label:"Tri"     },
      { href:"/simulation-3d", icon:"🔷", label:"3D"      },
    ],
  },
  {
    label: "Télécoms",
    color: "#ec4899",
    tools: [
      { href:"/telecoms", icon:"📶", label:"Télécoms" },
    ],
  },
  {
    label: "Sécurité",
    color: "#ef4444",
    tools: [
      { href:"/crypto", icon:"🔐", label:"Crypto" },
    ],
  },
  {
    label: "Maths",
    color: "#a78bfa",
    tools: [
      { href:"/maths", icon:"∑", label:"Calculateur" },
    ],
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="glass sticky top-0 z-50 border-b border-[#2a2d3a]">
      {/* Barre principale */}
      <div className="px-4 py-2 flex items-center gap-4">
        <Link href="/" className="text-[#00d4ff] font-bold text-base tracking-widest shrink-0" onClick={()=>setOpen(false)}>
          NetLab
        </Link>

        {/* Desktop: catégories inline */}
        <div className="hidden lg:flex items-center gap-1 flex-1 overflow-x-auto">
          {CATEGORIES.map(cat=>(
            <div key={cat.label} className="flex items-center gap-0.5 shrink-0">
              <span className="text-[10px] text-[#2a2d3a] mx-1 font-bold tracking-wider uppercase">{cat.label}</span>
              {cat.tools.map(t=>(
                <Link key={t.href} href={t.href}
                  className={`px-2 py-1 rounded text-xs transition-all whitespace-nowrap ${
                    pathname===t.href||pathname.startsWith(t.href+"/")
                      ? "text-white"
                      : "text-[#64748b] hover:text-[#e2e8f0] hover:bg-white/5"
                  }`}
                  style={pathname===t.href||pathname.startsWith(t.href+"/")?{color:cat.color}:{}}>
                  {t.icon} {t.label}
                </Link>
              ))}
              <span className="text-[#2a2d3a] mx-1">|</span>
            </div>
          ))}
        </div>

        {/* Mobile: hamburger */}
        <button onClick={()=>setOpen(o=>!o)}
          className="lg:hidden ml-auto text-[#64748b] hover:text-white text-xl px-2">
          {open?"✕":"☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t border-[#2a2d3a] px-4 py-3 grid grid-cols-2 gap-1">
          {CATEGORIES.map(cat=>(
            <div key={cat.label}>
              <p className="text-[9px] text-[#64748b] font-bold uppercase tracking-wider mb-1 mt-2">{cat.label}</p>
              {cat.tools.map(t=>(
                <Link key={t.href} href={t.href} onClick={()=>setOpen(false)}
                  className={`block px-2 py-1 rounded text-xs mb-0.5 transition-all ${
                    pathname===t.href?"font-medium":"text-[#64748b] hover:text-white hover:bg-white/5"
                  }`}
                  style={pathname===t.href?{color:cat.color}:{}}>
                  {t.icon} {t.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
