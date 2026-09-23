"use client";
import { useEffect, useRef, useState } from "react";
import { Spectrum } from "@/components/Meters";
import { useStore } from "@/lib/store";
import { formatMs } from "@/components/Chrome";
const PRESETS = [
  { id: "low", label: "LOW VOICE", min: 80, max: 300, mode: "none" as const },
  { id: "voice", label: "VOICE", min: 300, max: 3000, mode: "none" as const },
  { id: "ext", label: "EXTENDED VOICE", min: 200, max: 4000, mode: "none" as const },
  { id: "full", label: "FULL SPECTRUM", min: 20, max: 20000, mode: "none" as const },
  { id: "white", label: "WHITE NOISE", min: 20, max: 20000, mode: "white" as const },
  { id: "pink", label: "PINK NOISE", min: 20, max: 20000, mode: "pink" as const },
  { id: "radio", label: "AUDIO SWEEP", min: 20, max: 8000, mode: "sweep" as const },
];
export default function FrequencyLab() {
  const s = useStore();
  const [running, setRunning] = useState(false);
  const [min, setMin] = useState(20);
  const [max, setMax] = useState(8000);
  const [preset, setPreset] = useState("VOICE");
  const [started, setStarted] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [log, setLog] = useState<{ hz: number; mag: number }[]>([]);
  const timer = useRef(0);
  useEffect(() => {
    if (!running) return;
    timer.current = window.setInterval(() => {
      setElapsed(Date.now() - started);
      if (s.peakHz > 0) setLog((prev) => [{ hz: s.peakHz, mag: s.peakMag }, ...prev].slice(0, 40));
    }, 400);
    return () => clearInterval(timer.current);
  }, [running, started, s.peakHz, s.peakMag]);
  return (
    <main>
      <h1>FREQUENCY LAB</h1>
      <p className="disclaimer">This scans the microphone audio spectrum (~20 Hz–20 kHz). It cannot tune TV, FM, AM, or RF. White/pink/sweep play through the speaker as a known stimulus.</p>
      {!s.micOn && <button className="bigbtn" onClick={() => void s.enableMic()}>ARM MICROPHONE TO SCAN</button>}
      <div className="panel">
        <h3>LIVE FFT (SELECTED BAND)</h3>
        <Spectrum data={s.spectrum} />
        <div className="statline"><span>PEAK</span><span>{s.micOn ? `${Math.round(s.peakHz)} Hz` : "—"}</span></div>
        <div className="statline"><span>PEAK MAG</span><span>{s.peakMag.toFixed(2)}</span></div>
        <div className="statline"><span>BAND ENERGY</span><span>{s.bandEnergy.toFixed(2)}</span></div>
        <div className="statline"><span>SWEEP TONE</span><span>{s.sweepHz ? `${Math.round(s.sweepHz)} Hz` : "OFF"}</span></div>
      </div>
      <div className="row">
        {PRESETS.map((p) => (
          <button key={p.id} className={`ghost ${preset === p.label ? "on" : ""}`} onClick={() => {
            setPreset(p.label); setMin(p.min); setMax(p.max);
            s.setBand(p.max <= 500 ? "150-500" : p.max <= 3000 ? "300-3000" : p.max <= 4000 ? "200-4000" : "full");
            s.setNoiseMode(p.mode, p.min, p.max); s.setSweepRange(p.min, p.max);
          }}>{p.label}</button>
        ))}
      </div>
      <div className="grid3">
        <label className="panel">START HZ<input className="input" type="number" value={min} onChange={(e) => { setMin(+e.target.value); s.setSweepRange(+e.target.value, max); }} /></label>
        <label className="panel">END HZ<input className="input" type="number" value={max} onChange={(e) => { setMax(+e.target.value); s.setSweepRange(min, +e.target.value); }} /></label>
        <div className="panel"><div className="statline"><span>ELAPSED</span><span>{formatMs(elapsed)}</span></div></div>
      </div>
      <button className="bigbtn" onClick={() => {
        if (running) {
          setRunning(false); s.setNoiseMode("none");
          void s.logExperiment({ id: `exp_${Date.now()}`, sessionId: s.session?.id, startedAt: started, endedAt: Date.now(), startHz: min, endHz: max, preset, durationMs: Date.now() - started, anomalies: s.audioEvents.length, voiceLike: s.audioEvents.filter((a) => a.classification.includes("VOICE") || a.classification.includes("SPEECH")).length, signalStrength: s.anomalyScore });
        } else {
          if (!s.micOn) void s.enableMic();
          setStarted(Date.now()); setElapsed(0); setLog([]); setRunning(true);
          s.setNoiseMode(preset.includes("SWEEP") ? "sweep" : s.noiseMode, min, max);
        }
      }}>{running ? "STOP / LOG SCAN" : "START AUDIO SCAN"}</button>
      <h2>PEAK LOG</h2>
      {log.map((row, i) => <div key={i} className="statline"><span>{Math.round(row.hz)} Hz</span><span>{row.mag.toFixed(2)}</span></div>)}
      <h2>SAVED EXPERIMENTS</h2>
      {s.experiments.map((e) => <div key={e.id} className="panel" style={{ marginBottom: 8 }}><div className="statline"><span>{e.preset}</span><span>{formatMs(e.durationMs)}</span></div><div className="meta">{e.startHz}–{e.endHz} Hz · anomalies {e.anomalies}</div></div>)}
    </main>
  );
}
