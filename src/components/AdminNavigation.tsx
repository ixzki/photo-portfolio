"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import AdminLogoutButton from "./AdminLogoutButton";

const links = [
  ["/admin", "总览"],
  ["/admin/projects", "作品管理"],
  ["/admin/travel", "旅行管理"],
  ["/admin/features", "首页精选"],
  ["/admin/media", "媒体库"],
  ["/admin/settings", "站点设置"],
] as const;

export default function AdminNavigation() {
  const pathname = usePathname();
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navigation.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    const offset = active.getBoundingClientRect().left - nav.getBoundingClientRect().left;
    nav.scrollTo({ left: nav.scrollLeft + offset - (nav.clientWidth - active.clientWidth) / 2, behavior: "auto" });
  }, [pathname]);
  return <aside className="admin-sidebar">
    <div className="admin-brand"><Link href="/admin">内容管理</Link></div>
    <nav className="admin-nav" aria-label="后台导航" ref={navigation}>
      {links.map(([href, label]) => {
        const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} className="admin-nav-item" aria-current={active ? "page" : undefined}>{label}</Link>;
      })}
    </nav>
    <div className="admin-sidebar-footer"><Link href="/" className="admin-site-link" target="_blank" rel="noopener noreferrer">查看网站 ↗</Link><AdminLogoutButton /></div>
  </aside>;
}
