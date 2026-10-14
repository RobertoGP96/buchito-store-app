import { fmt } from "@/lib/format";
import { FULFILLMENT_LABELS, type FulfillmentType } from "@/modules/orders/lib/labels";
import { PAYMENT_STATUS_META, type PaymentStatus } from "@/modules/payments/lib/labels";
import { fmtQty, type SaleUnit } from "@/modules/products/lib/units";
import { KIND_CATEGORY, type NotificationCategory, type NotificationKind } from "./labels";

/* Texto de cada aviso. Puro y total: nunca lanza, porque se ejecuta dentro de
   la transacción de negocio y un fallo aquí la abortaría entera. */

export interface Money {
  amount: number;
  currency: { code: string; decimalPlaces: number };
}

export interface LowStockItem {
  variantId: number;
  productId: number;
  label: string;
  stockAfter: number;
  unit: SaleUnit;
  level: "low" | "out";
}

export type LowStockSource = { type: "order"; orderNo: string } | { type: "manual" };

export type NotificationEvent =
  // Cliente: su pedido y sus pagos.
  | { audience: "customer"; kind: "order_confirmed" | "order_delivered" | "order_delivery_failed"; orderNo: string }
  | { audience: "customer"; kind: "order_ready"; orderNo: string; fulfillment: FulfillmentType }
  | { audience: "customer"; kind: "order_out_for_delivery"; orderNo: string; courierName: string | null }
  | { audience: "customer"; kind: "order_cancelled"; orderNo: string; reason: string | null }
  | { audience: "customer"; kind: "payment_recorded"; orderNo: string; amount: Money; outstanding: Money }
  | { audience: "customer"; kind: "order_paid"; orderNo: string; amount: Money }
  // Admin: lo que pasa en la tienda sin que él lo haga.
  | {
      audience: "admin";
      kind: "order_created";
      orderId: number;
      orderNo: string;
      customerName: string;
      total: Money;
      fulfillment: FulfillmentType;
      zoneName: string | null;
    }
  | { audience: "admin"; kind: "order_cancelled"; orderId: number; orderNo: string; customerName: string; reason: string | null }
  | { audience: "admin"; kind: "delivery_in_transit" | "delivery_delivered"; orderId: number; orderNo: string; courierName: string | null }
  | { audience: "admin"; kind: "delivery_failed"; orderNo: string; courierName: string | null; failedReason: string | null }
  | {
      audience: "admin";
      kind: "payment_recorded";
      orderId: number;
      orderNo: string;
      amount: Money;
      paymentMethodName: string;
      paymentStatus: PaymentStatus;
      origin: "manual" | "cash_on_delivery";
      actorName: string | null;
    }
  | { audience: "admin"; kind: "low_stock"; source: LowStockSource; items: LowStockItem[]; threshold: number }
  // Mensajero: sus entregas y sus pagos.
  | { audience: "courier"; kind: "delivery_assigned"; deliveryId: number; orderNo: string; isRetry: boolean; zoneName: string | null }
  | { audience: "courier"; kind: "delivery_unassigned"; orderNo: string; reassigned: boolean }
  | { audience: "courier"; kind: "delivery_cancelled"; deliveryId: number; orderNo: string }
  | { audience: "courier"; kind: "courier_payment"; amount: Money; deliveryCount: number };

export interface NotificationDraft {
  category: NotificationCategory;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string | null;
}

/** "Camiseta (Roja / M)" o "Camiseta": misma regla que los mensajes de stock del checkout. */
export function stockItemLabel(productName: string, variantName: string | null): string {
  return variantName ? `${productName} (${variantName})` : productName;
}

function money(m: Money): string {
  return fmt(m.amount, m.currency);
}

function customerOrderHref(orderNo: string): string {
  return `/pedido-confirmado/${encodeURIComponent(orderNo)}`;
}

function adminOrderHref(orderId: number): string {
  return `/admin/pedidos/${orderId}`;
}

function courierLabel(name: string | null): string {
  return name?.trim() || "El mensajero";
}

function draft(kind: NotificationKind, title: string, body: string, href: string | null): NotificationDraft {
  return { category: KIND_CATEGORY[kind], kind, title, body, href };
}

function assertNever(value: never): never {
  throw new Error(`Evento de notificación sin texto: ${JSON.stringify(value)}`);
}

function lowStockDraft(event: Extract<NotificationEvent, { kind: "low_stock" }>): NotificationDraft {
  const cause = event.source.type === "order" ? `tras el pedido ${event.source.orderNo}` : "tras un ajuste manual";
  const items = event.items;
  if (items.length === 1) {
    const item = items[0];
    return item.level === "out"
      ? draft("low_stock", `Agotado: ${item.label}`, `Sin existencias ${cause}.`, `/admin/productos/${item.productId}`)
      : draft(
          "low_stock",
          `Stock bajo: ${item.label}`,
          `Quedan ${fmtQty(item.stockAfter, item.unit)} ${cause} (mínimo ${event.threshold}).`,
          `/admin/productos/${item.productId}`
        );
  }
  const allOut = items.every((i) => i.level === "out");
  const shown = items.slice(0, 3).map((i) => i.label).join(", ");
  const rest = items.length > 3 ? ` y ${items.length - 3} más` : "";
  return draft(
    "low_stock",
    allOut ? `${items.length} productos agotados` : `${items.length} productos con stock bajo`,
    `${shown}${rest} ${cause}.`,
    "/admin/inventario?low=1"
  );
}

function customerDraft(event: Extract<NotificationEvent, { audience: "customer" }>): NotificationDraft {
  const href = customerOrderHref(event.orderNo);
  const no = event.orderNo;
  switch (event.kind) {
    case "order_confirmed":
      return draft(event.kind, `Pedido ${no} confirmado`, "Ya lo estamos preparando. Te avisaremos cuando esté listo.", href);
    case "order_ready":
      return event.fulfillment === "pickup"
        ? draft(event.kind, `Pedido ${no} listo para recoger`, "Pásate por la tienda cuando quieras.", href)
        : draft(event.kind, `Pedido ${no} listo`, "Pronto saldrá en camino con un mensajero.", href);
    case "order_out_for_delivery":
      return draft(
        event.kind,
        `Pedido ${no} en camino`,
        event.courierName?.trim() ? `${event.courierName.trim()} ya salió con tu pedido.` : "El mensajero ya salió con tu pedido.",
        href
      );
    case "order_delivered":
      return draft(event.kind, `Pedido ${no} entregado`, "Gracias por tu compra.", href);
    case "order_delivery_failed":
      return draft(
        event.kind,
        `No pudimos entregar ${no}`,
        "Te avisaremos en cuanto haya novedades. Si quieres, contáctanos para coordinar la entrega.",
        href
      );
    case "order_cancelled":
      return draft(
        event.kind,
        `Pedido ${no} cancelado`,
        event.reason?.trim() ? `Motivo: ${event.reason.trim()}` : "Si tienes dudas, contáctanos.",
        href
      );
    case "payment_recorded":
      return draft(
        event.kind,
        `Pago registrado en ${no}`,
        `Recibimos ${money(event.amount)}. Pendiente: ${money(event.outstanding)}.`,
        href
      );
    case "order_paid":
      return draft(
        event.kind,
        `Pedido ${no} pagado`,
        `Recibimos ${money(event.amount)}. Tu pedido queda pagado por completo.`,
        href
      );
    default:
      return assertNever(event);
  }
}

function adminDraft(event: Extract<NotificationEvent, { audience: "admin" }>): NotificationDraft {
  switch (event.kind) {
    case "order_created": {
      const zone = event.zoneName ? ` (${event.zoneName})` : "";
      return draft(
        event.kind,
        `Nuevo pedido ${event.orderNo}`,
        `${event.customerName} · ${money(event.total)} · ${FULFILLMENT_LABELS[event.fulfillment]}${zone}`,
        adminOrderHref(event.orderId)
      );
    }
    case "order_cancelled":
      return draft(
        event.kind,
        `${event.orderNo} cancelado por el cliente`,
        `${event.customerName} · ${event.reason?.trim() ? `Motivo: ${event.reason.trim()}` : "Sin motivo indicado. El stock ya se repuso."}`,
        adminOrderHref(event.orderId)
      );
    case "delivery_in_transit":
      return draft(
        event.kind,
        `${event.orderNo} en camino`,
        `${courierLabel(event.courierName)} recogió el pedido.`,
        adminOrderHref(event.orderId)
      );
    case "delivery_delivered":
      return draft(
        event.kind,
        `${event.orderNo} entregado`,
        `${courierLabel(event.courierName)} completó la entrega.`,
        adminOrderHref(event.orderId)
      );
    case "delivery_failed":
      return draft(
        event.kind,
        `Entrega fallida: ${event.orderNo}`,
        `${courierLabel(event.courierName)}: ${event.failedReason?.trim() || "sin motivo"}. Reasigna la entrega.`,
        "/admin/entregas?status=failed"
      );
    case "payment_recorded":
      return draft(
        event.kind,
        event.origin === "cash_on_delivery" ? `Cobro contra entrega en ${event.orderNo}` : `Cobro registrado en ${event.orderNo}`,
        `${courierLabel(event.actorName)} registró ${money(event.amount)} (${event.paymentMethodName}). Estado: ${PAYMENT_STATUS_META[event.paymentStatus].label}.`,
        adminOrderHref(event.orderId)
      );
    case "low_stock":
      return lowStockDraft(event);
    default:
      return assertNever(event);
  }
}

function courierDraft(event: Extract<NotificationEvent, { audience: "courier" }>): NotificationDraft {
  switch (event.kind) {
    case "delivery_assigned":
      return draft(
        event.kind,
        event.isRetry ? `Reintento de entrega: ${event.orderNo}` : `Nueva entrega: ${event.orderNo}`,
        `Toca para ver la dirección y el teléfono.${event.zoneName ? ` Zona: ${event.zoneName}.` : ""}`,
        `/mensajero/entregas/${event.deliveryId}`
      );
    case "delivery_unassigned":
      return draft(
        event.kind,
        `Entrega ${event.orderNo} retirada`,
        event.reassigned ? "Pasó a otro mensajero." : "El administrador la desasignó. Ya no está en tu lista.",
        "/mensajero"
      );
    case "delivery_cancelled":
      return draft(
        event.kind,
        `Entrega ${event.orderNo} cancelada`,
        "El pedido fue cancelado. No hace falta entregarlo.",
        `/mensajero/entregas/${event.deliveryId}`
      );
    case "courier_payment":
      return draft(
        event.kind,
        `Pago recibido: ${money(event.amount)}`,
        `Liquidación de ${event.deliveryCount} ${event.deliveryCount === 1 ? "entrega" : "entregas"}.`,
        "/mensajero/ganancias"
      );
    default:
      return assertNever(event);
  }
}

export function buildNotification(event: NotificationEvent): NotificationDraft {
  switch (event.audience) {
    case "customer":
      return customerDraft(event);
    case "admin":
      return adminDraft(event);
    case "courier":
      return courierDraft(event);
    default:
      return assertNever(event);
  }
}
