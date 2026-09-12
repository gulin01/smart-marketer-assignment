import { Suspense } from "react";
import LoginForm from "./login-form";
import { getTranslations } from "@/lib/i18n";

export const metadata = { title: "로그인 · Lead Magnet CRM" };

export default async function LoginPage() {
  const { t } = await getTranslations();

  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-[22rem]">
        <div className="mb-8">
          <div className="mb-5 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <span className="text-sm font-semibold">LM</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{t.login.title}</h1>
          <p className="mt-1 text-sm text-ink-3">{t.login.subtitle}</p>
        </div>

        <Suspense>
          <LoginForm t={t.login} />
        </Suspense>
      </div>
    </main>
  );
}
