"use client";
import { useState } from "react";

/* ── César ─────────────────────────────────────────────────────────── */
function caesar(text: string, shift: number, decode = false): string {
  const s = decode ? (26 - shift % 26) % 26 : shift % 26;
  return text.split("").map(c => {
    if (/[a-z]/.test(c)) return String.fromCharCode((c.charCodeAt(0)-97+s)%26+97);
    if (/[A-Z]/.test(c)) return String.fromCharCode((c.charCodeAt(0)-65+s)%26+65);
    return c;
  }).join("");
}

/* ── Vigenère ──────────────────────────────────────────────────────── */
function vigenere(text: string, key: string, decode = false): string {
  const k = key.toLowerCase().replace(/[^a-z]/g,"");
  if (!k) return text;
  let ki = 0;
  return text.split("").map(c => {
    const isUpper = /[A-Z]/.test(c);
    const isLower = /[a-z]/.test(c);
    if (!isUpper && !isLower) return c;
    const base = isUpper ? 65 : 97;
    const shift = k.charCodeAt(ki % k.length) - 97;
    ki++;
    const s = decode ? (26 - shift) % 26 : shift;
    return String.fromCharCode((c.charCodeAt(0) - base + s) % 26 + base);
  }).join("");
}

/* ── XOR ──────────────────────────────────────────────────────────── */
function xorCipher(text: string, key: string): string {
  if (!key) return text;
  const keyBytes = key.split("").map(c=>c.charCodeAt(0));
  return text.split("").map((c,i) =>
    String.fromCharCode(c.charCodeAt(0) ^ keyBytes[i % keyBytes.length])
  ).join("");
}

/* ── Analyse fréquentielle ─────────────────────────────────────────── */
function freqAnalysis(text: string) {
  const freq: Record<string,number> = {};
  let total = 0;
  for (const c of text.toLowerCase()) {
    if (/[a-z]/.test(c)) { freq[c] = (freq[c]||0)+1; total++; }
  }
  return Object.entries(freq)
    .map(([c,n]) => ({c, n, pct: total ? (n/total*100) : 0}))
    .sort((a,b)=>b.n-a.n);
}

const FR_FREQ: Record<string,number> = {e:17.4,a:8.1,s:7.9,i:7.6,t:7.2,n:7.1,r:6.6,u:6.3,l:5.5,o:5.3};

type Tab = "cesar"|"vigenere"|"xor"|"freq";

export default function CryptoPage() {
  const [tab, setTab] = useState<Tab>("cesar");
  const [text, setText] = useState("Bonjour le monde");
  const [shift, setShift] = useState(3);
  const [vigKey, setVigKey] = useState("cle");
  const [xorKey, setXorKey] = useState("K");
  const [decode, setDecode] = useState(false);

  const resultCesar = caesar(text, shift, decode);
  const resultVig   = vigenere(text, vigKey, decode);
  const resultXor   = xorCipher(text, xorKey);
  const freq        = freqAnalysis(text);

  const tabs: {id:Tab;label:string;color:string}[] = [
    {id:"cesar",    label:"Chiffre de César",  color:"#00d4ff"},
    {id:"vigenere", label:"Vigenère",          color:"#22c55e"},
    {id:"xor",      label:"XOR",               color:"#f59e0b"},
    {id:"freq",     label:"Analyse fréq.",     color:"#ec4899"},
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <h1 className="text-3xl font-bold text-[#ec4899] mb-2">🔐 Cryptographie classique</h1>
      <p className="text-[#64748b] text-sm mb-6">Chiffrement symétrique de base — fondements de la cryptologie.</p>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap mb-5">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="px-3 py-1.5 text-sm rounded-lg border transition-all"
            style={tab===t.id
              ? {color:t.color,borderColor:t.color,background:`${t.color}18`}
              : {borderColor:"#2a2d3a",color:"#64748b"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Input commun */}
      {tab!=="freq" && (
        <div className="glass rounded-xl p-4 mb-4">
          <label className="text-xs text-[#64748b] block mb-1">Texte</label>
          <textarea value={text} onChange={e=>setText(e.target.value)} rows={3}
            className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono outline-none focus:border-[#ec4899] resize-none" />
          <div className="flex gap-3 mt-3">
            <button onClick={()=>setDecode(false)}
              className={`px-3 py-1 text-xs rounded border transition-all ${!decode?"bg-[#00d4ff]/10 text-[#00d4ff] border-[#00d4ff]/30":"border-[#2a2d3a] text-[#64748b]"}`}>
              Chiffrer
            </button>
            <button onClick={()=>setDecode(true)}
              className={`px-3 py-1 text-xs rounded border transition-all ${decode?"bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30":"border-[#2a2d3a] text-[#64748b]"}`}>
              Déchiffrer
            </button>
          </div>
        </div>
      )}

      {/* César */}
      {tab==="cesar" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <label className="text-xs text-[#64748b] mb-1 block">Décalage : <span className="text-[#00d4ff] font-mono">{shift}</span></label>
            <input type="range" min={1} max={25} value={shift} onChange={e=>setShift(+e.target.value)} className="w-full accent-[#00d4ff]" />
            <div className="flex gap-px mt-2">
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map(c=>(
                <span key={c} className="flex-1 text-center text-[9px] font-mono text-[#64748b]">{c}</span>
              ))}
            </div>
            <div className="flex gap-px">
              {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((_,i)=>(
                <span key={i} className="flex-1 text-center text-[9px] font-mono text-[#00d4ff]">
                  {String.fromCharCode(65+(i+shift)%26)}
                </span>
              ))}
            </div>
          </div>
          <Result text={resultCesar} color="#00d4ff" />
          <div className="glass rounded-xl p-4 text-xs text-[#64748b] leading-5">
            <strong className="text-[#e2e8f0]">Principe :</strong> chaque lettre est décalée de {shift} position(s) dans l&apos;alphabet.
            Clef unique = le décalage. Cassé facilement par analyse fréquentielle (26 possibilités).
          </div>
        </div>
      )}

      {/* Vigenère */}
      {tab==="vigenere" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <label className="text-xs text-[#64748b] mb-1 block">Clé</label>
            <input value={vigKey} onChange={e=>setVigKey(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono outline-none focus:border-[#22c55e]" />
            <p className="text-[10px] text-[#64748b] mt-1">Chaque lettre de la clé applique un décalage César différent au texte.</p>
          </div>
          <Result text={resultVig} color="#22c55e" />
          <div className="glass rounded-xl p-4 text-xs text-[#64748b] leading-5">
            <strong className="text-[#e2e8f0]">Principe :</strong> la clé <code className="text-[#22c55e]">{vigKey}</code> est répétée.
            Chaque lettre de la clé donne un décalage : {vigKey.toLowerCase().split("").map(c=>`${c}=${c.charCodeAt(0)-97}`).join(", ")}.
            Résiste mieux à l&apos;analyse fréquentielle que César.
          </div>
        </div>
      )}

      {/* XOR */}
      {tab==="xor" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <label className="text-xs text-[#64748b] mb-1 block">Clé (caractères)</label>
            <input value={xorKey} onChange={e=>setXorKey(e.target.value)}
              className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono outline-none focus:border-[#f59e0b]" />
          </div>
          <Result text={resultXor} color="#f59e0b" />
          <div className="glass rounded-xl p-4 text-sm">
            <p className="text-xs text-[#64748b] mb-2">Table XOR bit à bit :</p>
            {text.slice(0,6).split("").map((c,i)=>{
              const k = xorKey[i%xorKey.length]||"";
              if(!k) return null;
              const r = String.fromCharCode(c.charCodeAt(0)^k.charCodeAt(0));
              return (
                <div key={i} className="flex gap-3 text-xs font-mono text-[#94a3b8] mb-1">
                  <span className="text-[#f59e0b]">{c.charCodeAt(0).toString(2).padStart(8,"0")}</span>
                  <span className="text-[#64748b]">XOR</span>
                  <span className="text-[#7c3aed]">{k.charCodeAt(0).toString(2).padStart(8,"0")}</span>
                  <span className="text-[#64748b]">=</span>
                  <span className="text-[#22c55e]">{r.charCodeAt(0).toString(2).padStart(8,"0")}</span>
                  <span className="text-[#64748b]">({r})</span>
                </div>
              );
            })}
          </div>
          <div className="glass rounded-xl p-4 text-xs text-[#64748b] leading-5">
            <strong className="text-[#e2e8f0]">Principe :</strong> XOR est son propre inverse — appliquer deux fois la même clé restitue le texte original.
            Base de nombreux chiffrements modernes (AES, ChaCha20).
          </div>
        </div>
      )}

      {/* Analyse fréquentielle */}
      {tab==="freq" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <label className="text-xs text-[#64748b] mb-1 block">Texte chiffré à analyser</label>
            <textarea value={text} onChange={e=>setText(e.target.value)} rows={4}
              className="w-full bg-[#0f1117] border border-[#2a2d3a] px-3 py-2 rounded-lg text-sm font-mono outline-none focus:border-[#ec4899] resize-none" />
          </div>
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-[#64748b] mb-3">Fréquences dans votre texte vs fréquences typiques du français</p>
            <div className="space-y-1.5">
              {freq.slice(0,10).map(({c,pct})=>(
                <div key={c} className="flex items-center gap-2">
                  <span className="font-mono text-[#ec4899] w-4 text-sm">{c.toUpperCase()}</span>
                  <div className="flex-1 h-4 bg-[#0f1117] rounded overflow-hidden flex">
                    <div className="h-full rounded transition-all" style={{width:`${Math.min(pct*3,100)}%`,background:"#ec4899"}} />
                  </div>
                  <span className="text-xs font-mono text-[#e2e8f0] w-10 text-right">{pct.toFixed(1)}%</span>
                  {FR_FREQ[c] && (
                    <span className="text-xs font-mono text-[#64748b] w-10 text-right">FR:{FR_FREQ[c]}%</span>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#64748b] mt-3 leading-4">
              En français : E (17%) est la plus fréquente. Si E chiffré = X, alors décalage César ≈ X−E.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Result({ text, color }: { text:string; color:string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-xs text-[#64748b] mb-2">Résultat</p>
      <p className="font-mono text-sm leading-6 break-all" style={{color}}>{text || "—"}</p>
      <button onClick={()=>navigator.clipboard.writeText(text)}
        className="mt-2 text-[10px] text-[#64748b] hover:text-white transition-colors">
        Copier
      </button>
    </div>
  );
}
