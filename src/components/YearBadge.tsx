import { ANNEES, Tool } from "@/lib/categories";

/** Pastille « BUT1 · R113 » indiquant l'année et la ressource d'un outil */
export default function YearBadge({ tool, compact }: { tool: Tool; compact?: boolean }) {
  const a = ANNEES.find((x) => x.value === tool.annee);
  if (!a) return null;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-px rounded text-[9px] font-mono font-semibold whitespace-nowrap border"
      style={{ color: a.color, borderColor: `${a.color}55`, background: `${a.color}12` }}
      title={`${a.label}${tool.module ? ` — ressource ${tool.module}` : ""}`}>
      {a.court}
      {!compact && tool.module && <span className="opacity-70 font-normal">· {tool.module}</span>}
    </span>
  );
}
