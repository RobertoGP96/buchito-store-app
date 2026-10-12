import "server-only";
import { db } from "@/lib/db";
import type { VehicleType } from "../lib/labels";

export interface CourierRow {
  courierId: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  vehicle: VehicleType;
  notes: string | null;
  active: boolean;
  version: number;
  /** Entregas asignadas o en camino ahora mismo. */
  openDeliveries: number;
  deliveredCount: number;
  /** Todas sus entregas, en cualquier estado: con alguna no se puede borrar. */
  deliveryCount: number;
}

export async function getCouriers(): Promise<CourierRow[]> {
  const rows = await db.courier.findMany({
    include: {
      user: { select: { fullName: true, email: true } },
      deliveries: { select: { status: true } },
    },
    orderBy: { user: { fullName: "asc" } },
  });
  return rows.map((row) => ({
    courierId: row.courierId,
    userId: row.userId,
    fullName: row.user.fullName,
    email: row.user.email,
    phone: row.phone,
    vehicle: row.vehicle,
    notes: row.notes,
    active: row.active,
    version: row.version,
    openDeliveries: row.deliveries.filter((d) => d.status === "assigned" || d.status === "in_transit").length,
    deliveredCount: row.deliveries.filter((d) => d.status === "delivered").length,
    deliveryCount: row.deliveries.length,
  }));
}

export async function getActiveCouriers(): Promise<Pick<CourierRow, "courierId" | "fullName" | "vehicle" | "openDeliveries">[]> {
  const rows = await getCouriers();
  return rows.filter((r) => r.active);
}
