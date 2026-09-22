"use client";

import { StoreProvider } from "@/lib/store";
import { Disclaimer, Header, Nav } from "@/components/Chrome";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="shell">
        <Header />
        <Nav />
        {children}
        <Disclaimer />
      </div>
    </StoreProvider>
  );
}
