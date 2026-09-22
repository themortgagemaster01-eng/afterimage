"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import Link from "next/link";
export default function EvidenceDetail() {
  const params = useParams<{id:string}>();
  const rawId = decodeURIComponent(params.id);
  const kind = rawId.startsWith("audio-") ? "audio" : "visual";
  const id = rawId.replace(/^(audio|visual)-/, "");
  const { audioEvents, visualEvents, setUserInterpretation } = useStore();
  const ev = kind==="audio" ? audioEvents.find(e=>e.id===id) : visualEvents.find(e=>e.id===id);
  const [user, setUser] = useState(ev?.userInterpretation || "");
  if (!ev) return <main><Link href="/evidence">← EVIDENCE</Link><p>Missing.</p></main>;
  return (<main>
    <Link href="/evidence">← EVIDENCE</Link>
    <h1>{kind.toUpperCase()} EVENT</h1>
    <p className="badge">AI INTERPRETATION — NOT RAW EVIDENCE</p>
    {kind==="visual" && "rawAsset" in ev && <img src={(ev as {rawAsset:string}).rawAsset} alt="" className="preview" />}
    <div className="panel"><div className="statline"><span>CLASSIFICATION</span><span>{ev.classification}</span></div><div className="statline"><span>CONFIDENCE</span><span>{Math.round(ev.confidence*100)}%</span></div></div>
    {"analysis" in ev && ev.analysis?.hypotheses?.map((h)=>(<div key={h.text} className="hyp"><span>“{h.text}”</span><span>{Math.round(h.confidence*100)}%</span></div>))}
    <textarea rows={3} value={user} onChange={(e)=>setUser(e.target.value)} placeholder="User interpretation" />
    <button className="ghost" onClick={()=>void setUserInterpretation(kind, ev.id, user)}>SAVE USER INTERPRETATION</button>
  </main>);
}
