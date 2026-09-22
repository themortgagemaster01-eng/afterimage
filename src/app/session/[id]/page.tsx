"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatMs } from "@/components/Chrome";
export default function SessionReport() {
  const { id } = useParams<{id:string}>();
  const { sessions, audioEvents, visualEvents, correlated } = useStore();
  const ses = sessions.find(s=>s.id===id);
  if (!ses) return <main><Link href="/sessions">← ARCHIVE</Link><p>Missing.</p></main>;
  const aud = audioEvents.filter(a=>a.sessionId===ses.id);
  const vis = visualEvents.filter(v=>v.sessionId===ses.id);
  const corr = correlated.filter(c=>c.sessionId===ses.id);
  return (<main><Link href="/sessions">← ARCHIVE</Link><h1>SESSION REPORT</h1><p className="disclaimer">Counts describe algorithm detections, not a supernatural cause.</p><div className="panel"><div className="statline"><span>DURATION</span><span>{formatMs(ses.durationMs||0)}</span></div><div className="statline"><span>AUDIO</span><span>{aud.length}</span></div><div className="statline"><span>VISUAL</span><span>{vis.length}</span></div><div className="statline"><span>CORRELATED</span><span>{corr.length}</span></div></div></main>);
}
