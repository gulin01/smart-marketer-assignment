"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorText, Field, inputClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export default function FormCreate({
  campaignId,
  templates,
  t,
}: {
  campaignId: string;
  templates: { id: string; name: string }[];
  t: Dictionary["form"];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-5 py-8 text-center">
        <p className="text-sm text-ink-2">{t.needTemplateTitle}</p>
        <a
          href="/admin/templates"
          className="mt-1 inline-block text-sm font-medium text-accent hover:underline"
        >
          {t.goUpload}
        </a>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/forms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        campaignId,
        templateId: data.get("templateId"),
        title: data.get("title"),
        slug: String(data.get("slug") ?? "").trim() || undefined,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? t.createFailed);
      setPending(false);
      return;
    }

    form.reset();
    setPending(false);
    router.refresh();
  }

  return (
    <Card className="p-5">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <Field label={t.formTitle} className="min-w-44 flex-1">
          <input name="title" required placeholder={t.formTitlePlaceholder} className={inputClass} />
        </Field>
        <Field label={t.template} className="min-w-44 flex-1">
          <select name="templateId" required className={inputClass}>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.slug} className="min-w-40 flex-1">
          <input
            name="slug"
            pattern="[a-z0-9\-]{3,64}"
            placeholder={t.slugPlaceholder}
            className={`${inputClass} font-mono`}
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? t.creating : t.create}
        </Button>
        {error && <div className="w-full">{<ErrorText>{error}</ErrorText>}</div>}
      </form>
    </Card>
  );
}
