import { NextRequest, NextResponse } from "next/server";

/* api.macvendors.com n'envoie pas d'en-têtes CORS et limite à ~1 requête/s :
   on passe donc par le serveur, qui renvoie une erreur claire en cas de 429. */

export async function GET(req: NextRequest) {
  const mac = (req.nextUrl.searchParams.get("mac") || "").trim();
  const hex = mac.replace(/[^0-9a-fA-F]/g, "");
  if (hex.length < 6) {
    return NextResponse.json({ error: "Il faut au moins les 6 premiers chiffres hexadécimaux (l'OUI)" }, { status: 400 });
  }

  const res = await fetch(`https://api.macvendors.com/${hex.slice(0, 12)}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!res) return NextResponse.json({ error: "Service injoignable" }, { status: 502 });
  if (res.status === 404) return NextResponse.json({ vendor: null });
  if (res.status === 429) {
    return NextResponse.json({ error: "Trop de requêtes, réessaie dans une seconde" }, { status: 429 });
  }
  if (!res.ok) return NextResponse.json({ error: "Erreur du service" }, { status: 502 });

  return NextResponse.json({ vendor: (await res.text()).trim() });
}
