"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { formatMs } from "@/components/Chrome";
export default function SessionsPage() {
  const { sessions, deleteSession } = useStore();
  return (<main><h1>SESSION ARCHIVE</h1>{sessions.map(ses=>(<div key={ses.id} className="panel" style={{marginBottom:8}}><Link href={`/session/${ses.id}`}><strong>{new Date(ses.startedAt).toLocaleString()}</strong></Link><div className="meta">{formatMs(ses.durationMs||0)} · audio {ses.audioEventCount} · visual {ses.visualEventCount}</div><button className="ghost" onClick={()=>void deleteSession(ses.id)}>DELETE SESSION</button></div>))}{sessions.length===0 && <p className="disclaimer">No archived sessions.</p>}</main>);
}
