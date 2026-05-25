"use client";
import { useState } from "react";

// Tokenizer + parser for boolean expressions
// Supported: AND, OR, NOT, XOR, NAND, NOR, XNOR, parentheses, variables A-Z

function tokenize(expr: string): string[] {
  return expr.toUpperCase()
    .replace(/\(/g," ( ").replace(/\)/g," ) ")
    .replace(/\bNAND\b/g," NAND ").replace(/\bNOR\b/g," NOR ")
    .replace(/\bXNOR\b/g," XNOR ").replace(/\bXOR\b/g," XOR ")
    .replace(/\bNOT\b/g," NOT ").replace(/\bAND\b/g," AND ").replace(/\bOR\b/g," OR ")
    .replace(/[!']/g," NOT ").replace(/\./g," AND ").replace(/\+/g," OR ")
    .split(/\s+/).filter(Boolean);
}

function getVars(tokens: string[]): string[] {
  return [...new Set(tokens.filter(t=>/^[A-Z]$/.test(t)))].sort();
}

function evaluate(tokens: string[], vars: Record<string,boolean>): boolean {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseOr(): boolean {
    let left = parseAnd();
    while (peek()==="OR" || peek()==="NOR") {
      const op = consume();
      const right = parseAnd();
      left = op==="NOR" ? !(left||right) : (left||right);
    }
    return left;
  }
  function parseAnd(): boolean {
    let left = parseXor();
    while (peek()==="AND" || peek()==="NAND") {
      const op = consume();
      const right = parseXor();
      left = op==="NAND" ? !(left&&right) : (left&&right);
    }
    return left;
  }
  function parseXor(): boolean {
    let left = parseNot();
    while (peek()==="XOR" || peek()==="XNOR") {
      const op = consume();
      const right = parseNot();
      left = op==="XNOR" ? !(left!==right) : (left!==right);
    }
    return left;
  }
  function parseNot(): boolean {
    if (peek()==="NOT") { consume(); return !parsePrimary(); }
    return parsePrimary();
  }
  function parsePrimary(): boolean {
    if (peek()==="(") {
      consume();
      const val = parseOr();
      if (peek()===")") consume();
      return val;
    }
    const t = consume();
    if (t in vars) return vars[t];
    return false;
  }
  try { return parseOr(); } catch { return false; }
}

function buildTruthTable(expr: string) {
  const tokens = tokenize(expr);
  const vars = getVars(tokens);
  if (vars.length === 0 || vars.length > 8) return null;
  const rows = Math.pow(2, vars.length);
  const table = [];
  for (let i = 0; i < rows; i++) {
    const assignment: Record<string,boolean> = {};
    vars.forEach((v,j) => { assignment[v] = !!((i >> (vars.length-1-j)) & 1); });
    let result: boolean;
    try { result = evaluate([...tokens], assignment); }
    catch { return null; }
    table.push({ assignment, result });
  }
  return { vars, table };
}

const EXAMPLES = [
  { label: "AND",        expr: "A AND B" },
  { label: "OR",         expr: "A OR B" },
  { label: "NAND",       expr: "NOT (A AND B)" },
  { label: "XOR",        expr: "A XOR B" },
  { label: "Demi-add.",  expr: "(A XOR B) OR (A AND B)" },
  { label: "Mux 2→1",   expr: "(A AND NOT S) OR (B AND S)" },
  { label: "3 variables",expr: "(A AND B) OR (NOT A AND C)" },
];

export default function CircuitsPage() {
  const [expr, setExpr] = useState("(A AND B) OR (NOT A AND C)");
  const result = buildTruthTable(expr);
  const ones = result?.table.filter(r=>r.result).length ?? 0;
  const zeros = result ? result.table.length - ones : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#f59e0b] mb-2">⚡ Circuits logiques</h1>
      <p className="text-[#64748b] text-sm mb-6">
        Entrez une expression booléenne — génère la table de vérité automatiquement.
        Opérateurs : <code className="text-[#f59e0b]">AND OR NOT XOR NAND NOR XNOR</code> (ou <code className="text-[#f59e0b]">. + !</code>)
      </p>

      <div className="glass rounded-xl p-4 mb-4">
        <input value={expr} onChange={e=>setExpr(e.target.value)}
          className="w-full bg-[#0f1117] border border-[#2a2d3a] px-4 py-2.5 rounded-lg font-mono text-sm outline-none focus:border-[#f59e0b] transition-colors"
          placeholder="A AND B OR NOT C" />
        <div className="flex gap-2 flex-wrap mt-3">
          {EXAMPLES.map(e=>(
            <button key={e.label} onClick={()=>setExpr(e.expr)}
              className="px-2.5 py-1 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-[#f59e0b] hover:border-[#f59e0b]/30 transition-all">
              {e.label}
            </button>
          ))}
        </div>
      </div>

      {/* Référence des portes */}
      <div className="glass rounded-xl p-4 mb-5">
        <p className="text-xs text-[#64748b] mb-3">Référence des portes logiques</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            {op:"AND",  sym:"A·B",  desc:"1 si les deux sont 1"},
            {op:"OR",   sym:"A+B",  desc:"1 si au moins un est 1"},
            {op:"NOT",  sym:"!A",   desc:"Inverse l'entrée"},
            {op:"XOR",  sym:"A⊕B",  desc:"1 si exactement un est 1"},
            {op:"NAND", sym:"!(A·B)",desc:"NOT AND"},
            {op:"NOR",  sym:"!(A+B)",desc:"NOT OR"},
            {op:"XNOR", sym:"!(A⊕B)",desc:"Égalité (1 si identiques)"},
          ].map(g=>(
            <div key={g.op} className="bg-black/20 rounded-lg p-2 text-center">
              <div className="text-[#f59e0b] font-mono font-bold text-xs">{g.op}</div>
              <div className="text-[#e2e8f0] font-mono text-[10px] mt-0.5">{g.sym}</div>
              <div className="text-[#64748b] text-[9px] mt-1 leading-3">{g.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {!result && expr && (
        <p className="text-red-400 text-sm">Expression invalide ou trop de variables (max 8).</p>
      )}

      {result && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="glass rounded-xl px-4 py-2.5 text-center">
              <div className="text-xs text-[#64748b]">Variables</div>
              <div className="font-mono font-bold text-[#f59e0b]">{result.vars.join(", ")}</div>
            </div>
            <div className="glass rounded-xl px-4 py-2.5 text-center">
              <div className="text-xs text-[#64748b]">Sorties = 1</div>
              <div className="font-mono font-bold text-[#22c55e]">{ones} / {result.table.length}</div>
            </div>
            <div className="glass rounded-xl px-4 py-2.5 text-center">
              <div className="text-xs text-[#64748b]">Sorties = 0</div>
              <div className="font-mono font-bold text-red-400">{zeros} / {result.table.length}</div>
            </div>
          </div>

          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b border-[#2a2d3a]">
                  {result.vars.map(v=>(
                    <th key={v} className="px-4 py-2 text-[#f59e0b] font-bold">{v}</th>
                  ))}
                  <th className="px-4 py-2 text-[#00d4ff] font-bold border-l border-[#2a2d3a]">F</th>
                </tr>
              </thead>
              <tbody>
                {result.table.map((row,i)=>(
                  <tr key={i} className={`border-b border-[#2a2d3a]/40 ${row.result?"bg-[#22c55e]/5":"bg-red-500/3"}`}>
                    {result.vars.map(v=>(
                      <td key={v} className="px-4 py-1.5 text-center text-[#94a3b8]">
                        {row.assignment[v]?1:0}
                      </td>
                    ))}
                    <td className={`px-4 py-1.5 text-center font-bold border-l border-[#2a2d3a] ${row.result?"text-[#22c55e]":"text-red-400"}`}>
                      {row.result?1:0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Forme normale disjonctive */}
          {ones > 0 && ones <= 8 && (
            <div className="glass rounded-xl p-4 mt-4 text-xs">
              <p className="text-[#64748b] mb-2">Forme Normale Disjonctive (FND / Minterms) :</p>
              <p className="font-mono text-[#e2e8f0] leading-6">
                {result.table.filter(r=>r.result).map(r=>
                  "("+result.vars.map(v=>r.assignment[v]?v:`!${v}`).join("·")+")"
                ).join(" + ")}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
