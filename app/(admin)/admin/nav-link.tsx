"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function NavLink({ href, children }: { href: string; children: ReactNode }) {
  const pathname = usePathname();
  // /admin must only match exactly, or it would light up on every sub-page.
  const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
        active ? "bg-surface-3 font-medium text-ink" : "text-ink-3 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}
