import { z } from "zod";
import { isValidPhone } from "@/lib/phone";
import { DELIVERY_STATUSES, VEHICLE_TYPES } from "./labels";

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .nullable();

export const zoneSchema = z.object({
  name: z.string().trim().min(2, "Escribe el nombre"),
  description: optionalText,
  fee: z.coerce.number().min(0, "No puede ser negativo"),
  freeShippingThreshold: z
    .union([z.literal(""), z.null(), z.coerce.number().min(0, "No puede ser negativo")])
    .transform((v) => (v === "" ? null : v)),
  etaLabel: optionalText,
  sortOrder: z.coerce.number().int().min(0).default(0),
  active: z.boolean().default(true),
});

export type ZoneInput = z.input<typeof zoneSchema>;
export type ZoneValues = z.output<typeof zoneSchema>;

export const courierSchema = z.object({
  fullName: z.string().trim().min(2, "Escribe el nombre"),
  email: z.string().trim().toLowerCase().email("Escribe un correo válido"),
  /** Solo al crear; al editar se ignora si viene vacío. */
  password: z.string().optional(),
  phone: z.string().trim().refine(isValidPhone, "Escribe un teléfono válido"),
  vehicle: z.enum(VEHICLE_TYPES),
  notes: optionalText,
  /** Pago por entrega completada, en moneda base. */
  deliveryFee: z
    .union([z.literal(""), z.null(), z.coerce.number().min(0, "No puede ser negativo")])
    .transform((v) => (v === "" || v == null ? 0 : v)),
  active: z.boolean().default(true),
});

export type CourierInput = z.input<typeof courierSchema>;
export type CourierValues = z.output<typeof courierSchema>;

/** Liquidación al mensajero: salda todas sus entregas completadas pendientes. */
export const courierPaymentSchema = z.object({
  courierId: z.coerce.number().int().positive("Elige el mensajero"),
  amountBase: z.coerce.number({ message: "Escribe el monto" }).positive("El monto debe ser mayor que cero"),
  notes: optionalText,
});

export type CourierPaymentInput = z.input<typeof courierPaymentSchema>;
export type CourierPaymentValues = z.output<typeof courierPaymentSchema>;

export const assignCourierSchema = z.object({
  deliveryId: z.coerce.number().int().positive(),
  version: z.coerce.number().int().min(0),
  courierId: z.coerce.number().int().positive("Elige un mensajero"),
});

export type AssignCourierInput = z.input<typeof assignCourierSchema>;

export const transitionDeliverySchema = z.object({
  deliveryId: z.coerce.number().int().positive(),
  version: z.coerce.number().int().min(0),
  to: z.enum(DELIVERY_STATUSES),
  failedReason: optionalText,
  proofPhotoUrl: optionalText,
  /** Cobro contra entrega: monto en la moneda del método de pago del pedido. */
  amountCollected: z
    .union([z.literal(""), z.null(), z.coerce.number().min(0)])
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  note: optionalText,
});

export type TransitionDeliveryInput = z.input<typeof transitionDeliverySchema>;
