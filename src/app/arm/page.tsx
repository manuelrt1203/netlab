"use client";
import { useState } from "react";

type Registers = Record<string, number>;

const INITIAL_REGS: Registers = Object.fromEntries(
  ["R0","R1","R2","R3","R4","R5","R6","R7","R8","R9","R10","R11","R12","SP","LR","PC"].map((r) => [r, 0])
);

const EXAMPLES = [
  { label: "Addition R0+R1→R2", code: "MOV R0, #5\nMOV R1, #3\nADD R2, R0, R1" },
  { label: "Boucle compteur", code: "MOV R0, #0\nMOV R1, #5\nADD R0, R0, #1\nCMP R0, R1\nBNE -2" },
  { label: "MUL simulation", code: "MOV R0, #4\nMOV R1, #3\nMOV R2, #0\nADD R2, R2, R0\nSUBS R1, R1, #1\nBNE -2" },
];

function parseOperand(op: string, regs: Registers): number {
  op = op.trim();
  if (op.startsWith("#")) return parseInt(op.slice(1));
  if (op in regs) return regs[op];
  return parseInt(op) || 0;
}

function simulate(code: string): { regs: Registers; log: string[] } {
  const lines = code.trim().split("\n").map((l) => l.trim().replace(/;.*$/, "").trim()).filter(Boolean);
  const regs: Registers = { ...INITIAL_REGS };
  const log: string[] = [];
  let flags = { Z: false, N: false, C: false, V: false };
  let pc = 0;
  let steps = 0;

  while (pc < lines.length && steps < 1000) {
    const line = lines[pc];
    steps++;
    const [instr, ...args] = line.split(/[\s,]+/).filter(Boolean);
    const op = instr.toUpperCase();

    if (op === "MOV") {
      regs[args[0]] = parseOperand(args[1], regs);
      log.push(`${line}  →  ${args[0]} = ${regs[args[0]]}`);
    } else if (op === "ADD") {
      regs[args[0]] = parseOperand(args[1], regs) + parseOperand(args[2], regs);
      log.push(`${line}  →  ${args[0]} = ${regs[args[0]]}`);
    } else if (op === "ADDS") {
      regs[args[0]] = parseOperand(args[1], regs) + parseOperand(args[2], regs);
      flags.Z = regs[args[0]] === 0;
      flags.N = regs[args[0]] < 0;
      log.push(`${line}  →  ${args[0]} = ${regs[args[0]]}  [Z=${+flags.Z} N=${+flags.N}]`);
    } else if (op === "SUB") {
      regs[args[0]] = parseOperand(args[1], regs) - parseOperand(args[2], regs);
      log.push(`${line}  →  ${args[0]} = ${regs[args[0]]}`);
    } else if (op === "SUBS") {
      regs[args[0]] = parseOperand(args[1], regs) - parseOperand(args[2], regs);
      flags.Z = regs[args[0]] === 0;
      flags.N = regs[args[0]] < 0;
      log.push(`${line}  →  ${args[0]} = ${regs[args[0]]}  [Z=${+flags.Z} N=${+flags.N}]`);
    } else if (op === "MUL") {
      regs[args[0]] = parseOperand(args[1], regs) * parseOperand(args[2], regs);
      log.push(`${line}  →  ${args[0]} = ${regs[args[0]]}`);
    } else if (op === "CMP") {
      const diff = parseOperand(args[0], regs) - parseOperand(args[1], regs);
      flags.Z = diff === 0;
      flags.N = diff < 0;
      log.push(`${line}  →  flags [Z=${+flags.Z} N=${+flags.N}]`);
    } else if (op === "BNE") {
      if (!flags.Z) {
        const offset = parseOperand(args[0], regs);
        pc = pc + offset;
        log.push(`BNE  →  saut vers ligne ${pc + 1}`);
        continue;
      } else {
        log.push(`BNE  →  pas de saut (Z=1)`);
      }
    } else if (op === "BEQ") {
      if (flags.Z) {
        const offset = parseOperand(args[0], regs);
        pc = pc + offset;
        log.push(`BEQ  →  saut vers ligne ${pc + 1}`);
        continue;
      }
    } else if (op === "B") {
      const offset = parseOperand(args[0], regs);
      pc = pc + offset;
      log.push(`B  →  saut vers ligne ${pc + 1}`);
      continue;
    } else {
      log.push(`⚠️  Instruction non reconnue : ${line}`);
    }
    pc++;
  }
  if (steps >= 1000) log.push("⚠️  Limite d'itérations atteinte (boucle infinie ?)");
  regs.PC = pc;
  return { regs, log };
}

export default function ArmPage() {
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [result, setResult] = useState<{ regs: Registers; log: string[] } | null>(null);

  const run = () => setResult(simulate(code));

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#f59e0b] mb-8">⚙️ Simulation ARM</h1>

      <div className="flex gap-2 flex-wrap mb-4">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.label}
            onClick={() => { setCode(ex.code); setResult(null); }}
            className="px-3 py-1.5 text-xs border border-[#2a2d3a] text-[#64748b] rounded hover:text-[#f59e0b] hover:border-[#f59e0b]/30 transition-all"
          >
            {ex.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <label className="text-xs text-[#64748b] mb-2 block">Code assembleur ARM</label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={12}
            className="w-full glass rounded-xl px-4 py-3 text-sm font-mono outline-none focus:border-[#f59e0b] border border-[#2a2d3a] transition-colors resize-none leading-6"
            spellCheck={false}
          />
          <button
            onClick={run}
            className="mt-3 w-full py-2.5 bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] rounded-lg hover:bg-[#f59e0b]/20 transition-all text-sm font-medium"
          >
            ▶ Exécuter
          </button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-[#64748b] mb-3">Registres</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {Object.entries(result.regs).map(([r, v]) => (
                  <div key={r} className={`text-center p-1.5 rounded text-xs font-mono ${v !== 0 ? "bg-[#f59e0b]/10 text-[#f59e0b]" : "bg-white/3 text-[#64748b]"}`}>
                    <div className="text-[10px] text-[#64748b]">{r}</div>
                    <div>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-xl p-4">
              <p className="text-xs text-[#64748b] mb-3">Trace d&apos;exécution</p>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {result.log.map((l, i) => (
                  <div key={i} className="text-xs font-mono text-[#e2e8f0] leading-5">
                    <span className="text-[#2a2d3a] mr-2">{String(i + 1).padStart(2, "0")}</span>
                    {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
