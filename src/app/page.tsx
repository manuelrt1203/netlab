import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";

export default function Home() {
  return (
    <div className="px-6 py-12 max-w-6xl mx-auto">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-[#00d4ff] tracking-widest mb-3">NetLab</h1>
        <p className="text-[#64748b]">Suite d&apos;outils interactifs pour la formation en informatique</p>
        <div className="flex justify-center gap-4 mt-3 text-xs text-[#2a2d3a]">
          {[`${CATEGORIES.reduce((n,c)=>n+c.tools.length,0)} outils`,`${CATEGORIES.length} domaines`,"100% local"].map(t=>(
            <span key={t} className="px-3 py-1 border border-[#2a2d3a] rounded-full">{t}</span>
          ))}
        </div>
      </div>

      {CATEGORIES.map(cat=>(
        <div key={cat.label} className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-[#2a2d3a]" />
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{color:cat.color}}>{cat.label}</h2>
            <div className="h-px flex-1 bg-[#2a2d3a]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cat.tools.map(t=>(
              <Link key={t.href} href={t.href}
                className="glass rounded-xl p-4 hover:scale-[1.02] transition-all border border-[#2a2d3a]"
                style={{borderColor:"#2a2d3a"}}>
                <div className="text-2xl mb-2">{t.icon}</div>
                <h3 className="font-semibold text-sm mb-1" style={{color:cat.color}}>{t.label}</h3>
                <p className="text-[#64748b] text-xs leading-4">{t.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
