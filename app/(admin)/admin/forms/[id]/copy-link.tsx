"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      variant="secondary"
      className={`w-16 px-2.5 py-1 text-xs ${copied ? "text-ok" : ""}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard needs a secure context; the URL is visible either way.
        }
      }}
    >
      {copied ? "복사됨" : "복사"}
    </Button>
  );
}
