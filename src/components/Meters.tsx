"use client";
export function Waveform({ data }: { data: Float32Array }) {
  const w = 220, h = 44, mid = h / 2;
  const pts = Array.from(data).map((v, i) => `${i === 0 ? "M" : "L"}${((i / Math.max(1, data.length - 1)) * w).toFixed(1)},${(mid + v * h * 2.2).toFixed(1)}`).join(" ");
  return <svg width={w} height={h} className="meter"><path d={pts} fill="none" stroke="#7CFF9A" strokeWidth="1.2" /></svg>;
}
export function Spectrum({ data }: { data: Float32Array }) {
  const w = 220, h = 44, n = data.length;
  return <svg width={w} height={h} className="meter">{Array.from(data).map((v, i) => { const bw = w / n, bh = Math.max(1, v * h); return <rect key={i} x={i * bw} y={h - bh} width={Math.max(1, bw - 0.4)} height={bh} fill="#C8A24A" />; })}</svg>;
}
