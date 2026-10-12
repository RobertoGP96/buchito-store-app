import { z } from "zod";
import { isValidPhone } from "@/lib/phone";
import { ORDER_STATUSES } from "./labels";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

export const deliveryAddressSchema = z.object({
  line1: z.string().trim().min(3, "Escribe la dirección"),
  line2: optionalText,
  neighborhood: optionalText,
  city: z.string().trim().min(2, "Escribe la ciudad"),
  reference: optionalText,
});

export type DeliveryAddress = z.output<typeof deliveryAddressSchema>;

/** Lo que manda el cliente al crear el pedido. Precios y totales NO viajan:
 *  el servidor los recalcula desde DB con las tasas vigentes. */
export const createOrderSchema = z
  .object({
    customerName: z.string().trim().min(2, "Escribe tu nombre"),
    customerPhone: z.string().trim().refine(isValidPhone, "Escribe un teléfono válido"),
    customerEmail: optionalText,
    fulfillment: z.enum(["delivery", "pickup"]),
    zoneId: z
      .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
      .transform((v) => (v === "" ? null : v))
      .nullable(),
    address: deliveryAddressSchema.nullable(),
    paymentMethodId: z.coerce.number().int().positive("Elige cómo vas a pagar"),
    paymentReference: optionalText,
    couponCode: optionalText,
    notes: optionalText,
    lines: z
      .array(
        z.object({
          variantId: z.number().int().positive(),
          // En la unidad de la variante; el servidor comprueba el paso.
          qty: z.number().positive().max(9999),
        })
      )
      .default([]),
    combos: z
      .array(
        z.object({
          comboId: z.number().int().positive(),
          qty: z.number().int().positive().max(999),
        })
      )
      .default([]),
  })
  .refine((v) => v.lines.length + v.combos.length > 0, { message: "El carrito está vacío", path: ["lines"] })
  .refine((v) => v.fulfillment === "pickup" || v.address != null, {
    message: "Escribe la dirección de entrega",
    path: ["address"],
  })
  .refine((v) => v.fulfillment === "pickup" || v.zoneId != null, {
    message: "Elige la zona de entrega",
    path: ["zoneId"],
  });

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type CreateOrderValues = z.output<typeof createOrderSchema>;

export const transitionOrderSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  version: z.coerce.number().int().min(0),
  to: z.enum(ORDER_STATUSES),
  reason: optionalText,
});

export type TransitionOrderInput = z.input<typeof transitionOrderSchema>;
