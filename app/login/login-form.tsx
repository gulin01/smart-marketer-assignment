"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, ErrorText, Field, inputClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export default function LoginForm({ t }: { t: Dictionary["login"] }) {
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
      setError(body?.error?.message ?? t.failed);
      setPending(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label={t.email}>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          defaultValue="admin@example.com"
          className={inputClass}
        />
      </Field>
      <Field label={t.password}>
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
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
