"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
const NAV = [
  { href: "/", label: "SCAN" },
  { href: "/session", label: "SESSION" },
  { href: "/frequency", label: "FREQ LAB" },
  { href: "/evidence", label: "EVIDENCE" },
  { href: "/sessions", label: "ARCHIVE" },
  { href: "/settings", label: "SETTINGS" },
];
export function Header() {
  const { status, micOn } = useStore();
  return (
    <header className="topbar">
      <div>
        <div className="brand">AFTERIMAGE</div>
        <div className="subbrand">ANOMALY INVESTIGATION // LOCAL ONLY</div>
      </div>
      <div className="status-cluster">
        <span className={`pill ${micOn ? "ok" : "off"}`}>MIC {micOn ? "ON" : "OFF"}</span>
        <span className={`pill status-${status.toLowerCase()}`}>● {status}</span>
      </div>
    </header>
  );
}
export function Nav() {
  const path = usePathname();
  return (
    <nav className="sidenav">
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} className={path === n.href || (n.href !== "/" && path.startsWith(n.href)) ? "active" : ""}>{n.label}</Link>
      ))}
    </nav>
  );
}
export function Disclaimer() {
  return <p className="disclaimer">Experimental pattern analysis. Detections are algorithmic classifications — not evidence of spirits, persons, or an afterlife.</p>;
}
export function formatMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}
