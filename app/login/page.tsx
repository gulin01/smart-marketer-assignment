import { Suspense } from "react";
import LoginForm from "./login-form";

export const metadata = { title: "로그인 · Lead Magnet CRM" };

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 p-6 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Lead Magnet CRM</h1>
        <p className="mt-1 mb-8 text-sm text-neutral-500">운영자 로그인</p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
