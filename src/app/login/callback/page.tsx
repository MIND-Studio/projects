"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { consumeRestoredPath, ensureSession } from "@/lib/solid/auth";

export default function LoginCallback() {
  const router = useRouter();
  useEffect(() => {
    ensureSession().then(() => router.replace(consumeRestoredPath() ?? "/"));
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Anmeldung wird abgeschlossen…
    </div>
  );
}
