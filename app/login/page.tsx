import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata = { title: "로그인 · Lead Magnet CRM" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-[22rem]">
        <div className="mb-8">
          <div className="mb-5 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-ink">
            <span className="text-sm font-semibold">LM</span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Lead Magnet CRM</h1>
          <p className="mt-1 text-sm text-ink-3">운영자 계정으로 로그인하세요.</p>
        </div>

        <Suspense>
          <LoginForm />
        </Suspense>

        <p className="mt-8 border-t border-line pt-5 text-xs leading-relaxed text-ink-3">
          데모 계정 · <span className="font-mono text-ink-2">admin@example.com</span> /{" "}
          <span className="font-mono text-ink-2">admin1234</span>
        </p>
      </div>
    </main>
  );
}
