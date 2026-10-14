"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { COURIER_NAV } from "@/lib/courier-nav";
import { cn } from "@/lib/utils";
import { logoutUser } from "@/modules/auth/actions/auth-actions";
import { NotificationsBell } from "@/modules/notifications/components/notifications-bell";

interface CourierShellProps {
  userName: string;
  children: React.ReactNode;
}

const TAB =
  "flex flex-col items-center justify-center gap-1 rounded-chip py-1.5 text-[10.5px] font-semibold transition-colors duration-150";

/** App del mensajero: cabecera compacta, una sola columna y cuatro secciones
 *  (entregas, historial, ganancias, perfil) en tabs inferiores en móvil y
 *  como enlaces en la cabecera en desktop. No hay salida a la tienda: el
 *  mensajero solo trabaja aquí. Los enlaces de navegación no muestran loader:
 *  el único indicador es el `loading.tsx` de cada vista. */
export function CourierShell({ userName, children }: CourierShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 md:bg-canvas/90 md:backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[720px] items-center gap-3 px-4">
          <BrandLogo size="sm" href="/mensajero" />
          <span className="eyebrow text-navy-700">Mensajero</span>

          <nav aria-label="Secciones" className="ml-4 hidden items-center gap-5 md:flex">
            {COURIER_NAV.map((item) => {
              const active = item.isActive(pathname);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "nav-label inline-flex items-center gap-1.5 border-b-2 pt-1 pb-1 transition-colors duration-150",
                    active
                      ? "border-navy-700 font-bold text-navy-700"
                      : "border-transparent font-medium text-slate-500 hover:text-navy-700"
                  )}
                >
                  <Icon className="h-[15px] w-[15px] flex-none" strokeWidth={1.9} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <p className="hidden max-w-[140px] truncate text-[12.5px] font-semibold text-slate-500 sm:block">
              {userName}
            </p>
            <NotificationsBell audience="courier" tone="light" inboxHref="/mensajero/notificaciones" />
            <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-hover" />
            <button
              type="button"
              onClick={() => void logoutUser()}
              aria-label="Cerrar sesión"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 hover:bg-hover hover:text-danger"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </button>
          </div>
        </div>
      </header>

      {/* El padding inferior reserva el alto de las tabs en móvil. */}
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-5 px-4 pt-5 pb-[calc(76px+env(safe-area-inset-bottom))] md:pb-10">
        {children}
      </main>

      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid grid-cols-4 px-2 pt-1.5 pb-1.5">
          {COURIER_NAV.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(TAB, active ? "text-navy-700" : "text-slate-500")}
              >
                <span
                  className={cn(
                    "flex h-7 w-11 items-center justify-center rounded-full transition-colors duration-150",
                    active && "bg-tint"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
