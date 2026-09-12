"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n/dictionaries";

export default function LocaleSwitch({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const next: Locale = locale === "ko" ? "en" : "ko";

  return (
    <button
      type="button"
      disabled={pending}
      title={label}
      onClick={async () => {
        setPending(true);
        await fetch("/api/locale", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale: next }),
        });
        // Server components hold the translated copy, so the tree must re-render.
        router.refresh();
        setPending(false);
      }}
      className="rounded-lg px-2 py-1 text-xs font-medium text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink disabled:opacity-50"
    >
      {locale === "ko" ? "EN" : "한"}
    </button>
  );
}
