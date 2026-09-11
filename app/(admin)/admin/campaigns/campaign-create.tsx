"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CampaignCreate() {
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
      setError(body?.error?.message ?? "생성에 실패했습니다");
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
      <label className="flex-1 min-w-50">
        <span className="mb-1 block text-sm font-medium">캠페인 이름</span>
        <input
          name="name"
          required
          placeholder="2026 봄 프로모션"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
        />
      </label>
      <label className="flex-1 min-w-50">
        <span className="mb-1 block text-sm font-medium">설명 (선택)</span>
        <input
          name="description"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {pending ? "생성 중…" : "캠페인 생성"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
