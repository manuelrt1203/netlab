import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q") || "";

  const target = query.trim() || ""; // empty = my own IP
  const url = target
    ? `http://ip-api.com/json/${encodeURIComponent(target)}?fields=66846719`
    : `http://ip-api.com/json/?fields=66846719`;

  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    return NextResponse.json({ error: "Erreur réseau" }, { status: 502 });
  }
  const data = await res.json();
  return NextResponse.json(data);
}
