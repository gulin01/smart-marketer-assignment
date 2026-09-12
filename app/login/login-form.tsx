"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";

export default function LoginForm() {
  const router = useRouter();
  const nextPath = useSearchParams().get("next") ?? "/admin";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: data.get("email"), password: data.get("password") }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message ?? "로그인에 실패했습니다");
      setPending(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="이메일">
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue="admin@example.com"
          className={inputClass}
        />
      </Field>
      <Field label="비밀번호">
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>

      {error && <ErrorText>{error}</ErrorText>}

      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "로그인 중…" : "로그인"}
      </Button>
    </form>
  );
}
