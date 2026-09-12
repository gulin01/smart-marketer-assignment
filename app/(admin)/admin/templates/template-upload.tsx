"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorText, Field, inputClass } from "@/components/ui";

export default function TemplateUpload() {
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
      setError(body?.error?.message ?? "업로드에 실패했습니다");
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
        <Field label="이름 (선택)" className="min-w-52 flex-1">
          <input name="name" placeholder="비워두면 파일명을 사용합니다" className={inputClass} />
        </Field>

        <Field label="HTML 파일" className="min-w-52 flex-1" hint="최대 200 KB · .html">
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
          {pending ? "업로드 중…" : "업로드"}
        </Button>

        {fileName && !error && (
          <p className="w-full text-xs text-ink-3">선택된 파일: {fileName}</p>
        )}
        {error && <div className="w-full">{<ErrorText>{error}</ErrorText>}</div>}
      </form>
    </Card>
  );
}
