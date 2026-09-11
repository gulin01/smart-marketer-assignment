"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TemplateUpload() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const form = event.currentTarget;
    const response = await fetch("/api/templates", {
      method: "POST",
      body: new FormData(form),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "업로드에 실패했습니다");
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
        <span className="mb-1 block text-sm font-medium">이름 (선택)</span>
        <input
          name="name"
          placeholder="파일명을 그대로 사용합니다"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-100"
        />
      </label>
      <label className="flex-1 min-w-50">
        <span className="mb-1 block text-sm font-medium">HTML 파일</span>
        <input
          name="file"
          type="file"
          accept=".html,.htm,text/html"
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm file:mr-3 file:rounded file:border-0 file:bg-neutral-100 file:px-2 file:py-1 file:text-xs dark:border-neutral-700 dark:file:bg-neutral-800"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {pending ? "업로드 중…" : "업로드"}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
