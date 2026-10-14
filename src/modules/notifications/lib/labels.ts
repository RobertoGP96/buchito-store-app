import { isRole, type Role } from "@/lib/roles";

/* Uniones espejo de los enums de Prisma: los componentes cliente no pueden
   importar @/generated/prisma. */

export const NOTIFICATION_CATEGORIES = ["orders", "deliveries", "payments", "stock"] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationKind =
  | "order_created"
  | "order_confirmed"
  | "order_ready"
  | "order_out_for_delivery"
  | "order_delivered"
  | "order_delivery_failed"
  | "order_cancelled"
  | "payment_recorded"
  | "order_paid"
  | "delivery_assigned"
  | "delivery_unassigned"
  | "delivery_in_transit"
  | "delivery_delivered"
  | "delivery_failed"
  | "delivery_cancelled"
  | "low_stock"
  | "courier_payment";

/** Categoría de cada tipo: es lo que el usuario silencia. */
export const KIND_CATEGORY: Record<NotificationKind, NotificationCategory> = {
  order_created: "orders",
  order_confirmed: "orders",
  order_ready: "orders",
  order_out_for_delivery: "orders",
  order_delivered: "orders",
  order_delivery_failed: "orders",
  order_cancelled: "orders",
  payment_recorded: "payments",
  order_paid: "payments",
  courier_payment: "payments",
  delivery_assigned: "deliveries",
  delivery_unassigned: "deliveries",
  delivery_in_transit: "deliveries",
  delivery_delivered: "deliveries",
  delivery_failed: "deliveries",
  delivery_cancelled: "deliveries",
  low_stock: "stock",
};

/** Categorías que recibe cada rol (y por tanto las que puede silenciar). */
export const ROLE_CATEGORIES: Record<Role, readonly NotificationCategory[]> = {
  customer: ["orders", "payments"],
  admin: ["orders", "deliveries", "payments", "stock"],
  courier: ["deliveries", "payments"],
};

export interface CategoryCopy {
  label: string;
  description: string;
}

const CATEGORY_COPY: Record<Role, Partial<Record<NotificationCategory, CategoryCopy>>> = {
  customer: {
    orders: {
      label: "Estado de mis pedidos",
      description: "Cuando tu pedido se confirma, está listo, sale en camino, se entrega o se cancela.",
    },
    payments: { label: "Pagos", description: "Cada pago registrado en tus pedidos." },
  },
  admin: {
    orders: { label: "Pedidos", description: "Pedidos nuevos y cancelaciones de clientes." },
    deliveries: {
      label: "Entregas",
      description: "Cada paso que marca un mensajero: recogida, entrega o intento fallido.",
    },
    payments: { label: "Cobros", description: "Cobros registrados por los mensajeros, incluido el contra entrega." },
    stock: { label: "Stock bajo", description: "Cuando un producto baja del mínimo o se agota." },
  },
  courier: {
    deliveries: { label: "Mis entregas", description: "Cuando te asignan, te quitan o se cancela una entrega." },
    payments: { label: "Liquidaciones", description: "Cuando la tienda te paga tus entregas." },
  },
};

/** Texto de una categoría para un rol. Total: toda categoría de
 *  ROLE_CATEGORIES tiene su texto (lo comprueba un test). */
export function categoryCopy(role: Role, category: NotificationCategory): CategoryCopy {
  return CATEGORY_COPY[role][category] ?? { label: category, description: "" };
}

export function hasCategoryCopy(role: Role, category: NotificationCategory): boolean {
  return CATEGORY_COPY[role][category] != null;
}

export const INBOX_HREF: Record<Role, string> = {
  admin: "/admin/notificaciones",
  courier: "/mensajero/notificaciones",
  customer: "/perfil/notificaciones",
};

export function inboxHrefForRole(role: string | null | undefined): string {
  return isRole(role) ? INBOX_HREF[role] : INBOX_HREF.customer;
}

/** Quién lee la bandeja: decide el texto del vacío. */
export type Audience = "customer" | "admin" | "courier";

export function audienceForRole(role: string | null | undefined): Audience {
  return role === "admin" ? "admin" : role === "courier" ? "courier" : "customer";
}

export const EMPTY_COPY: Record<Audience, { title: string; description: string }> = {
  customer: { title: "Sin notificaciones", description: "Aquí verás los avisos sobre tus pedidos y pagos." },
  admin: { title: "Sin notificaciones", description: "Aquí verás pedidos nuevos, entregas, cobros y stock bajo." },
  courier: { title: "Sin notificaciones", description: "Aquí verás tus entregas asignadas y tus liquidaciones." },
};

/** Avisos que trae la campana; la bandeja muestra hasta INBOX_SIZE. */
export const FEED_SIZE = 8;
export const INBOX_SIZE = 50;

/** Aviso tal como viaja al cliente: fechas ISO, sin Date ni enums de Prisma. */
export interface NotificationRow {
  notificationId: number;
  category: NotificationCategory;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationFeed {
  unread: number;
  items: NotificationRow[];
}

export function isNotificationCategory(value: unknown): value is NotificationCategory {
  return typeof value === "string" && (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}
