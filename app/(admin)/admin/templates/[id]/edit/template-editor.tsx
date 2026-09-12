"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CodeEditor from "@/components/code-editor";
import { Button, Card, Code, ErrorText, inputClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import VersionHistory from "./version-history";

const PREVIEW_DEBOUNCE_MS = 400;

function interpolate(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** Mirrors the server's parse closely enough to keep the chips responsive. */
function detectFields(html: string): string[] {
  if (typeof window === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const form = doc.querySelector("form");
  if (!form) return [];

  const names = new Set<string>();
  form.querySelectorAll("input, select, textarea").forEach((element) => {
    const name = element.getAttribute("name")?.trim();
    const type = element.getAttribute("type")?.toLowerCase();
    if (!name || name.startsWith("__")) return;
    if (type === "submit" || type === "button" || type === "reset") return;
    names.add(name);
  });
  return [...names];
}

interface RemovalWarning {
  removedFields: string[];
  affectedSubmissions: number;
}

export default function TemplateEditor({
  templateId,
  initialName,
  initialHtml,
  initialFields,
  usage,
  versionCount,
  t,
}: {
  templateId: string;
  initialName: string;
  initialHtml: string;
  initialFields: string[];
  usage: { forms: number; campaigns: number };
  versionCount: number;
  t: Dictionary["editor"];
}) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [html, setHtml] = useState(initialHtml);
  const [preview, setPreview] = useState(initialHtml);
  const [fields, setFields] = useState<string[]>(initialFields);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [warning, setWarning] = useState<RemovalWarning | null>(null);

  // The last persisted content, so "unsaved changes" is derived rather than tracked.
  const [savedHtml, setSavedHtml] = useState(initialHtml);
  const [savedName, setSavedName] = useState(initialName);
  const dirty = html !== savedHtml || name !== savedName;

  // Debounced: re-rendering the iframe on every keystroke resets its scroll and
  // restarts any script the operator's template runs.
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreview(html);
      setFields(detectFields(html));
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [html]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const save = useCallback(
    async (confirmFieldRemoval: boolean) => {
      setPending(true);
      setError(null);

      const response = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, html, confirmFieldRemoval }),
      });
      const body = await response.json().catch(() => null);

      if (response.status === 409 && body?.error?.details?.requiresConfirmation) {
        setWarning({
          removedFields: body.error.details.removedFields ?? [],
          affectedSubmissions: body.error.details.affectedSubmissions ?? 0,
        });
        setPending(false);
        return;
      }

      if (!response.ok) {
        setError(body?.error?.message ?? t.saveFailed);
        setPending(false);
        return;
      }

      setSavedHtml(html);
      setSavedName(name);
      setWarning(null);
      setPending(false);
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      router.refresh();
    },
    [html, name, templateId, router, t.saveFailed],
  );

  const onRestored = useCallback(
    (restoredHtml: string) => {
      setHtml(restoredHtml);
      setPreview(restoredHtml);
      setFields(detectFields(restoredHtml));
      setSavedHtml(restoredHtml);
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      router.refresh();
    },
    [router],
  );

  const usageNote = useMemo(
    () => interpolate(t.usage, { forms: usage.forms, campaigns: usage.campaigns }),
    [t.usage, usage.forms, usage.campaigns],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-56 flex-1">
          <label className="mb-1.5 block text-xs font-medium text-ink-2">{t.title}</label>
          <input
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            className={`${inputClass} max-w-md font-medium`}
          />
        </div>

        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-ink-3">{t.unsaved}</span>}
          {!dirty && savedAt && <span className="text-xs text-ok">{t.saved} · {savedAt}</span>}
          <VersionHistory
            templateId={templateId}
            versionCount={versionCount}
            onRestored={onRestored}
            t={t}
          />
          <Button
            variant="secondary"
            onClick={() => {
              if (dirty && !window.confirm(t.leaveConfirm)) return;
              router.push("/admin/templates");
            }}
          >
            {t.cancel}
          </Button>
          <Button onClick={() => save(false)} disabled={pending || !dirty}>
            {pending ? t.saving : t.save}
          </Button>
        </div>
      </div>

      {usage.forms > 0 && (
        <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs text-ink-2">{usageNote}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-ink-3">{t.detectedFields}</span>
        {fields.length === 0 ? (
          <span className="text-xs text-danger">{t.noFields}</span>
        ) : (
          fields.map((field) => <Code key={field}>{field}</Code>)
        )}
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {warning && (
        <div className="rounded-xl border border-line bg-surface p-4">
          <p className="text-sm font-semibold text-ink">{t.fieldWarningTitle}</p>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">
            {interpolate(t.fieldWarningBody, {
              fields: warning.removedFields.join(", "),
              count: warning.affectedSubmissions,
            })}
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => save(true)} disabled={pending}>
              {t.confirmSave}
            </Button>
            <Button variant="secondary" onClick={() => setWarning(null)}>
              {t.keepEditing}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:h-[70vh] lg:grid-cols-2">
        <Card className="flex min-h-96 flex-col overflow-hidden">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-semibold text-ink">{t.code}</h2>
          </div>
          <div className="min-h-0 flex-1">
            <CodeEditor value={html} onChange={setHtml} ariaLabel={t.code} />
          </div>
        </Card>

        <Card className="flex min-h-96 flex-col overflow-hidden">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-semibold text-ink">{t.preview}</h2>
            <p className="mt-0.5 text-xs text-ink-3">{t.previewHint}</p>
          </div>
          <iframe
            title={t.preview}
            srcDoc={preview}
            // Same sandbox as production: no allow-same-origin, so the previewed
            // HTML runs with an opaque origin and cannot touch the admin session.
            sandbox="allow-forms allow-scripts"
            className="min-h-0 flex-1 bg-white"
          />
        </Card>
      </div>
    </div>
  );
}
