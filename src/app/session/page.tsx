"use client";
import { CrtScreen } from "@/components/CrtScreen";
import { Spectrum, Waveform } from "@/components/Meters";
import { formatMs } from "@/components/Chrome";
import { useStore } from "@/lib/store";
import { useState } from "react";
export default function SessionPage() {
  const s = useStore(); const [note, setNote] = useState(s.session?.notes || "");
  return (<main>
    <h1>SESSION {s.session ? "ACTIVE" : "STANDBY"}</h1>
    <p className="meta">Elapsed {formatMs(s.elapsedMs)}</p>
    <CrtScreen active={s.status==="SCANNING"} score={s.anomalyScore} />
    <div className="grid3"><div className="panel"><h3>WAVE</h3><Waveform data={s.waveform} /></div><div className="panel"><h3>FFT</h3><Spectrum data={s.spectrum} /></div></div>
    {s.status==="READY" ? <button className="bigbtn" onClick={()=>void s.startSession()}>START SESSION</button> : <div className="row"><button className="ghost" onClick={s.pauseSession}>{s.status==="PAUSED"?"RESUME":"PAUSE"}</button><button className="ghost" onClick={()=>void s.endSession()}>END SESSION</button></div>}
    <textarea rows={4} value={note} onChange={(e)=>setNote(e.target.value)} /><button className="ghost" onClick={()=>void s.addUserNote(note)}>SAVE NOTES</button>
  </main>);
}
