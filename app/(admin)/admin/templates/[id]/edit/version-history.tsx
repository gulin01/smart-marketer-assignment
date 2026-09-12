"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Code, formatDate } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface Version {
  id: string;
  fieldNames: string[];
  note: string | null;
  createdAt: string;
  createdBy: { email: string } | null;
}

export default function VersionHistory({
  templateId,
  versionCount,
  onRestored,
  t,
}: {
  templateId: string;
  versionCount: number;
  onRestored: (html: string) => void;
  t: Dictionary["editor"];
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/templates/${templateId}/versions`);
    if (!response.ok) return;
    const body = await response.json();
    setVersions(body.versions ?? []);
  }, [templateId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function restore(versionId: string) {
    setRestoring(versionId);
    const response = await fetch(
      `/api/templates/${templateId}/versions/${versionId}/restore`,
      { method: "POST" },
    );
    setRestoring(null);
    if (!response.ok) return;

    const body = await response.json();
    onRestored(body.template.html);
    setOpen(false);
    void load();
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setOpen(true);
          void load();
        }}
      >
        {t.history}
        {versionCount > 0 && <span className="ml-1 text-ink-3">({versionCount})</span>}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/45"
          onClick={() => setOpen(false)}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t.history}
            onClick={(event) => event.stopPropagation()}
            className="flex h-full w-full max-w-sm flex-col border-l border-line bg-surface"
          >
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">{t.history}</h2>
              <Button variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => setOpen(false)}>
                ✕
              </Button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {versions === null ? (
                <p className="px-4 py-8 text-center text-sm text-ink-3">…</p>
              ) : versions.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-ink-3">{t.historyEmpty}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {versions.map((version) => (
                    <li key={version.id} className="px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs text-ink-2">{formatDate(version.createdAt)}</p>
                          {version.createdBy && (
                            <p className="mt-0.5 text-xs text-ink-3">{version.createdBy.email}</p>
                          )}
                          {version.note?.startsWith("restored-from:") && (
                            <p className="mt-0.5 text-xs text-ink-3">↩ {t.restore}</p>
                          )}
                        </div>
                        <Button
                          variant="secondary"
                          className="shrink-0 px-2.5 py-1 text-xs"
                          disabled={restoring !== null}
                          onClick={() => restore(version.id)}
                        >
                          {restoring === version.id ? t.restoring : t.restore}
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {version.fieldNames.map((field) => (
                          <Code key={field}>{field}</Code>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
