import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LogoutButton from "./logout-button";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/campaigns", label: "캠페인" },
  { href: "/admin/templates", label: "HTML 템플릿" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();
  if (!session.operatorId) redirect("/login?next=/admin");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-neutral-50 dark:bg-neutral-950">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <Link href="/admin" className="text-sm font-semibold tracking-tight">
            Lead Magnet CRM
          </Link>
          <nav className="flex flex-1 gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <span className="hidden text-xs text-neutral-500 sm:inline">{session.email}</span>
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
