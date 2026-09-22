"use client";
import { useStore } from "@/lib/store";
export default function SettingsPage() {
  const s = useStore();
  return (<main><h1>SETTINGS / PRIVACY</h1><p className="disclaimer">Mic access is explicit. Nothing is uploaded. Evidence stays in this browser.</p><div className="panel"><div className="statline"><span>MICROPHONE</span><span>{s.micOn?"ARMED":"OFF"}</span></div></div>
    <label className="panel">AUDIO {s.audioThreshold.toFixed(2)}<input type="range" min={0.1} max={0.9} step={0.01} value={s.audioThreshold} onChange={(e)=>s.setThresholds(+e.target.value, s.visualThreshold, s.correlationWindowMs)} /></label>
    <label className="panel">VISUAL {s.visualThreshold.toFixed(2)}<input type="range" min={0.1} max={0.9} step={0.01} value={s.visualThreshold} onChange={(e)=>s.setThresholds(s.audioThreshold, +e.target.value, s.correlationWindowMs)} /></label>
    <div className="row">{!s.micOn ? <button className="ghost" onClick={()=>void s.enableMic()}>ENABLE MICROPHONE</button> : <button className="ghost on" onClick={s.disableMic}>DISABLE MICROPHONE</button>}<button className="ghost" onClick={()=>void s.deleteAll()}>DELETE ALL EVIDENCE</button></div></main>);
}
