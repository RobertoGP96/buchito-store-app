import "server-only";
import type { DbOrTx } from "@/lib/currency";
import { decimalToNumber } from "@/lib/money";

/** Combo tal como lo necesita `createOrder`: precio en su moneda original y
 *  componentes con cantidades. La conversión a base y la disponibilidad las
 *  resuelve la action con las variantes leídas en la misma transacción. */
export interface OrderComboRow {
  comboId: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  origPrice: number;
  priceCurrencyId: number;
  items: { variantId: number; qty: number }[];
}

/** Combos vendibles ahora (publicados y dentro de sus fechas). Los que no
 *  existen o no se venden no aparecen: la action decide el error. */
export async function getOrderCombos(client: DbOrTx, comboIds: number[], now: Date): Promise<Map<number, OrderComboRow>> {
  if (comboIds.length === 0) return new Map();
  const rows = await client.combo.findMany({
    where: {
      comboId: { in: comboIds },
      status: "active",
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    include: { items: { orderBy: { sortOrder: "asc" }, select: { variantId: true, qty: true } } },
  });
  return new Map(
    rows.map((row) => [
      row.comboId,
      {
        comboId: row.comboId,
        name: row.name,
        slug: row.slug,
        imageUrl: row.imageUrl,
        origPrice: decimalToNumber(row.price),
        priceCurrencyId: row.priceCurrencyId,
        items: row.items,
      },
    ])
  );
}
