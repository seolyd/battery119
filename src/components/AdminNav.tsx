"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ openInquiries = 0 }: { openInquiries?: number }) {
  const LINKS = [
    { href: "/admin", label: "오늘" },
    { href: "/admin/orders", label: "주문" },
    { href: "/admin/inquiries", label: openInquiries ? `문의 ${openInquiries}` : "문의" },
    { href: "/admin/models", label: "모델·가격" },
  ];
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
