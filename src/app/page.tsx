"use client";
import Link from "next/link";
import { CrtScreen } from "@/components/CrtScreen";
import { Spectrum, Waveform } from "@/components/Meters";
import { FREQUENCY_BANDS } from "@/lib/types";
import { useStore } from "@/lib/store";
export default function Dashboard() {
  const s = useStore();
  const band = FREQUENCY_BANDS.find((b) => b.id === s.band)!;
  return (
    <main>
      <CrtScreen active={s.status === "SCANNING"} score={s.anomalyScore} />
      <div className="grid3">
        <div className="panel"><h3>AUDIO</h3><Waveform data={s.waveform} /><div className="statline"><span>RMS</span><span>{s.rms.toFixed(3)}</span></div></div>
        <div className="panel"><h3>VISUAL</h3><Spectrum data={s.spectrum} /><div className="statline"><span>SPEECH-LIKE</span><span>{Math.round(s.speechLike * 100)}%</span></div></div>
        <div className="panel"><h3>SIGNAL</h3><div style={{ fontSize: 28, color: "#7cff9a" }}>{Math.round(s.anomalyScore * 100)}%</div></div>
      </div>
      <div className="statline"><span>FREQUENCY</span><span>{band.label}</span></div>
      {s.status === "READY" ? (
        <button className="bigbtn" onClick={() => void s.startSession()}>START SESSION</button>
      ) : (
        <div className="row">
          <button className="bigbtn" onClick={s.pauseSession}>{s.status === "PAUSED" ? "RESUME" : "PAUSE"}</button>
          <button className="bigbtn danger" onClick={() => void s.endSession()}>END SESSION</button>
        </div>
      )}
      <div className="row">
        {!s.micOn ? <button className="ghost" onClick={() => void s.enableMic()}>ENABLE MICROPHONE</button> : <button className="ghost on" onClick={s.disableMic}>MIC ARMED</button>}
        {FREQUENCY_BANDS.map((b) => <button key={b.id} className={`ghost ${s.band === b.id ? "on" : ""}`} onClick={() => s.setBand(b.id)}>{b.label}</button>)}
      </div>
      <div className="grid3" style={{ marginTop: 16 }}>
        <Link href="/evidence" className="panel"><h3>AUDIO EVENTS</h3><div style={{ fontSize: 24 }}>{s.audioEvents.length}</div></Link>
        <Link href="/evidence" className="panel"><h3>IMAGE EVENTS</h3><div style={{ fontSize: 24 }}>{s.visualEvents.length}</div></Link>
        <Link href="/sessions" className="panel"><h3>SESSIONS</h3><div style={{ fontSize: 24 }}>{s.sessions.length}</div></Link>
      </div>
    </main>
  );
}
