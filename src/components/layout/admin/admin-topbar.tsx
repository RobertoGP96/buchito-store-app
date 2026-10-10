"use client";

import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { findNavEntry } from "@/lib/nav-registry";

/** Barra superior solo en móvil: marca + sección actual. En desktop el
 *  sidebar ya orienta y cada página lleva su PageHeader. */
export function AdminTopbar() {
  const pathname = usePathname();
  const entry = findNavEntry(pathname);
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-4 border-b border-line bg-canvas/90 px-4 backdrop-blur-md md:hidden">
      <BrandLogo size="sm" href="/admin" />
      {entry && entry.href !== "/admin" && (
        <p className="nav-label min-w-0 flex-1 truncate text-right text-slate-500">
          {entry.label}
        </p>
      )}
      <ThemeToggle className="flex h-9 w-9 flex-none items-center justify-center rounded-full hover:bg-hover" />
    </header>
  );
}
