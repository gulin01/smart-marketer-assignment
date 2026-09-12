"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorText, Field, inputClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export default function CampaignCreate({ t }: { t: Dictionary["campaign"] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        description: String(data.get("description") ?? "") || undefined,
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
        <Field label={t.name} className="min-w-56 flex-1">
          <input name="name" required placeholder={t.namePlaceholder} className={inputClass} />
        </Field>
        <Field label={t.descriptionLabel} className="min-w-56 flex-1">
          <input name="description" placeholder={t.descriptionPlaceholder} className={inputClass} />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? t.creating : t.create}
        </Button>
        {error && <div className="w-full">{<ErrorText>{error}</ErrorText>}</div>}
      </form>
    </Card>
  );
}
