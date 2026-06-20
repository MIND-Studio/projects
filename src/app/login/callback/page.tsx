"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { consumeRestoredPath, ensureSession } from "@/lib/solid/auth";
import { t } from "@/lib/strings";

export default function LoginCallback() {
  const router = useRouter();
  useEffect(() => {
    ensureSession().then(() => router.replace(consumeRestoredPath() ?? "/"));
  }, [router]);
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      {t.loginCompleting}
    </div>
  );
}
