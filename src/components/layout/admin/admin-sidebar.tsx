"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Store } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { ADMIN_NAV, isNavActive, type NavEntry } from "@/lib/nav-registry";
import { logoutUser } from "@/modules/auth/actions/auth-actions";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  userName: string;
}

function SidebarLink({ entry, depth = 0 }: { entry: NavEntry; depth?: number }) {
  const pathname = usePathname();
  const active = depth === 0 ? isNavActive(entry, pathname) : pathname === entry.href;
  const Icon = entry.icon;
  return (
    <li>
      <Link
        href={entry.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 rounded-chip px-3 py-2.5 text-[13px] font-medium transition-colors duration-150",
          depth > 0 && "ml-6 py-2 text-[12.5px]",
          active
            ? "bg-white/10 font-semibold text-white"
            : "text-footer-muted hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon className={cn("flex-none", depth > 0 ? "h-3.5 w-3.5" : "h-4 w-4")} strokeWidth={1.9} />
        <span className="truncate">{entry.label}</span>
      </Link>
      {entry.children && (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {entry.children.map((child) => (
            <SidebarLink key={child.id} entry={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Sidebar fijo de desktop en navy pleno: la identidad de la marca manda
 *  igual que en el footer de la tienda. */
export function AdminSidebar({ userName }: AdminSidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[240px] flex-none flex-col bg-footer text-footer-fg md:flex">
      <div className="flex items-center justify-between px-5 pt-6 pb-5">
        <BrandLogo tone="inverse" href="/admin" />
      </div>

      <nav aria-label="Secciones del panel" className="min-h-0 flex-1 overflow-y-auto px-3">
        <ul className="flex flex-col gap-1">
          {ADMIN_NAV.map((entry) => (
            <SidebarLink key={entry.id} entry={entry} />
          ))}
        </ul>
      </nav>

      <div className="border-t border-footer-line px-3 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-chip px-3 py-2 text-[13px] font-medium text-footer-muted transition-colors duration-150 hover:bg-white/5 hover:text-white"
        >
          <Store className="h-4 w-4 flex-none" strokeWidth={1.9} />
          Ver la tienda
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3 px-3">
          <p className="truncate text-[12.5px] font-semibold text-white">{userName}</p>
          <div className="flex items-center gap-1">
            <ThemeToggle className="h-8 w-8 justify-center rounded-full text-footer-muted hover:bg-white/10 hover:text-white" />
            <button
              type="button"
              onClick={() => void logoutUser()}
              aria-label="Cerrar sesión"
              className="flex h-8 w-8 items-center justify-center rounded-full text-footer-muted transition-colors duration-150 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
