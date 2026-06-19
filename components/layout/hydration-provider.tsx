"use client";

import { useEffect, useState } from "react";
import { useFirmStore } from "@/lib/store/firmStore";

export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useFirmStore((s) => s.hydrate);
  const hydrated = useFirmStore((s) => s.hydrated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    hydrate();
  }, [hydrate]);

  if (!mounted || !hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-gray-500">
        Loading AuditFlow…
      </div>
    );
  }

  return <>{children}</>;
}
