import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import NavLink from "./nav-link";
import LogoutButton from "./logout-button";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/campaigns", label: "캠페인" },
  { href: "/admin/templates", label: "템플릿" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getSession();
  if (!session.operatorId) redirect("/login?next=/admin");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-7 px-6">
          <Link href="/admin" className="flex items-center gap-2.5">
            <span className="flex size-6 items-center justify-center rounded-md bg-accent text-[10px] font-semibold text-accent-ink">
              LM
            </span>
            <span className="text-sm font-semibold tracking-tight text-ink">Lead Magnet</span>
          </Link>

          <nav className="flex flex-1 items-center gap-1">
            {NAV.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/api-docs"
              target="_blank"
              rel="noreferrer"
              className="hidden text-xs text-ink-3 transition-colors hover:text-ink sm:inline"
            >
              API 문서 ↗
            </a>
            <span className="hidden text-xs text-ink-3 md:inline">{session.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-9">{children}</main>

      <footer className="border-t border-line px-6 py-5">
        <p className="mx-auto max-w-6xl text-xs text-ink-3">
          방문은 폼 페이지 로드 수, 방문자는 쿠키 기준 순 방문자, 전환율은 제출 ÷ 방문자입니다.
        </p>
      </footer>
    </div>
  );
}
