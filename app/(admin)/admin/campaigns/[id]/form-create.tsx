"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorText, Field, inputClass } from "@/components/ui";

export default function FormCreate({
  campaignId,
  templates,
}: {
  campaignId: string;
  templates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (templates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong px-5 py-8 text-center">
        <p className="text-sm text-ink-2">폼을 만들려면 HTML 템플릿이 먼저 필요합니다.</p>
        <a
          href="/admin/templates"
          className="mt-1 inline-block text-sm font-medium text-accent hover:underline"
        >
          템플릿 업로드하러 가기 →
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
      setError(body?.error?.message ?? "폼 생성에 실패했습니다");
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
        <Field label="폼 제목" className="min-w-44 flex-1">
          <input name="title" required placeholder="봄 스킨케어 가이드" className={inputClass} />
        </Field>
        <Field label="HTML 템플릿" className="min-w-44 flex-1">
          <select name="templateId" required className={inputClass}>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="슬러그 (선택)" className="min-w-40 flex-1">
          <input
            name="slug"
            pattern="[a-z0-9\-]{3,64}"
            placeholder="자동 생성"
            className={`${inputClass} font-mono`}
          />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "생성 중…" : "폼 생성"}
        </Button>
        {error && <div className="w-full">{<ErrorText>{error}</ErrorText>}</div>}
      </form>
    </Card>
  );
}
