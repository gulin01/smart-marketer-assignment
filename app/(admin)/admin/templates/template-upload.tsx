"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorText, Field, inputClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export default function TemplateUpload({ t }: { t: Dictionary["template"] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const response = await fetch("/api/templates", { method: "POST", body: new FormData(form) });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? t.uploadFailed);
      setPending(false);
      return;
    }

    form.reset();
    setFileName(null);
    setPending(false);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <Field label={t.nameOptional} className="min-w-52 flex-1">
          <input name="name" placeholder={t.namePlaceholder} className={inputClass} />
        </Field>

        <Field label={t.file} className="min-w-52 flex-1" hint={t.fileHint}>
          <input
            name="file"
            type="file"
            accept=".html,.htm,text/html"
            required
            onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? null)}
            className={`${inputClass} py-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-surface-3 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-ink-2`}
          />
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? t.uploading : t.upload}
        </Button>

        {fileName && !error && (
          <p className="w-full text-xs text-ink-3">{t.selected.replace("{name}", fileName)}</p>
        )}
        {error && <div className="w-full">{<ErrorText>{error}</ErrorText>}</div>}
      </form>
    </Card>
  );
}
