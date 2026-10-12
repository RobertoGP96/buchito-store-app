"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutGrid,
  ShoppingCart,
  Store,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cartCount, useCart } from "@/modules/cart/store";
import { cn } from "@/lib/utils";

// Login y registro también: al tocar "Perfil" sin sesión se llega ahí, y si
// la barra se desmontara se vería desaparecer de golpe y volver animada.
const VISIBLE_PATHS = [
  "/",
  "/catalogo",
  "/combos",
  "/ofertas",
  "/pagos",
  "/carrito",
  "/perfil",
  "/perfil/pedidos",
  "/login",
  "/registro",
];

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
  {
    href: "/catalogo",
    icon: LayoutGrid,
    label: "Catálogo",
    isActive: (p) => p === "/catalogo",
  },
  {
    href: "/carrito",
    icon: ShoppingCart,
    label: "Bolsa",
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

/** Se esconde al bajar y reaparece al subir, con histéresis para que un
 *  scroll con inercia no la haga parpadear. Siempre visible cerca del inicio
 *  y al llegar al final del documento. */
function useHideOnScroll(enabled: boolean, resetKey: string) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(false);
    if (!enabled) return;
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        const atBottom =
          window.innerHeight + y >= document.documentElement.scrollHeight - 8;
        if (y < 64 || atBottom || delta < -6) setHidden(false);
        else if (delta > 6) setHidden(true);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled, resetKey]);

  return hidden;
}

export function BottomNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const pathname = usePathname();
  const { state } = useCart();
  const visible = VISIBLE_PATHS.includes(pathname);
  const hidden = useHideOnScroll(visible, pathname);

  if (!visible) return null;

  const count = state.hydrated ? cartCount(state) : 0;
  const activeIndex = ITEMS.findIndex((item) => item.isActive(pathname));
  const slot = `((100% - ${PAD * 2}px) / ${ITEMS.length})`;

  return (
    <>
      {/* La barra es fija y flota sobre el contenido: el hueco lo reserva este
          espaciador, que solo existe cuando la barra se muestra. */}
      <div className="h-[82px] md:hidden" aria-hidden />
      <nav
        aria-label="Navegación principal"
        className={cn(
          "nav-float fixed inset-x-4 z-40 md:hidden",
          hidden && "is-hidden"
        )}
        style={{ bottom: "max(14px, env(safe-area-inset-bottom))" }}
      >
        <div
          className="relative grid grid-cols-4 rounded-full border border-line/80 bg-canvas/85 shadow-float backdrop-blur-xl"
          style={{ padding: PAD }}
        >
          {/* Indicador deslizante: una sola píldora azul que viaja entre
              pestañas en lugar de encender y apagar fondos por ítem. Se mueve
              con `transform`, que anima en el compositor; animar `left`
              recalculaba el layout en cada frame. */}
          <span
            aria-hidden
            className={cn(
              "absolute rounded-full bg-navy-700 transition-[transform,opacity] duration-[380ms] motion-reduce:transition-none",
              activeIndex < 0 && "opacity-0"
            )}
            style={{
              top: PAD,
              bottom: PAD,
              left: PAD,
              width: `calc(${slot})`,
              transform: `translateX(${Math.max(activeIndex, 0) * 100}%)`,
              transitionTimingFunction: EASE,
            }}
          />
          {ITEMS.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;
            const href = item.href === "/perfil" && !isLoggedIn ? PROFILE_LOGIN_HREF : item.href;
            return (
              <Link
                key={item.href}
                href={href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
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
                    <span className="tabular absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy-700 px-1 text-[9px] leading-none font-bold text-on-brand ring-2 ring-canvas">
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
