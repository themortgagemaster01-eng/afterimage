"use client";
import { useEffect, useRef, useState } from "react";
import { Spectrum } from "@/components/Meters";
import { useStore } from "@/lib/store";
import { formatMs } from "@/components/Chrome";
const PRESETS = [{id:"voice",label:"VOICE",min:300,max:3000},{id:"full",label:"FULL SPECTRUM",min:20,max:20000},{id:"white",label:"WHITE NOISE",min:20,max:20000}];
export default function FrequencyLab() {
  const s = useStore(); const [running,setRunning]=useState(false); const [started,setStarted]=useState(0); const [elapsed,setElapsed]=useState(0);
  useEffect(()=>{ if(!running) return; const t=window.setInterval(()=>setElapsed(Date.now()-started),250); return ()=>clearInterval(t); },[running,started]);
  return (<main><h1>FREQUENCY LAB</h1><p className="disclaimer">Experimental bands — not spirit frequencies.</p><div className="panel"><Spectrum data={s.spectrum} /></div><div className="row">{PRESETS.map(p=><button key={p.id} className="ghost" onClick={()=>s.setNoiseMode(p.id==="white"?"white":"none")}>{p.label}</button>)}</div><button className="bigbtn" onClick={()=>{ if(running){ setRunning(false); void s.logExperiment({ id:`exp_${Date.now()}`, startedAt:started, endedAt:Date.now(), startHz:20, endHz:20000, preset:"SWEEP", durationMs:Date.now()-started, anomalies:s.audioEvents.length, voiceLike:0, signalStrength:s.anomalyScore }); } else { setStarted(Date.now()); setElapsed(0); setRunning(true);} }}>{running?`STOP ${formatMs(elapsed)}`:"START SWEEP"}</button></main>);
}
