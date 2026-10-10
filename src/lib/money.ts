import type { Prisma } from "@/generated/prisma";

/** Prisma.Decimal nunca viaja al cliente: se convierte aquí, en la frontera. */
export function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return value.toNumber();
}

export function decimalToNullableNumber(
  value: Prisma.Decimal | number | string | null | undefined
): number | null {
  if (value == null) return null;
  return decimalToNumber(value);
}
