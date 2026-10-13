"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutUser } from "@/modules/auth/actions/auth-actions";

interface CourierShellProps {
  userName: string;
  children: React.ReactNode;
}

/** App del mensajero: header compacto y una sola columna. Sin barra inferior,
 *  el flujo es lineal (mis entregas → detalle → acción). */
export function CourierShell({ userName, children }: CourierShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 md:bg-canvas/90 md:backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-[720px] items-center gap-3 px-4">
          <BrandLogo size="sm" href="/mensajero" />
          <span className="eyebrow text-navy-700">Mensajero</span>
          <div className="ml-auto flex items-center gap-1">
            <p className="hidden max-w-[140px] truncate text-[12.5px] font-semibold text-slate-500 sm:block">
              {userName}
            </p>
            <Link
              href="/perfil"
              aria-label="Mi perfil"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition-colors duration-150 hover:bg-hover hover:text-ink"
            >
              <UserRound className="h-[18px] w-[18px]" strokeWidth={1.9} />
            </Link>
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
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-5 px-4 pt-5 pb-[max(24px,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  );
}
