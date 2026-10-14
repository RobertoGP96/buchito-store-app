import { describe, expect, it } from "vitest";
import { buildNotification, stockItemLabel, type Money, type NotificationEvent } from "./build-notification";
import { KIND_CATEGORY, NOTIFICATION_CATEGORIES, ROLE_CATEGORIES, hasCategoryCopy } from "./labels";

const CUP = { code: "CUP", decimalPlaces: 0 };
const USD = { code: "USD", decimalPlaces: 2 };
const m = (amount: number, currency = CUP): Money => ({ amount, currency });

const ALL_EVENTS: NotificationEvent[] = [
  { audience: "customer", kind: "order_confirmed", orderNo: "PED-00012" },
  { audience: "customer", kind: "order_ready", orderNo: "PED-00012", fulfillment: "delivery" },
  { audience: "customer", kind: "order_out_for_delivery", orderNo: "PED-00012", courierName: "Ana" },
  { audience: "customer", kind: "order_delivered", orderNo: "PED-00012" },
  { audience: "customer", kind: "order_delivery_failed", orderNo: "PED-00012" },
  { audience: "customer", kind: "order_cancelled", orderNo: "PED-00012", reason: null },
  { audience: "customer", kind: "payment_recorded", orderNo: "PED-00012", amount: m(1000), outstanding: m(3750) },
  { audience: "customer", kind: "order_paid", orderNo: "PED-00012", amount: m(4750) },
  {
    audience: "admin",
    kind: "order_created",
    orderId: 12,
    orderNo: "PED-00012",
    customerName: "Cliente Demo",
    total: m(4750),
    fulfillment: "delivery",
    zoneName: "Centro",
  },
  { audience: "admin", kind: "order_cancelled", orderId: 12, orderNo: "PED-00012", customerName: "Cliente Demo", reason: null },
  { audience: "admin", kind: "delivery_in_transit", orderId: 12, orderNo: "PED-00012", courierName: "Ana" },
  { audience: "admin", kind: "delivery_delivered", orderId: 12, orderNo: "PED-00012", courierName: "Ana" },
  { audience: "admin", kind: "delivery_failed", orderNo: "PED-00012", courierName: "Ana", failedReason: "No había nadie" },
  {
    audience: "admin",
    kind: "payment_recorded",
    orderId: 12,
    orderNo: "PED-00012",
    amount: m(4750),
    paymentMethodName: "Efectivo CUP",
    paymentStatus: "paid",
    origin: "cash_on_delivery",
    actorName: "Ana",
  },
  {
    audience: "admin",
    kind: "low_stock",
    source: { type: "manual" },
    items: [{ variantId: 1, productId: 3, label: "Arroz", stockAfter: 2, unit: "unit", level: "low" }],
    threshold: 5,
  },
  { audience: "courier", kind: "delivery_assigned", deliveryId: 7, orderNo: "PED-00012", isRetry: false, zoneName: "Centro" },
  { audience: "courier", kind: "delivery_unassigned", orderNo: "PED-00012", reassigned: false },
  { audience: "courier", kind: "delivery_cancelled", deliveryId: 7, orderNo: "PED-00012" },
  { audience: "courier", kind: "courier_payment", amount: m(1500), deliveryCount: 3 },
];

describe("buildNotification", () => {
  it("produce título y cuerpo para todos los tipos con su categoría", () => {
    const kinds = new Set<string>();
    for (const event of ALL_EVENTS) {
      const d = buildNotification(event);
      expect(d.title.length).toBeGreaterThan(0);
      expect(d.body.length).toBeGreaterThan(0);
      expect(d.category).toBe(KIND_CATEGORY[d.kind]);
      kinds.add(d.kind);
    }
    expect(kinds.size).toBe(Object.keys(KIND_CATEGORY).length);
  });

  it("enlaza al cliente a su pedido con el número codificado", () => {
    const d = buildNotification({ audience: "customer", kind: "order_confirmed", orderNo: "PED 1/2" });
    expect(d.href).toBe("/pedido-confirmado/PED%201%2F2");
    expect(d.title).toBe("Pedido PED 1/2 confirmado");
  });

  it("distingue recogida y domicilio al estar listo", () => {
    const pickup = buildNotification({ audience: "customer", kind: "order_ready", orderNo: "P-1", fulfillment: "pickup" });
    const delivery = buildNotification({ audience: "customer", kind: "order_ready", orderNo: "P-1", fulfillment: "delivery" });
    expect(pickup.title).toBe("Pedido P-1 listo para recoger");
    expect(delivery.title).toBe("Pedido P-1 listo");
  });

  it("nombra al mensajero en camino solo si lo hay", () => {
    expect(
      buildNotification({ audience: "customer", kind: "order_out_for_delivery", orderNo: "P-1", courierName: "Ana" }).body
    ).toBe("Ana ya salió con tu pedido.");
    expect(
      buildNotification({ audience: "customer", kind: "order_out_for_delivery", orderNo: "P-1", courierName: null }).body
    ).toBe("El mensajero ya salió con tu pedido.");
  });

  it("muestra el motivo de cancelación al cliente", () => {
    expect(buildNotification({ audience: "customer", kind: "order_cancelled", orderNo: "P-1", reason: " Sin stock " }).body).toBe(
      "Motivo: Sin stock"
    );
    expect(buildNotification({ audience: "customer", kind: "order_cancelled", orderNo: "P-1", reason: "" }).body).toBe(
      "Si tienes dudas, contáctanos."
    );
  });

  it("formatea montos con la moneda", () => {
    const d = buildNotification({
      audience: "customer",
      kind: "payment_recorded",
      orderNo: "P-1",
      amount: m(1000),
      outstanding: m(3750),
    });
    expect(d.body).toBe("Recibimos 1 000 CUP. Pendiente: 3 750 CUP.");
    expect(buildNotification({ audience: "customer", kind: "order_paid", orderNo: "P-1", amount: m(50, USD) }).body).toContain(
      "50.00 USD"
    );
  });

  it("resume el pedido nuevo para el admin", () => {
    const d = buildNotification(ALL_EVENTS[8]);
    expect(d.title).toBe("Nuevo pedido PED-00012");
    expect(d.body).toBe("Cliente Demo · 4 750 CUP · Entrega a domicilio (Centro)");
    expect(d.href).toBe("/admin/pedidos/12");
  });

  it("manda la entrega fallida a la lista para reasignar", () => {
    const d = buildNotification(ALL_EVENTS[12]);
    expect(d.href).toBe("/admin/entregas?status=failed");
    expect(d.body).toBe("Ana: No había nadie. Reasigna la entrega.");
  });

  it("la entrega completada no repite el importe del cobro", () => {
    expect(buildNotification(ALL_EVENTS[11]).body).toBe("Ana completó la entrega.");
  });

  it("titula distinto el cobro contra entrega y el manual", () => {
    const cod = buildNotification(ALL_EVENTS[13]);
    expect(cod.title).toBe("Cobro contra entrega en PED-00012");
    expect(cod.body).toBe("Ana registró 4 750 CUP (Efectivo CUP). Estado: Pagado.");
    const manual = buildNotification({ ...(ALL_EVENTS[13] as Extract<NotificationEvent, { kind: "payment_recorded"; audience: "admin" }>), origin: "manual" });
    expect(manual.title).toBe("Cobro registrado en PED-00012");
  });

  it("avisa de stock bajo o agotado de una variante con enlace al producto", () => {
    const low = buildNotification({
      audience: "admin",
      kind: "low_stock",
      source: { type: "order", orderNo: "PED-00012" },
      items: [{ variantId: 1, productId: 3, label: "Camiseta (Roja / M)", stockAfter: 3, unit: "unit", level: "low" }],
      threshold: 5,
    });
    expect(low.title).toBe("Stock bajo: Camiseta (Roja / M)");
    expect(low.body).toBe("Quedan 3 ud tras el pedido PED-00012 (mínimo 5).");
    expect(low.href).toBe("/admin/productos/3");

    const out = buildNotification({
      audience: "admin",
      kind: "low_stock",
      source: { type: "manual" },
      items: [{ variantId: 1, productId: 3, label: "Arroz", stockAfter: 0, unit: "kg", level: "out" }],
      threshold: 5,
    });
    expect(out.title).toBe("Agotado: Arroz");
    expect(out.body).toBe("Sin existencias tras un ajuste manual.");
  });

  it("agrupa varias variantes en un aviso que lleva al inventario", () => {
    const items = ["A", "B", "C", "D", "E"].map((label, i) => ({
      variantId: i,
      productId: i,
      label,
      stockAfter: 0,
      unit: "unit" as const,
      level: "out" as const,
    }));
    const all = buildNotification({ audience: "admin", kind: "low_stock", source: { type: "order", orderNo: "P-1" }, items, threshold: 5 });
    expect(all.title).toBe("5 productos agotados");
    expect(all.body).toBe("A, B, C y 2 más tras el pedido P-1.");
    expect(all.href).toBe("/admin/inventario?low=1");

    const mixed = buildNotification({
      audience: "admin",
      kind: "low_stock",
      source: { type: "manual" },
      items: [items[0], { ...items[1], level: "low", stockAfter: 2 }],
      threshold: 5,
    });
    expect(mixed.title).toBe("2 productos con stock bajo");
  });

  it("textos del mensajero", () => {
    expect(buildNotification(ALL_EVENTS[15]).title).toBe("Nueva entrega: PED-00012");
    expect(buildNotification(ALL_EVENTS[15]).href).toBe("/mensajero/entregas/7");
    expect(
      buildNotification({ audience: "courier", kind: "delivery_assigned", deliveryId: 7, orderNo: "P-1", isRetry: true, zoneName: null })
    ).toMatchObject({ title: "Reintento de entrega: P-1", body: "Toca para ver la dirección y el teléfono." });
    expect(buildNotification(ALL_EVENTS[16]).href).toBe("/mensajero");
    expect(buildNotification({ audience: "courier", kind: "delivery_unassigned", orderNo: "P-1", reassigned: true }).body).toBe(
      "Pasó a otro mensajero."
    );
    expect(buildNotification(ALL_EVENTS[18])).toMatchObject({
      title: "Pago recibido: 1 500 CUP",
      body: "Liquidación de 3 entregas.",
      href: "/mensajero/ganancias",
    });
    expect(buildNotification({ audience: "courier", kind: "courier_payment", amount: m(500), deliveryCount: 1 }).body).toBe(
      "Liquidación de 1 entrega."
    );
  });
});

describe("stockItemLabel", () => {
  it("añade la variante entre paréntesis", () => {
    expect(stockItemLabel("Camiseta", "Roja / M")).toBe("Camiseta (Roja / M)");
    expect(stockItemLabel("Arroz", null)).toBe("Arroz");
  });
});

describe("textos de categorías", () => {
  it("toda categoría de cada rol tiene texto", () => {
    for (const [role, categories] of Object.entries(ROLE_CATEGORIES)) {
      for (const c of categories) expect(hasCategoryCopy(role as keyof typeof ROLE_CATEGORIES, c)).toBe(true);
    }
    expect(NOTIFICATION_CATEGORIES).toHaveLength(4);
  });
});
