"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-6 text-center text-sm text-neutral-500 dark:border-neutral-700">
        폼을 만들려면 먼저{" "}
        <a href="/admin/templates" className="underline">
          HTML 템플릿
        </a>
        을 업로드하세요.
      </p>
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
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <label className="flex-1 min-w-45">
        <span className="mb-1 block text-sm font-medium">폼 제목</span>
        <input
          name="title"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
        />
      </label>
      <label className="flex-1 min-w-45">
        <span className="mb-1 block text-sm font-medium">HTML 템플릿</span>
        <select
          name="templateId"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex-1 min-w-40">
        <span className="mb-1 block text-sm font-medium">슬러그 (선택)</span>
        <input
          name="slug"
          pattern="[a-z0-9\-]{3,64}"
          placeholder="자동 생성"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {pending ? "생성 중…" : "폼 생성"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
