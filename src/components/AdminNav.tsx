"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "오늘" },
  { href: "/admin/orders", label: "주문" },
  { href: "/admin/models", label: "모델·가격" },
];

export function AdminNav() {
  const path = usePathname();
  return (
    <nav aria-label="관리자 메뉴">
      {LINKS.map((l) => {
        const on = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={on ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
