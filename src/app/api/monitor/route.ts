import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import net from "net";
import dns from "dns/promises";

const execAsync = promisify(exec);

/* Les fonctions serverless (Vercel) n'ont ni binaires ping/traceroute ni accès
   aux sockets ICMP bruts. On mesure donc la latence via une connexion TCP
   (443 puis 80 en repli) — ça fonctionne partout, y compris en production. */
async function tcpConnectTime(host: string, port: number, timeoutMs = 3000): Promise<number | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let done = false;
    const finish = (result: number | null) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(Date.now() - start));
    socket.once("timeout", () => finish(null));
    socket.once("error", () => finish(null));
    socket.connect(port, host);
  });
}

async function tcpPing(host: string) {
  let ip = host;
  try {
    const resolved = await dns.lookup(host);
    ip = resolved.address;
  } catch {
    return { output: `Impossible de résoudre l'hôte "${host}".`, error: true };
  }

  const attempts = 4;
  const times: (number | null)[] = [];
  for (let i = 0; i < attempts; i++) {
    let t = await tcpConnectTime(ip, 443);
    if (t === null && i === 0) t = await tcpConnectTime(ip, 80);
    times.push(t);
  }

  const ok = times.filter((t): t is number => t !== null);
  const loss = Math.round(((attempts - ok.length) / attempts) * 100);
  const lines = [
    `PING TCP ${host} (${ip}) — via connexion TCP (443/80) : l'ICMP brut n'est pas disponible sur cet hébergement.`,
    ...times.map((t, i) => (t !== null ? `Connexion ${i + 1} : temps=${t} ms` : `Connexion ${i + 1} : échec (timeout/fermé)`)),
    "",
    `--- statistiques ${host} ---`,
    `${attempts} tentatives, ${ok.length} réussies, ${loss}% de pertes`,
  ];
  if (ok.length) {
    const min = Math.min(...ok), max = Math.max(...ok), avg = Math.round(ok.reduce((a, b) => a + b, 0) / ok.length);
    lines.push(`rtt min/avg/max = ${min}/${avg}/${max} ms`);
  }
  return { output: lines.join("\n") };
}

async function runPing(host: string) {
  try {
    const { stdout } = await execAsync(`ping -c 4 -W 2 ${host}`, { timeout: 15000 });
    return { output: stdout };
  } catch (e: unknown) {
    const err = e as { stdout?: string };
    if (err.stdout && err.stdout.includes("bytes from")) return { output: err.stdout };
    // ping absent (ENOENT) ou sans privilège ICMP (cas serverless) → repli TCP
    return tcpPing(host);
  }
}

async function runTraceroute(host: string) {
  try {
    const { stdout } = await execAsync(`traceroute -m 20 -w 2 ${host}`, { timeout: 20000 });
    return { output: stdout };
  } catch (e: unknown) {
    const err = e as { stdout?: string };
    if (err.stdout && err.stdout.trim()) return { output: err.stdout };
    return {
      output: `Traceroute indisponible sur cet hébergement : les fonctions serverless (Vercel) ne permettent pas l'envoi de paquets ICMP bruts nécessaires au traceroute.\nCette fonctionnalité fonctionne en local ("npm run dev") ou sur un serveur classique où l'outil traceroute est installé.`,
      error: true,
    };
  }
}

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
    if (action === "ping") return NextResponse.json(await runPing(host));
    if (action === "traceroute") return NextResponse.json(await runTraceroute(host));
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json({ output: err.message || "Erreur", error: true });
  }
}
