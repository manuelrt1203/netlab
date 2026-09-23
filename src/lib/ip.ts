/* Utilitaires IPv4 / IPv6 partagés (routage, VLSM, IPv6) */

/** "192.168.1.10" → entier non signé 32 bits, ou null si invalide */
export function ipToInt(ip: string): number | null {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const v = parseInt(p, 10);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

export function intToIp(n: number): string {
  return [24, 16, 8, 0].map((s) => (n >>> s) & 255).join(".");
}

export function maskInt(prefix: number): number {
  return prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
}

export const maskToString = (prefix: number) => intToIp(maskInt(prefix));

/** "10.0.0.0/8" → { net, prefix } (l'adresse est ramenée à son réseau), ou null */
export function parseCidr(s: string): { net: number; prefix: number; raw: number } | null {
  const [ip, p] = s.trim().split("/");
  const raw = ipToInt(ip ?? "");
  const prefix = p === undefined ? 32 : Number(p);
  if (raw === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  return { net: (raw & maskInt(prefix)) >>> 0, prefix, raw };
}

export function inNetwork(ip: number, net: number, prefix: number): boolean {
  return ((ip & maskInt(prefix)) >>> 0) === net;
}

export const toBin32 = (n: number) => (n >>> 0).toString(2).padStart(32, "0");

/* ─── IPv6 ─────────────────────────────────────────────────────────── */

/** Développe une adresse IPv6 en 8 groupes de 16 bits, ou null si invalide */
export function ipv6Groups(addr: string): number[] | null {
  const s = addr.trim().toLowerCase().split("/")[0];
  if (!/^[0-9a-f:]+$/.test(s) || (s.match(/::/g) ?? []).length > 1) return null;
  const [head, tail] = s.includes("::") ? s.split("::") : [s, null];
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  if ([...h, ...t].some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  const manquants = 8 - h.length - t.length;
  if (tail === null ? h.length !== 8 : manquants < 1) return null;
  const zeros = tail === null ? [] : Array(manquants).fill("0");
  return [...h, ...zeros, ...t].map((g) => parseInt(g, 16));
}

export const ipv6Full = (g: number[]) => g.map((x) => x.toString(16).padStart(4, "0")).join(":");

/** Forme compressée RFC 5952 : zéros de tête supprimés, plus longue suite (≥ 2) de groupes nuls remplacée par :: */
export function ipv6Compress(g: number[]): string {
  let best = -1, bestLen = 0;
  for (let i = 0; i < 8; ) {
    if (g[i] !== 0) { i++; continue; }
    let j = i;
    while (j < 8 && g[j] === 0) j++;
    if (j - i > bestLen) { best = i; bestLen = j - i; }
    i = j;
  }
  const hex = g.map((x) => x.toString(16));
  if (bestLen < 2) return hex.join(":");
  return `${hex.slice(0, best).join(":")}::${hex.slice(best + bestLen).join(":")}`;
}
