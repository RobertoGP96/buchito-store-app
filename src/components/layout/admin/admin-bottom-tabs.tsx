"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Drawer } from "@heroui/react";
import { LogOut, MoreHorizontal, Store } from "lucide-react";
import {
  ADMIN_BOTTOM_TABS,
  ADMIN_NAV,
  flattenNav,
  isNavActive,
} from "@/lib/nav-registry";
import { logoutUser } from "@/modules/auth/actions/auth-actions";
import { cn } from "@/lib/utils";

const TAB =
  "flex flex-col items-center justify-center gap-1 rounded-chip py-1.5 text-[10.5px] font-semibold transition-colors duration-150";

/** Barra inferior del admin en móvil: cuatro secciones principales y un
 *  quinto slot "Más" que abre el resto en una hoja inferior. */
export function AdminBottomTabs({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [pathname]);

  const tabs = ADMIN_BOTTOM_TABS.map(
    (id) => ADMIN_NAV.find((entry) => entry.id === id)!
  );
  const tabIds = new Set<string>(ADMIN_BOTTOM_TABS);
  const rest = flattenNav(ADMIN_NAV).filter((entry) => !tabIds.has(entry.id));
  const restActive = rest.some((entry) => pathname === entry.href);

  return (
    <>
      <nav
        aria-label="Secciones del panel"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      >
        <div className="grid grid-cols-5 px-2 pt-1.5 pb-1.5">
          {tabs.map((entry) => {
            const active = isNavActive(entry, pathname);
            const Icon = entry.icon;
            return (
              <Link
                key={entry.id}
                href={entry.href}
                aria-current={active ? "page" : undefined}
                className={cn(TAB, active ? "text-navy-700" : "text-slate-400")}
              >
                <span
                  className={cn(
                    "flex h-7 w-11 items-center justify-center rounded-full transition-colors duration-150",
                    active && "bg-tint"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {entry.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            className={cn(TAB, restActive ? "text-navy-700" : "text-slate-400")}
          >
            <span
              className={cn(
                "flex h-7 w-11 items-center justify-center rounded-full transition-colors duration-150",
                restActive && "bg-tint"
              )}
            >
              <MoreHorizontal className="h-[18px] w-[18px]" strokeWidth={restActive ? 2.2 : 1.8} />
            </span>
            Más
          </button>
        </div>
      </nav>

      <Drawer isOpen={moreOpen} onOpenChange={setMoreOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="bottom">
            <Drawer.Dialog className="bg-canvas">
              <Drawer.Handle />
              <Drawer.Header>
                <Drawer.Heading className="font-display text-[18px] text-navy-900">
                  Más secciones
                </Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body className="pb-[max(16px,env(safe-area-inset-bottom))]">
                <ul className="grid grid-cols-2 gap-2">
                  {rest.map((entry) => {
                    const Icon = entry.icon;
                    const active = pathname === entry.href;
                    return (
                      <li key={entry.id}>
                        <Link
                          href={entry.href}
                          className={cn(
                            "flex items-center gap-3 rounded-field border-[1.5px] px-3.5 py-3 text-[13px] font-semibold transition-colors duration-150",
                            active
                              ? "border-navy-700 bg-tint text-navy-700"
                              : "border-line text-slate-500 hover:border-navy-700 hover:text-navy-700"
                          )}
                        >
                          <Icon className="h-4 w-4 flex-none" strokeWidth={1.9} />
                          <span className="truncate">{entry.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-ink">{userName}</p>
                    <Link
                      href="/"
                      className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-slate-500 hover:text-navy-700"
                    >
                      <Store className="h-3.5 w-3.5" strokeWidth={1.9} />
                      Ver la tienda
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => void logoutUser()}
                    className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold text-danger transition-colors duration-150 hover:bg-danger-soft"
                  >
                    <LogOut className="h-4 w-4" strokeWidth={1.9} />
                    Salir
                  </button>
                </div>
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </>
  );
}
