"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { startTransition, useOptimistic } from "react";
import {
  LayoutGrid,
  ShoppingCart,
  Store,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cartCount, useCart } from "@/modules/cart/store";
import { isCatalogPath } from "@/lib/store-nav";
import { cn } from "@/lib/utils";

/** La barra nunca se desmonta: en el flujo lineal de pago solo se esconde con
 *  la clase `is-hidden` (misma transición al entrar y al salir). Desmontarla
 *  la hacía desaparecer de golpe y volver animada al regresar. */
const HIDDEN_PREFIXES = ["/checkout", "/pedido-confirmado"];

/** Sin sesión, "Perfil" apunta directo al login: evita el viaje al middleware
 *  (prefetch desperdiciado y un segundo en blanco hasta el redirect). */
const PROFILE_LOGIN_HREF = "/login?callbackUrl=%2Fperfil";

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: (pathname: string) => boolean;
}

const ITEMS: NavItem[] = [
  { href: "/", icon: Store, label: "Inicio", isActive: (p) => p === "/" },
  { href: "/catalogo", icon: LayoutGrid, label: "Catálogo", isActive: isCatalogPath },
  {
    href: "/carrito",
    icon: ShoppingCart,
    label: "Carrito",
    isActive: (p) => p === "/carrito",
  },
  {
    href: "/perfil",
    icon: UserRound,
    label: "Perfil",
    isActive: (p) => p.startsWith("/perfil") || p === "/login" || p === "/registro",
  },
];

/** Margen lateral de la barra y separación interna: el indicador deslizante
 *  calcula su posición con estos mismos valores. */
const PAD = 6;
const EASE = "cubic-bezier(.16,1,.3,1)";

export function BottomNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const { state } = useCart();
  const visible = !HIDDEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const count = state.hydrated ? cartCount(state) : 0;
  const activeIndex = ITEMS.findIndex((item) => item.isActive(pathname));
  // La píldora viaja en el mismo evento del toque y React la revierte sola
  // cuando la ruta nueva se confirma o la navegación se cancela: respuesta
  // inmediata sin loader, también en rutas sin loading.tsx (/catalogo).
  const [shownIndex, setShownIndex] = useOptimistic(activeIndex);
  const slot = `((100% - ${PAD * 2}px) / ${ITEMS.length})`;

  return (
    <>
      {/* La barra es fija y flota sobre el contenido: el hueco lo reserva este
          espaciador al final del documento, solo mientras la barra se ve. */}
      {visible && <div className="h-[82px] md:hidden" aria-hidden />}
      <nav
        aria-label="Navegación principal"
        inert={!visible}
        className={cn("nav-float fixed inset-x-4 z-40 md:hidden", !visible && "is-hidden")}
        style={{ bottom: "max(14px, env(safe-area-inset-bottom))" }}
      >
        <div
          className="relative grid grid-cols-4 rounded-full border border-line/80 bg-canvas/95 shadow-float"
          style={{ padding: PAD }}
        >
          {/* Indicador deslizante: una sola píldora que viaja entre pestañas.
              Se mueve con `transform`, que anima en el compositor. */}
          <span
            aria-hidden
            className={cn(
              "absolute rounded-full bg-navy-700 transition-[transform,opacity] duration-[380ms] motion-reduce:transition-none",
              shownIndex < 0 && "opacity-0"
            )}
            style={{
              top: PAD,
              bottom: PAD,
              left: PAD,
              width: `calc(${slot})`,
              transform: `translateX(${Math.max(shownIndex, 0) * 100}%)`,
              transitionTimingFunction: EASE,
            }}
          />
          {ITEMS.map((item, index) => {
            const active = index === shownIndex;
            const Icon = item.icon;
            const href = item.href === "/perfil" && !isLoggedIn ? PROFILE_LOGIN_HREF : item.href;
            return (
              <Link
                key={item.href}
                href={href}
                onNavigate={() => startTransition(() => setShownIndex(index))}
                aria-label={item.label}
                // Lo accesible dice dónde se está, no adónde se va.
                aria-current={item.isActive(pathname) ? "page" : undefined}
                className={cn(
                  "relative z-10 flex items-center justify-center rounded-full py-2.5 transition-colors duration-[380ms] motion-reduce:transition-none",
                  active ? "text-on-brand" : "text-slate-400 hover:text-navy-700"
                )}
                style={{ transitionTimingFunction: EASE }}
              >
                <span
                  className={cn(
                    "relative flex h-6 w-6 items-center justify-center transition-transform duration-[380ms] motion-reduce:transition-none",
                    active && "scale-110"
                  )}
                  style={{ transitionTimingFunction: EASE }}
                >
                  <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : 1.8} />
                  {item.href === "/carrito" && count > 0 && (
                    <span className="pop-in tabular absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy-700 px-1 text-[9px] leading-none font-bold text-on-brand ring-2 ring-canvas">
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
