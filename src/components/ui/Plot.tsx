"use client";
import { useEffect, useRef } from "react";

export interface Series {
  data: [number, number][];
  color: string;
  label?: string;
  dashed?: boolean;
  width?: number;
  /** Trace des bâtons verticaux (spectre) au lieu d'une ligne */
  stem?: boolean;
}

export interface Marker { x: number; color: string; label?: string }
export interface HLine { y: number; color: string; label?: string }

interface PlotProps {
  series: Series[];
  height?: number;
  xLog?: boolean;
  xMin?: number; xMax?: number;
  yMin?: number; yMax?: number;
  xFmt?: (v: number) => string;
  yFmt?: (v: number) => string;
  xLabel?: string;
  yLabel?: string;
  markers?: Marker[];
  hLines?: HLine[];
}

/** Graduations « rondes » (1, 2, 5 × 10ⁿ) couvrant [a, b] */
function niceTicks(a: number, b: number, target = 6): number[] {
  const span = b - a;
  if (!(span > 0)) return [a];
  const raw = span / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const out: number[] = [];
  for (let v = Math.ceil(a / step) * step; v <= b + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
}

const defaultFmt = (v: number) => parseFloat(v.toPrecision(3)).toString();

export default function Plot({
  series, height = 260, xLog, xMin, xMax, yMin, yMax,
  xFmt = defaultFmt, yFmt = defaultFmt, xLabel, yLabel, markers = [], hLines = [],
}: PlotProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const draw = () => {
      const W = wrap.clientWidth, H = height;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      const ctx = canvas.getContext("2d"); if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#0f1117"; ctx.fillRect(0, 0, W, H);

      const all = series.flatMap((s) => s.data).filter(([x, y]) => isFinite(x) && isFinite(y));
      if (!all.length) return;
      const tx = (x: number) => (xLog ? Math.log10(x) : x);
      const x0 = xMin ?? Math.min(...all.map((p) => p[0]));
      let x1 = xMax ?? Math.max(...all.map((p) => p[0]));
      let y0 = yMin ?? Math.min(...all.map((p) => p[1]), ...hLines.map((h) => h.y));
      let y1 = yMax ?? Math.max(...all.map((p) => p[1]), ...hLines.map((h) => h.y));
      if (series.some((s) => s.stem)) { y0 = Math.min(y0, 0); y1 = Math.max(y1, 0); }
      if (y1 - y0 < 1e-12) { y0 -= 1; y1 += 1; }
      const pad = (y1 - y0) * 0.08;
      if (yMin === undefined) y0 -= pad;
      if (yMax === undefined) y1 += pad;
      if (x1 <= x0) x1 = x0 + 1;
      const lx0 = tx(x0), lx1 = tx(x1);

      const padL = 48, padR = 12, padT = 12, padB = xLabel ? 34 : 24;
      const X = (x: number) => padL + ((tx(x) - lx0) / (lx1 - lx0)) * (W - padL - padR);
      const Y = (y: number) => padT + (1 - (y - y0) / (y1 - y0)) * (H - padT - padB);

      // Grille + graduations
      ctx.font = "10px ui-monospace, monospace"; ctx.lineWidth = 1;
      const xt = xLog
        ? Array.from({ length: Math.floor(lx1) - Math.ceil(lx0) + 1 }, (_, i) => Math.pow(10, Math.ceil(lx0) + i))
        : niceTicks(x0, x1, Math.max(3, Math.round(W / 90)));
      if (xLog) {
        ctx.strokeStyle = "#1c1f2a";
        for (let d = Math.floor(lx0); d <= lx1; d++)
          for (let m = 2; m < 10; m++) {
            const v = m * Math.pow(10, d);
            if (v < x0 || v > x1) continue;
            ctx.beginPath(); ctx.moveTo(X(v), padT); ctx.lineTo(X(v), H - padB); ctx.stroke();
          }
      }
      ctx.textAlign = "center";
      for (const v of xt) {
        ctx.strokeStyle = "#2a2d3a";
        ctx.beginPath(); ctx.moveTo(X(v), padT); ctx.lineTo(X(v), H - padB); ctx.stroke();
        ctx.fillStyle = "#64748b"; ctx.fillText(xFmt(v), X(v), H - padB + 13);
      }
      ctx.textAlign = "right";
      for (const v of niceTicks(y0, y1, 5)) {
        ctx.strokeStyle = v === 0 ? "#475569" : "#2a2d3a";
        ctx.beginPath(); ctx.moveTo(padL, Y(v)); ctx.lineTo(W - padR, Y(v)); ctx.stroke();
        ctx.fillStyle = "#64748b"; ctx.fillText(yFmt(v), padL - 5, Y(v) + 3);
      }
      if (xLabel) { ctx.textAlign = "center"; ctx.fillText(xLabel, (padL + W - padR) / 2, H - 4); }
      if (yLabel) { ctx.textAlign = "left"; ctx.fillStyle = "#94a3b8"; ctx.fillText(yLabel, padL + 4, padT + 10); }

      ctx.save();
      ctx.beginPath(); ctx.rect(padL, padT, W - padL - padR, H - padT - padB); ctx.clip();

      for (const h of hLines) {
        ctx.strokeStyle = h.color; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(padL, Y(h.y)); ctx.lineTo(W - padR, Y(h.y)); ctx.stroke();
        ctx.setLineDash([]);
        if (h.label) { ctx.fillStyle = h.color; ctx.textAlign = "right"; ctx.fillText(h.label, W - padR - 4, Y(h.y) - 4); }
      }
      for (const m of markers) {
        ctx.strokeStyle = m.color; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(X(m.x), padT); ctx.lineTo(X(m.x), H - padB); ctx.stroke();
        ctx.setLineDash([]);
        if (m.label) { ctx.fillStyle = m.color; ctx.textAlign = "left"; ctx.fillText(m.label, X(m.x) + 4, padT + 22); }
      }

      for (const s of series) {
        ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.width ?? 2;
        ctx.setLineDash(s.dashed ? [6, 4] : []);
        if (s.stem) {
          for (const [x, y] of s.data) {
            ctx.beginPath(); ctx.moveTo(X(x), Y(0)); ctx.lineTo(X(x), Y(y)); ctx.stroke();
            ctx.beginPath(); ctx.arc(X(x), Y(y), 3, 0, Math.PI * 2); ctx.fill();
          }
          continue;
        }
        ctx.beginPath();
        let pen = false;
        for (const [x, y] of s.data) {
          if (!isFinite(y) || !isFinite(x)) { pen = false; continue; }
          if (pen) ctx.lineTo(X(x), Y(y)); else { ctx.moveTo(X(x), Y(y)); pen = true; }
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();

      // Légende
      const labelled = series.filter((s) => s.label);
      ctx.textAlign = "left";
      const widths = labelled.map((s) => ctx.measureText(s.label!).width + 24);
      let lx = Math.max(padL + 8, W - padR - 6 - widths.reduce((a, b) => a + b, 0));
      labelled.forEach((s, i) => {
        if (lx + widths[i] > W - padR) return;
        ctx.fillStyle = "rgba(15,17,23,0.85)"; ctx.fillRect(lx - 3, padT + 1, widths[i], 14);
        ctx.fillStyle = s.color; ctx.fillRect(lx, padT + 7, 10, 3);
        ctx.fillStyle = "#94a3b8"; ctx.fillText(s.label!, lx + 14, padT + 11);
        lx += widths[i];
      });
    };

    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [series, height, xLog, xMin, xMax, yMin, yMax, xFmt, yFmt, xLabel, yLabel, markers, hLines]);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} className="rounded-lg block" />
    </div>
  );
}
