import {
  Bike,
  Coins,
  FolderTree,
  Inbox,
  LayoutDashboard,
  MapPin,
  Package,
  Settings2,
  Tags,
  Truck,
  Wallet,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

export interface NavEntry {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Activo también en sub-rutas (`/admin/pedidos/12`). */
  matchPrefix?: boolean;
  children?: NavEntry[];
}

/** Secciones del panel admin: sidebar (desktop), tabs inferiores (móvil) y
 *  cabeceras. Si una ruta no está aquí, no existe para la navegación. */
export const ADMIN_NAV: NavEntry[] = [
  { id: "home", label: "Inicio", href: "/admin", icon: LayoutDashboard },
  { id: "orders", label: "Pedidos", href: "/admin/pedidos", icon: Inbox, matchPrefix: true },
  {
    id: "products",
    label: "Productos",
    href: "/admin/productos",
    icon: Package,
    matchPrefix: true,
    children: [
      { id: "product-types", label: "Tipos de producto", href: "/admin/productos/tipos", icon: Tags },
      { id: "categories", label: "Categorías", href: "/admin/categorias", icon: FolderTree },
    ],
  },
  {
    id: "deliveries",
    label: "Entregas",
    href: "/admin/entregas",
    icon: Truck,
    matchPrefix: true,
    children: [
      { id: "zones", label: "Zonas de entrega", href: "/admin/entregas/zonas", icon: MapPin },
      { id: "couriers", label: "Mensajeros", href: "/admin/mensajeros", icon: Bike },
    ],
  },
  {
    id: "finance",
    label: "Finanzas",
    href: "/admin/monedas",
    icon: Coins,
    children: [
      { id: "currencies", label: "Monedas", href: "/admin/monedas", icon: Coins },
      { id: "rates", label: "Tasas de cambio", href: "/admin/monedas/tasas", icon: TrendingUp },
      { id: "payment-methods", label: "Métodos de pago", href: "/admin/metodos-pago", icon: Wallet },
    ],
  },
  { id: "settings", label: "Configuración", href: "/admin/configuracion", icon: Settings2 },
];

/** Ítems de la barra inferior móvil; el quinto slot ("Más") abre el resto. */
export const ADMIN_BOTTOM_TABS = ["home", "orders", "products", "deliveries"] as const;

export function isNavActive(entry: NavEntry, pathname: string): boolean {
  if (pathname === entry.href) return true;
  if (entry.matchPrefix && pathname.startsWith(`${entry.href}/`)) return true;
  return entry.children?.some((child) => isNavActive(child, pathname)) ?? false;
}

export function flattenNav(entries: NavEntry[]): NavEntry[] {
  return entries.flatMap((entry) => [entry, ...(entry.children ?? [])]);
}

export function findNavEntry(pathname: string): NavEntry | undefined {
  const all = flattenNav(ADMIN_NAV);
  return (
    all.find((e) => e.href === pathname) ??
    all
      .filter((e) => e.matchPrefix && pathname.startsWith(`${e.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]
  );
}
