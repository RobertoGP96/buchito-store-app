import "server-only";
import { db } from "@/lib/db";
import { decimalToNullableNumber, decimalToNumber } from "@/lib/money";

export interface ZoneRow {
  zoneId: number;
  name: string;
  description: string | null;
  /** En moneda base. */
  fee: number;
  freeShippingThreshold: number | null;
  etaLabel: string | null;
  sortOrder: number;
  active: boolean;
  orderCount: number;
  deliveryCount: number;
  /** Direcciones de clientes asignadas a la zona (quedan sin zona al borrarla). */
  addressCount: number;
}

function toRow(row: {
  zoneId: number;
  name: string;
  description: string | null;
  fee: unknown;
  freeShippingThreshold: unknown;
  etaLabel: string | null;
  sortOrder: number;
  active: boolean;
  _count?: { orders: number; deliveries: number; addresses: number };
}): ZoneRow {
  return {
    zoneId: row.zoneId,
    name: row.name,
    description: row.description,
    fee: decimalToNumber(row.fee as never),
    freeShippingThreshold: decimalToNullableNumber(row.freeShippingThreshold as never),
    etaLabel: row.etaLabel,
    sortOrder: row.sortOrder,
    active: row.active,
    orderCount: row._count?.orders ?? 0,
    deliveryCount: row._count?.deliveries ?? 0,
    addressCount: row._count?.addresses ?? 0,
  };
}

export async function getZones(): Promise<ZoneRow[]> {
  const rows = await db.deliveryZone.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { orders: true, deliveries: true, addresses: true } } },
  });
  return rows.map(toRow);
}

export async function getActiveZones(): Promise<ZoneRow[]> {
  const rows = await db.deliveryZone.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(toRow);
}
