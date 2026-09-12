"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorText, Field, inputClass } from "@/components/ui";

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
    <Card className="p-5">
      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <Field label="캠페인 이름" className="min-w-56 flex-1">
          <input name="name" required placeholder="2026 봄 프로모션" className={inputClass} />
        </Field>
        <Field label="설명 (선택)" className="min-w-56 flex-1">
          <input name="description" placeholder="간단한 메모" className={inputClass} />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "생성 중…" : "캠페인 생성"}
        </Button>
        {error && <div className="w-full">{<ErrorText>{error}</ErrorText>}</div>}
      </form>
    </Card>
  );
}
