import {
  Bike,
  Boxes,
  Coins,
  FolderTree,
  Gift,
  HandCoins,
  Inbox,
  Landmark,
  LayoutDashboard,
  MapPin,
  Package,
  Receipt,
  Settings2,
  Tags,
  TicketPercent,
  TrendingUp,
  Truck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavEntry {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Activo también en sub-rutas (`/admin/pedidos/12`). */
  matchPrefix?: boolean;
  /** Una línea para la hoja "Más" en móvil y los accesos rápidos del panel. */
  description?: string;
}

export interface NavSection {
  id: string;
  /** null = sin cabecera (el inicio). */
  label: string | null;
  items: NavEntry[];
}

/** Secciones del panel admin: sidebar (desktop), tabs inferiores (móvil),
 *  cabecera móvil y accesos rápidos. Si una ruta no está aquí, no existe
 *  para la navegación. */
export const ADMIN_NAV_SECTIONS: NavSection[] = [
  {
    id: "main",
    label: null,
    items: [{ id: "home", label: "Inicio", href: "/admin", icon: LayoutDashboard, description: "Resumen del día" }],
  },
  {
    id: "sales",
    label: "Ventas",
    items: [
      { id: "orders", label: "Pedidos", href: "/admin/pedidos", icon: Inbox, matchPrefix: true, description: "Confirmar, preparar y cancelar pedidos" },
      { id: "customers", label: "Clientes", href: "/admin/clientes", icon: Users, matchPrefix: true, description: "Fichas, direcciones e historial de compras" },
      { id: "coupons", label: "Cupones", href: "/admin/cupones", icon: TicketPercent, description: "Descuentos por código" },
      { id: "payments", label: "Cobros", href: "/admin/cobros", icon: Receipt, description: "Pagos registrados por pedido" },
    ],
  },
  {
    id: "catalog",
    label: "Catálogo",
    items: [
      { id: "products", label: "Productos", href: "/admin/productos", icon: Package, matchPrefix: true, description: "Productos, variantes y precios" },
      { id: "product-types", label: "Tipos de producto", href: "/admin/productos/tipos", icon: Tags, description: "Atributos por tipo (talla, color…)" },
      { id: "categories", label: "Categorías", href: "/admin/categorias", icon: FolderTree, description: "Árbol de categorías" },
      { id: "inventory", label: "Inventario", href: "/admin/inventario", icon: Boxes, matchPrefix: true, description: "Stock por variante y movimientos" },
      { id: "combos", label: "Combos", href: "/admin/combos", icon: Gift, matchPrefix: true, description: "Paquetes de productos a precio cerrado" },
    ],
  },
  {
    id: "logistics",
    label: "Logística",
    items: [
      { id: "deliveries", label: "Entregas", href: "/admin/entregas", icon: Truck, matchPrefix: true, description: "Asignar mensajeros y seguir entregas" },
      { id: "zones", label: "Zonas de entrega", href: "/admin/entregas/zonas", icon: MapPin, description: "Tarifas y tiempos por zona" },
      { id: "couriers", label: "Mensajeros", href: "/admin/mensajeros", icon: Bike, description: "Repartidores y su actividad" },
      { id: "courier-payments", label: "Pagos a mensajeros", href: "/admin/mensajeros/pagos", icon: HandCoins, description: "Liquidar las entregas completadas" },
    ],
  },
  {
    id: "finance",
    label: "Finanzas",
    items: [
      { id: "finance", label: "Resultados", href: "/admin/finanzas", icon: Landmark, description: "Ventas, costos y ganancia" },
      { id: "currencies", label: "Monedas", href: "/admin/monedas", icon: Coins, description: "Monedas y moneda base" },
      { id: "rates", label: "Tasas de cambio", href: "/admin/monedas/tasas", icon: TrendingUp, description: "Tasa vigente e historial" },
      { id: "payment-methods", label: "Métodos de pago", href: "/admin/metodos-pago", icon: Wallet, description: "Formas de pago del checkout" },
    ],
  },
  {
    id: "system",
    label: "Sistema",
    items: [
      { id: "users", label: "Usuarios", href: "/admin/usuarios", icon: UserCog, matchPrefix: true, description: "Cuentas y roles de acceso" },
      { id: "settings", label: "Configuración", href: "/admin/configuracion", icon: Settings2, description: "Datos de la tienda, envío y folios" },
    ],
  },
];

/** Lista plana en orden de navegación. */
export const ADMIN_NAV: NavEntry[] = ADMIN_NAV_SECTIONS.flatMap((section) => section.items);

/** Ítems de la barra inferior móvil; el quinto slot ("Más") abre el resto. */
export const ADMIN_BOTTOM_TABS = ["home", "orders", "products", "deliveries"] as const;

/** Entrada que corresponde a una ruta: coincidencia exacta y, si no, el
 *  prefijo más largo entre las que aceptan sub-rutas. Así `/admin/productos/tipos`
 *  es "Tipos de producto" y `/admin/productos/3` es "Productos". */
export function findNavEntry(pathname: string): NavEntry | undefined {
  return (
    ADMIN_NAV.find((e) => e.href === pathname) ??
    ADMIN_NAV.filter((e) => e.matchPrefix && pathname.startsWith(`${e.href}/`)).sort(
      (a, b) => b.href.length - a.href.length
    )[0]
  );
}

export function isNavActive(entry: NavEntry, pathname: string): boolean {
  return findNavEntry(pathname)?.id === entry.id;
}

export function findNavSection(entryId: string): NavSection | undefined {
  return ADMIN_NAV_SECTIONS.find((section) => section.items.some((item) => item.id === entryId));
}
