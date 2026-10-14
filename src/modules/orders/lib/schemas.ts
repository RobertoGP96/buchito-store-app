import { z } from "zod";
import { recipientSchema } from "@/modules/recipients/lib/schemas";
import { ORDER_STATUSES } from "./labels";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

const idOrEmpty = z
  .union([z.literal(""), z.null(), z.coerce.number().int().positive()])
  .transform((v) => (v === "" ? null : v))
  .nullable();

/** Copia del destinatario guardada en `Order.deliveryAddress`: el cliente
 *  puede editar o borrar el destinatario después y el pedido no cambia. Los
 *  pedidos anteriores a los destinatarios no traen nombre ni teléfono; quien
 *  lee cae al cliente del pedido. */
export type DeliveryAddress = {
  recipientName?: string | null;
  recipientPhone?: string | null;
  line1: string;
  line2: string | null;
  neighborhood: string | null;
  reference: string | null;
};

/** Destinatario escrito en el propio checkout: su zona es la del pedido y
 *  nace principal solo si es el primero del cliente. */
export const newRecipientSchema = recipientSchema.omit({ zoneId: true, isDefault: true });

/** Lo que manda el cliente al crear el pedido. Sus datos (nombre, teléfono)
 *  no viajan: salen de su ficha. Precios y totales tampoco: el servidor los
 *  recalcula desde DB con las tasas vigentes. */
export const createOrderSchema = z
  .object({
    fulfillment: z.enum(["delivery", "pickup"]),
    zoneId: idOrEmpty,
    /** Destinatario guardado; vacío cuando se escribe uno nuevo. */
    recipientId: idOrEmpty,
    newRecipient: newRecipientSchema.nullable(),
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
  .refine((v) => v.fulfillment === "pickup" || v.zoneId != null, {
    message: "Elige la zona de entrega",
    path: ["zoneId"],
  })
  .refine((v) => v.fulfillment === "pickup" || (v.recipientId != null) !== (v.newRecipient != null), {
    message: "Elige un destinatario o añade uno nuevo",
    path: ["recipientId"],
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
