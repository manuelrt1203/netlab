import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const host = searchParams.get("host") || "";
  const action = searchParams.get("action") || "ping";

  if (!host) return NextResponse.json({ error: "Host requis" }, { status: 400 });

  // Validate host to prevent command injection
  if (!/^[a-zA-Z0-9.\-_:]+$/.test(host)) {
    return NextResponse.json({ error: "Hôte invalide" }, { status: 400 });
  }

  try {
    if (action === "ping") {
      const start = Date.now();
      const { stdout } = await execAsync(`ping -c 4 -W 2 ${host}`, { timeout: 15000 });
      const elapsed = Date.now() - start;
      return NextResponse.json({ output: stdout, elapsed });
    }
    if (action === "traceroute") {
      const { stdout } = await execAsync(`traceroute -m 20 -w 2 ${host}`, { timeout: 30000 });
      return NextResponse.json({ output: stdout });
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: unknown) {
    const err = e as { stdout?: string; message?: string };
    return NextResponse.json({ output: err.stdout || err.message || "Erreur", error: true });
  }
}
