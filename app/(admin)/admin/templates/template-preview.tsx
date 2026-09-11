"use client";

import { useState } from "react";

/**
 * Previews the template in exactly the same sandbox used in production: no
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
      >
        미리보기
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="flex h-full max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-800">
              <p className="text-sm font-medium">{name}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs dark:border-neutral-700"
              >
                닫기
              </button>
            </div>
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
