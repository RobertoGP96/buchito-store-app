import { History, Truck, UserRound, Wallet, type LucideIcon } from "lucide-react";

export interface CourierNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
}

/** Secciones de la app del mensajero: tabs inferiores en móvil y enlaces en
 *  la cabecera en desktop comparten esta lista. Todo vive bajo /mensajero;
 *  la tienda no forma parte de su trabajo. */
export const COURIER_NAV: CourierNavItem[] = [
  {
    href: "/mensajero",
    label: "Entregas",
    icon: Truck,
    isActive: (p) => p === "/mensajero" || p.startsWith("/mensajero/entregas"),
  },
  {
    href: "/mensajero/historial",
    label: "Historial",
    icon: History,
    isActive: (p) => p.startsWith("/mensajero/historial"),
  },
  {
    href: "/mensajero/ganancias",
    label: "Ganancias",
    icon: Wallet,
    isActive: (p) => p.startsWith("/mensajero/ganancias"),
  },
  {
    href: "/mensajero/perfil",
    label: "Perfil",
    icon: UserRound,
    isActive: (p) => p.startsWith("/mensajero/perfil"),
  },
];
