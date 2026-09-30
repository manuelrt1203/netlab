import { NextRequest, NextResponse } from "next/server";
import net from "net";
import dns from "dns/promises";

/* Trois sources gratuites et sans clé, interrogées en parallèle :
   - ipwho.is      : géolocalisation, ASN, FAI (HTTPS, contrairement à ip-api.com gratuit)
   - IPLogs        : détection VPN / proxy / Tor / datacenter, avec les signaux qui l'expliquent
   - IPGuardian    : présence de l'IP dans 140+ listes noires publiques
   Si IPLogs ou IPGuardian tombe, on renvoie quand même la géolocalisation. */

const TIMEOUT = 8000;

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

/** IP du visiteur : sans ça, « Ma IP » renverrait l'IP du serveur Vercel */
function clientIp(req: NextRequest): string | null {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || req.headers.get("x-real-ip");
  // En local, l'IP est ::1 / 127.0.0.1 → on laisse ipwho.is détecter l'IP publique
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("::ffff:127.")) return null;
  return ip;
}

interface Signal { type: string; weight: number; matched: boolean; detail: string }
interface Source { filename: string; category: string; maintainer?: string; listed_since?: string }

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") || "").trim();

  // 1. Cible : IP saisie, domaine à résoudre, ou IP du visiteur
  let ip = q;
  let resolvedFrom: string | null = null;
  if (q && !net.isIP(q)) {
    try {
      ip = (await dns.lookup(q)).address;
      resolvedFrom = q;
    } catch {
      return NextResponse.json({ error: `Impossible de résoudre « ${q} »` }, { status: 404 });
    }
  }
  if (!q) ip = clientIp(req) ?? "";

  // 2. Géolocalisation (obligatoire)
  let geo;
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT),
    });
    geo = await res.json();
  } catch {
    return NextResponse.json({ error: "Service de géolocalisation injoignable" }, { status: 502 });
  }
  if (!geo.success) {
    const msg = geo.message === "Reserved range"
      ? "Adresse privée ou réservée (RFC 1918, loopback…) : pas de géolocalisation possible"
      : geo.message || "IP introuvable";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  ip = geo.ip;

  // 3. Anonymisation + réputation (facultatives)
  const [privacyRes, repRes] = await Promise.allSettled([
    postJson("https://iplogs.com/v1/check", { ip }),
    postJson("https://ipguardian.net/api/check", { ip }),
  ]);

  let privacy = null;
  if (privacyRes.status === "fulfilled") {
    const p = privacyRes.value;
    const matched: Signal[] = (p.signals ?? []).filter((s: Signal) => s.matched);
    privacy = {
      verdict: p.verdict as string,
      confidence: p.confidence as number,
      isVpn: !!p.is_vpn,
      isProxy: !!p.is_proxy,
      isTor: matched.some((s) => s.type.includes("tor")),
      isDatacenter: p.ip_info?.type === "datacenter",
      provider: (p.ip_info?.vpn_provider as string) || null,
      prefix: (p.ip_info?.prefix as string) || null,
      abuseContact: (p.ip_info?.abuse_contact as string) || null,
      signals: matched.map((s) => ({ detail: s.detail, weight: s.weight })),
    };
  }

  let reputation = null;
  if (repRes.status === "fulfilled" && repRes.value.success) {
    const r = repRes.value.results;
    reputation = {
      listed: (r.sources ?? []).length as number,
      networkType: (r.network?.type as string) || null,
      sources: (r.sources ?? []).map((s: Source) => ({
        list: s.filename.replace(/\.(ip|net)set$/, ""),
        category: s.category,
        maintainer: s.maintainer ?? null,
        since: s.listed_since ?? null,
      })),
    };
  }

  return NextResponse.json({
    query: ip,
    resolvedFrom,
    type: geo.type,
    country: geo.country,
    countryCode: geo.country_code,
    flag: geo.flag?.emoji ?? "",
    region: geo.region,
    city: geo.city,
    zip: geo.postal,
    lat: geo.latitude,
    lon: geo.longitude,
    timezone: geo.timezone?.id ? `${geo.timezone.id} (UTC${geo.timezone.utc})` : "",
    isp: geo.connection?.isp ?? "",
    org: geo.connection?.org ?? "",
    as: geo.connection?.asn ? `AS${geo.connection.asn}` : "",
    domain: geo.connection?.domain ?? "",
    privacy,
    reputation,
  });
}
