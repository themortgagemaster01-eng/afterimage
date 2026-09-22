"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
export default function EvidenceGallery() {
  const { audioEvents, visualEvents, correlated } = useStore();
  const items = [
    ...visualEvents.map((v)=>({ id:v.id, kind:"visual" as const, ts:v.timestamp, classification:v.classification, confidence:v.confidence, thumb:v.derivedAssets.enhanced||v.rawAsset, corr: correlated.some(c=>c.visualEventId===v.id) })),
    ...audioEvents.map((a)=>({ id:a.id, kind:"audio" as const, ts:a.timestamp, classification:a.classification, confidence:a.confidence, thumb:"", corr: correlated.some(c=>c.audioEventId===a.id) })),
  ].sort((a,b)=>b.ts-a.ts);
  return (<main><h1>EVIDENCE</h1><div className="cards">{items.map((it,i)=>(<Link key={it.id} href={`/evidence/${it.kind}-${it.id}`} className="card">{it.thumb ? <img src={it.thumb} alt="" className="thumb" /> : <div className="thumb" />}<div className="meta"><strong>EVENT #{String(items.length-i).padStart(3,"0")}</strong><div>{new Date(it.ts).toLocaleString()}</div><div>{it.classification} · {Math.round(it.confidence*100)}%</div></div></Link>))}{items.length===0 && <p className="disclaimer">No events yet. Start a session.</p>}</div></main>);
}
