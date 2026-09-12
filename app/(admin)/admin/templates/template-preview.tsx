"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

/**
 * Previews the template in exactly the sandbox used in production: no
 * `allow-same-origin`, so the template runs with an opaque origin and cannot
 * reach the admin session cookie (ADR 0003).
 */
export default function TemplatePreview({
  templateId,
  name,
}: {
  templateId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setOpen(true)}>
        미리보기
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm sm:p-8"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${name} 미리보기`}
            onClick={(event) => event.stopPropagation()}
            className="flex h-full max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
          >
            <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{name}</p>
                <p className="mt-0.5 text-xs text-ink-3">
                  운영 환경과 동일한 샌드박스에서 렌더링됩니다.
                </p>
              </div>
              <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setOpen(false)}>
                닫기
              </Button>
            </header>
            <iframe
              title={`${name} 미리보기`}
              src={`/api/templates/${templateId}/preview`}
              sandbox="allow-forms allow-scripts"
              className="flex-1 bg-white"
            />
          </div>
        </div>
      )}
    </>
  );
}
