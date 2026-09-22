"use client";
import { useEffect, useRef } from "react";
export function CrtScreen({ active, score }: { active: boolean; score: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    let raf = 0;
    let roll = 0;
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      const img = ctx.createImageData(w, h);
      const data = img.data;
      const flicker = 0.85 + Math.random() * 0.18;
      roll = (roll + 0.6 + score * 2) % h;
      for (let y = 0; y < h; y++) {
        const scan = y % 3 === 0 ? 0.72 : 1;
        const band = Math.abs(((y + roll) % 48) - 24) < 2 ? 1.35 : 1;
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          let v = Math.random() * 255 * flicker * scan * band;
          const cx = x / w - 0.5, cy = y / h - 0.5;
          v *= Math.max(0.35, 1 - (cx * cx + cy * cy) * 1.15);
          if (score > 0.5 && Math.abs(cx) < 0.12 && Math.abs(cy) < 0.16 && Math.random() > 0.4) v = Math.min(255, v + 40 + score * 50);
          data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active, score]);
  return (
    <div className="crt-bezel"><div className="crt-glass">
      <canvas ref={ref} width={480} height={320} className="crt-canvas" />
      <div className="crt-overlay" />
      <div className="crt-label">{active ? "SIGNAL LIVE" : "STANDBY STATIC"}</div>
    </div></div>
  );
}
