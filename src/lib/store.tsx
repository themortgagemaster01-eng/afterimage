"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ANALYSIS_VERSION, FREQUENCY_BANDS, type AppStatus, type AudioClassification, type AudioEvent, type CorrelatedEvent, type FrequencyBandId, type FrequencyExperiment, type Session, type VisualClassification, type VisualEvent } from "./types";
import { db, wipeAllEvidence } from "./idb";
import { simulateVisualAnalysis, simulateVoiceInterpretation } from "./ai";
interface EngineState { status: AppStatus; session: Session | null; elapsedMs: number; band: FrequencyBandId; micOn: boolean; visualOn: boolean; rms: number; anomalyScore: number; dominantHz: number; speechLike: number; waveform: Float32Array; spectrum: Float32Array; audioEvents: AudioEvent[]; visualEvents: VisualEvent[]; correlated: CorrelatedEvent[]; sessions: Session[]; experiments: FrequencyExperiment[]; noiseMode: "none" | "white" | "pink" | "sweep"; correlationWindowMs: number; audioThreshold: number; visualThreshold: number; }
interface StoreApi extends EngineState { startSession: () => Promise<void>; pauseSession: () => void; endSession: () => Promise<void>; setBand: (id: FrequencyBandId) => void; setNoiseMode: (m: EngineState["noiseMode"]) => void; enableMic: () => Promise<void>; disableMic: () => void; addUserNote: (note: string) => Promise<void>; setUserInterpretation: (kind: "audio" | "visual", id: string, text: string) => Promise<void>; deleteSession: (id: string) => Promise<void>; deleteAll: () => Promise<void>; logExperiment: (exp: FrequencyExperiment) => Promise<void>; setThresholds: (audio: number, visual: number, windowMs: number) => void; refresh: () => Promise<void>; }
const Ctx = createContext<StoreApi | null>(null);
function uid(prefix: string) { return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now().toString(36)}`; }
function classifyAudio(rms: number, speechLike: number, peak: number): { c: AudioClassification; score: number } {
  if (speechLike > 0.55 && rms > 0.04) return { c: "SPEECH-LIKE", score: speechLike };
  if (speechLike > 0.4) return { c: "VOICE-LIKE", score: speechLike };
  if (speechLike > 0.28 && rms < 0.08) return { c: "WHISPER-LIKE", score: speechLike * 0.9 };
  if (peak > 0.7 && rms > 0.12) return { c: "IMPACT", score: peak };
  if (peak > 0.55) return { c: "TONAL", score: peak };
  if (rms > 0.18) return { c: "STATIC BURST", score: Math.min(1, rms) };
  return { c: "UNCLASSIFIED", score: Math.max(rms, speechLike) };
}
function classifyVisual(persist: number, cluster: number): { c: VisualClassification; score: number } {
  if (persist > 10 && cluster > 0.55) return { c: "FACE-LIKE", score: 0.55 + cluster * 0.3 };
  if (persist > 8 && cluster > 0.45) return { c: "HUMAN-FORM-LIKE", score: 0.5 + cluster * 0.25 };
  if (cluster > 0.6) return { c: "GEOMETRIC", score: cluster };
  if (persist > 6) return { c: "OBJECT-LIKE", score: 0.4 + persist / 40 };
  return { c: "ABSTRACT", score: cluster };
}
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<EngineState>({ status: "READY", session: null, elapsedMs: 0, band: "300-3000", micOn: false, visualOn: true, rms: 0, anomalyScore: 0, dominantHz: 0, speechLike: 0, waveform: new Float32Array(128), spectrum: new Float32Array(64), audioEvents: [], visualEvents: [], correlated: [], sessions: [], experiments: [], noiseMode: "none", correlationWindowMs: 2500, audioThreshold: 0.42, visualThreshold: 0.48 });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const lastAudioEvent = useRef(0);
  const lastVisualEvent = useRef(0);
  const persistRef = useRef(0);
  const tickRef = useRef(0);
  const startedAtRef = useRef(0);
  const statusRef = useRef<AppStatus>("READY");
  const sessionRef = useRef<Session | null>(null);
  const thresholdsRef = useRef({ audio: 0.42, visual: 0.48, window: 2500 });
  const bandRef = useRef<FrequencyBandId>("300-3000");
  useEffect(() => { statusRef.current = state.status; sessionRef.current = state.session; bandRef.current = state.band; thresholdsRef.current = { audio: state.audioThreshold, visual: state.visualThreshold, window: state.correlationWindowMs }; }, [state.status, state.session, state.band, state.audioThreshold, state.visualThreshold, state.correlationWindowMs]);
  const refresh = useCallback(async () => {
    const [sessions, audioEvents, visualEvents, correlated, experiments] = await Promise.all([db.getAll<Session>("sessions"), db.getAll<AudioEvent>("audioEvents"), db.getAll<VisualEvent>("visualEvents"), db.getAll<CorrelatedEvent>("correlated"), db.getAll<FrequencyExperiment>("experiments")]);
    sessions.sort((a,b)=>b.startedAt-a.startedAt); audioEvents.sort((a,b)=>b.timestamp-a.timestamp); visualEvents.sort((a,b)=>b.timestamp-a.timestamp);
    setState((s)=>({...s, sessions, audioEvents, visualEvents, correlated, experiments}));
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const maybeCorrelate = useCallback(async (kind: "audio"|"visual", eventId: string, ts: number, sessionId: string) => {
    const audios = await db.getAll<AudioEvent>("audioEvents");
    const visuals = await db.getAll<VisualEvent>("visualEvents");
    const windowMs = thresholdsRef.current.window;
    const match = kind==="audio" ? visuals.find(v=>v.sessionId===sessionId && Math.abs(v.timestamp-ts)<windowMs) : audios.find(a=>a.sessionId===sessionId && Math.abs(a.timestamp-ts)<windowMs);
    if (!match) return;
    await db.put("correlated", { id: uid("corr"), sessionId, timestamp: ts, durationMs: 1800, audioEventId: kind==="audio"?eventId:(match as AudioEvent).id, visualEventId: kind==="visual"?eventId:(match as VisualEvent).id, independentDetection: true, aiInterpretation: "Ambiguous — time-window association only." });
  }, []);
  const captureVisual = useCallback(async () => {
    const sess = sessionRef.current; if (!sess || statusRef.current !== "SCANNING") return;
    const now = Date.now(); if (now - lastVisualEvent.current < 4000) return;
    persistRef.current += 1;
    const cluster = 0.3 + Math.random()*0.5;
    const { c, score } = classifyVisual(persistRef.current, cluster);
    if (score < thresholdsRef.current.visual) { if (Math.random()>0.08) persistRef.current = Math.max(0, persistRef.current-1); return; }
    lastVisualEvent.current = now;
    const canvas = document.createElement("canvas"); canvas.width=320; canvas.height=240;
    const ctx = canvas.getContext("2d")!;
    const img = ctx.createImageData(320,240);
    for (let i=0;i<img.data.length;i+=4){ const v=Math.random()*255; img.data[i]=img.data[i+1]=img.data[i+2]=v; img.data[i+3]=255; }
    ctx.putImageData(img,0,0);
    const raw = canvas.toDataURL("image/png");
    const event: VisualEvent = { id: uid("vis"), sessionId: sess.id, timestamp: now, durationMs: Math.round(persistRef.current*80), persistenceFrames: persistRef.current, classification: c, confidence: score, rawAsset: raw, derivedAssets: { enhanced: raw, contrast: raw, edge: raw, noiseReduced: raw }, analysisVersion: ANALYSIS_VERSION, analysis: simulateVisualAnalysis(c, persistRef.current, score), blindComplete: true };
    persistRef.current = 0;
    await db.put("visualEvents", event); sess.visualEventCount += 1; await db.put("sessions", sess); await maybeCorrelate("visual", event.id, now, sess.id); await refresh();
  }, [maybeCorrelate, refresh]);
  const captureAudio = useCallback(async (rms: number, speechLike: number, peak: number) => {
    const sess = sessionRef.current; if (!sess || statusRef.current !== "SCANNING") return;
    const now = Date.now(); if (now - lastAudioEvent.current < 3500) return;
    const { c, score } = classifyAudio(rms, speechLike, peak);
    if (score < thresholdsRef.current.audio) return;
    lastAudioEvent.current = now;
    const band = FREQUENCY_BANDS.find((b)=>b.id===bandRef.current)!;
    const event: AudioEvent = { id: uid("aud"), sessionId: sess.id, timestamp: now, durationMs: 900, frequencyRange: band.label, rms, anomalyScore: score, classification: c, confidence: score, rawAsset: "", derivedAssets: {}, analysisVersion: ANALYSIS_VERSION, analysis: simulateVoiceInterpretation(score, c), blindComplete: true };
    await db.put("audioEvents", event); sess.audioEventCount += 1; await db.put("sessions", sess); await maybeCorrelate("audio", event.id, now, sess.id); await refresh();
  }, [maybeCorrelate, refresh]);
  const loop = useCallback(() => {
    const analyser = analyserRef.current;
    const time = new Float32Array(analyser ? analyser.fftSize : 256);
    const freq = new Uint8Array(analyser ? analyser.frequencyBinCount : 128);
    if (analyser) { analyser.getFloatTimeDomainData(time); analyser.getByteFrequencyData(freq); }
    else { for (let i=0;i<time.length;i++) time[i]=(Math.random()-0.5)*0.08; for (let i=0;i<freq.length;i++) freq[i]=Math.random()*40; }
    let sum=0; for (let i=0;i<time.length;i++) sum+=time[i]*time[i];
    const rms = Math.sqrt(sum/time.length);
    const wave = new Float32Array(128); const step=Math.max(1, Math.floor(time.length/128));
    for (let i=0;i<128;i++) wave[i]=time[Math.min(time.length-1,i*step)]||0;
    const spec = new Float32Array(64); const fstep=Math.max(1, Math.floor(freq.length/64));
    let maxV=0, voiceEnergy=0, total=0;
    for (let i=0;i<64;i++){ const v=(freq[Math.min(freq.length-1,i*fstep)]||0)/255; spec[i]=v; if(v>maxV) maxV=v; total+=v; if(i>4&&i<28) voiceEnergy+=v; }
    const speechLike = total>0 ? Math.min(1,(voiceEnergy/Math.max(0.01,total))*(rms*8+0.2)) : 0;
    const anomalyScore = Math.min(1, rms*4 + speechLike*0.6 + maxV*0.3);
    setState((s)=>({...s, rms, anomalyScore, speechLike, waveform: wave, spectrum: spec, elapsedMs: startedAtRef.current && (statusRef.current==="SCANNING"||statusRef.current==="PAUSED") ? Date.now()-startedAtRef.current : s.elapsedMs }));
    tickRef.current++;
    if (statusRef.current==="SCANNING") { if (tickRef.current%20===0) void captureAudio(rms, speechLike, maxV); if (tickRef.current%30===0) void captureVisual(); }
    rafRef.current = requestAnimationFrame(loop);
  }, [captureAudio, captureVisual]);
  useEffect(() => { rafRef.current = requestAnimationFrame(loop); return () => cancelAnimationFrame(rafRef.current); }, [loop]);
  const enableMic = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    streamRef.current = stream;
    const ctx = new AudioContext(); audioCtxRef.current = ctx;
    const analyser = ctx.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0.7; analyserRef.current=analyser;
    const src = ctx.createMediaStreamSource(stream); sourceRef.current=src; src.connect(analyser);
    setState((s)=>({...s, micOn:true}));
  }, []);
  const disableMic = useCallback(() => {
    streamRef.current?.getTracks().forEach((t)=>t.stop()); streamRef.current=null; sourceRef.current?.disconnect(); void audioCtxRef.current?.close(); audioCtxRef.current=null; analyserRef.current=null; setState((s)=>({...s, micOn:false}));
  }, []);
  const startSession = useCallback(async () => {
    const session: Session = { id: uid("ses"), startedAt: Date.now(), durationMs: 0, frequencyBand: bandRef.current, micEnabled: !!streamRef.current, visualEnabled: true, status: "SCANNING", notes: "", audioEventCount: 0, visualEventCount: 0, correlatedCount: 0 };
    startedAtRef.current = session.startedAt; sessionRef.current = session; statusRef.current = "SCANNING";
    await db.put("sessions", session); setState((s)=>({...s, status:"SCANNING", session, elapsedMs:0})); await refresh();
  }, [refresh]);
  const pauseSession = useCallback(() => { const next: AppStatus = statusRef.current==="PAUSED"?"SCANNING":"PAUSED"; statusRef.current=next; setState((s)=>({...s, status:next})); }, []);
  const endSession = useCallback(async () => {
    const sess = sessionRef.current; statusRef.current="READY";
    if (sess) { sess.endedAt=Date.now(); sess.durationMs=sess.endedAt-sess.startedAt; sess.status="READY"; sess.correlatedCount=(await db.getAll<CorrelatedEvent>("correlated")).filter(c=>c.sessionId===sess.id).length; await db.put("sessions", sess); }
    sessionRef.current=null; setState((s)=>({...s, status:"READY", session:null})); await refresh();
  }, [refresh]);
  const api = useMemo<StoreApi>(() => ({ ...state, startSession, pauseSession, endSession, setBand:(id)=>setState((s)=>({...s,band:id})), setNoiseMode:(m)=>setState((s)=>({...s,noiseMode:m})), enableMic, disableMic, addUserNote: async (note)=>{ if(!sessionRef.current) return; sessionRef.current.notes=note; await db.put("sessions", sessionRef.current); await refresh(); }, setUserInterpretation: async (kind,id,text)=>{ if(kind==="audio"){ const ev=await db.get<AudioEvent>("audioEvents", id); if(ev){ ev.userInterpretation=text; await db.put("audioEvents", ev);} } else { const ev=await db.get<VisualEvent>("visualEvents", id); if(ev){ ev.userInterpretation=text; await db.put("visualEvents", ev);} } await refresh(); }, deleteSession: async (id)=>{ await db.delete("sessions", id); const audios=await db.getAll<AudioEvent>("audioEvents"); const visuals=await db.getAll<VisualEvent>("visualEvents"); const corrs=await db.getAll<CorrelatedEvent>("correlated"); await Promise.all([...audios.filter(a=>a.sessionId===id).map(a=>db.delete("audioEvents", a.id)), ...visuals.filter(v=>v.sessionId===id).map(v=>db.delete("visualEvents", v.id)), ...corrs.filter(c=>c.sessionId===id).map(c=>db.delete("correlated", c.id))]); await refresh(); }, deleteAll: async ()=>{ await wipeAllEvidence(); await refresh(); }, logExperiment: async (exp)=>{ await db.put("experiments", exp); await refresh(); }, setThresholds:(audio,visual,windowMs)=>setState((s)=>({...s,audioThreshold:audio,visualThreshold:visual,correlationWindowMs:windowMs})), refresh }), [state, startSession, pauseSession, endSession, enableMic, disableMic, refresh]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
export function useStore() { const v = useContext(Ctx); if (!v) throw new Error("Store missing"); return v; }
