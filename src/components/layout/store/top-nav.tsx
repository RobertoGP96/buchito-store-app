"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgePercent, Gift, LayoutGrid, ShoppingCart, Store, type LucideIcon } from "lucide-react";
import { cartCount, useCart } from "@/modules/cart/store";
import { BrandLogo } from "@/components/brand-logo";
import { CurrencySwitcher } from "@/components/currency-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { CountBadge, ICON_ACTION, NAV_CONTROL } from "@/components/layout/store/nav-primitives";
import { UserMenu, type NavUser } from "@/components/layout/store/user-menu";
import { isCatalogPath } from "@/lib/store-nav";
import { NotificationsBell } from "@/modules/notifications/components/notifications-bell";
import { audienceForRole, inboxHrefForRole } from "@/modules/notifications/lib/labels";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

// Mismos glifos que la BottomNav: Inicio y Catálogo aparecen en las dos barras
// y con iconos distintos se leerían como destinos distintos.
const LINKS: NavLink[] = [
  { href: "/", label: "Inicio", icon: Store, isActive: (p) => p === "/" },
  {
    href: "/catalogo",
    label: "Catálogo",
    icon: LayoutGrid,
    isActive: isCatalogPath,
  },
  { href: "/combos", label: "Combos", icon: Gift, isActive: (p) => p.startsWith("/combos") },
  { href: "/ofertas", label: "Ofertas", icon: BadgePercent, isActive: (p) => p === "/ofertas" },
];

export function TopNav({ user }: { user: NavUser | null }) {
  const pathname = usePathname();
  const { state } = useCart();
  const count = state.hydrated ? cartCount(state) : 0;

  // Barra en el café principal con las esquinas inferiores redondeadas: la
  // página asoma por debajo en los rincones, así que no lleva borde ni blur.
  return (
    <header className="on-brand sticky top-0 z-40 rounded-b-[22px] bg-nav text-nav-fg shadow-float md:rounded-b-[26px]">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center gap-5 px-5 md:h-[68px] md:gap-7 md:px-6">
        <BrandLogo tone="on-brand" compact />

        <nav className="hidden items-center gap-6 md:flex">
          {LINKS.map((link) => {
            const active = link.isActive(pathname);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "nav-label inline-flex items-center gap-1.5 border-b-2 pt-1 pb-1 transition-colors duration-150",
                  active
                    ? "border-gold-500 font-bold text-nav-fg"
                    : "border-transparent font-medium text-nav-muted hover:text-nav-fg"
                )}
              >
                <Icon className="h-[15px] w-[15px] flex-none" strokeWidth={1.9} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <CurrencySwitcher className={cn("hidden md:inline-flex", NAV_CONTROL)} />
          <ThemeToggle className={ICON_ACTION} />

          <Link
            href="/carrito"
            aria-label={`Carrito de compra${count > 0 ? ` (${count} artículos)` : " vacío"}`}
            className={cn(ICON_ACTION, "text-nav-fg")}
          >
            <ShoppingCart className="h-[18px] w-[18px]" strokeWidth={1.9} />
            <CountBadge count={count} />
          </Link>

          {user && (
            <NotificationsBell audience={audienceForRole(user.role)} tone="brand" inboxHref={inboxHrefForRole(user.role)} />
          )}

          <UserMenu user={user} triggerClassName={NAV_CONTROL} />
        </div>
      </div>
    </header>
  );
}
