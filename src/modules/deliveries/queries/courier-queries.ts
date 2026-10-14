import "server-only";
import { db } from "@/lib/db";
import { decimalToNumber } from "@/lib/money";
import type { VehicleType } from "../lib/labels";

export interface CourierRow {
  courierId: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  vehicle: VehicleType;
  notes: string | null;
  /** Pago por entrega completada, en base. */
  deliveryFee: number;
  active: boolean;
  version: number;
  /** Entregas asignadas o en camino ahora mismo. */
  openDeliveries: number;
  deliveredCount: number;
  /** Todas sus entregas, en cualquier estado: con alguna no se puede borrar. */
  deliveryCount: number;
  /** Σ courierFee de entregas completadas aún sin liquidar, en base. */
  pendingFees: number;
}

export async function getCouriers(): Promise<CourierRow[]> {
  const rows = await db.courier.findMany({
    include: {
      user: { select: { fullName: true, email: true } },
      deliveries: { select: { status: true, courierFee: true, courierPaymentId: true } },
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
    deliveryFee: decimalToNumber(row.deliveryFee),
    active: row.active,
    version: row.version,
    openDeliveries: row.deliveries.filter((d) => d.status === "assigned" || d.status === "in_transit").length,
    deliveredCount: row.deliveries.filter((d) => d.status === "delivered").length,
    deliveryCount: row.deliveries.length,
    pendingFees: row.deliveries
      .filter((d) => d.status === "delivered" && d.courierPaymentId == null)
      .reduce((sum, d) => sum + decimalToNumber(d.courierFee), 0),
  }));
}

export interface CourierProfile {
  courierId: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string;
  vehicle: VehicleType;
  /** Pago por entrega completada, en base. */
  deliveryFee: number;
  active: boolean;
  createdAt: string;
}

/** Ficha del mensajero de la sesión, para su página de perfil. null si la
 *  cuenta no tiene perfil de mensajero (p. ej. un admin visitando la app). */
export async function getCourierProfile(userId: number): Promise<CourierProfile | null> {
  const row = await db.courier.findUnique({
    where: { userId },
    include: { user: { select: { fullName: true, email: true } } },
  });
  if (!row) return null;
  return {
    courierId: row.courierId,
    userId: row.userId,
    fullName: row.user.fullName,
    email: row.user.email,
    phone: row.phone,
    vehicle: row.vehicle,
    deliveryFee: decimalToNumber(row.deliveryFee),
    active: row.active,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getActiveCouriers(): Promise<Pick<CourierRow, "courierId" | "fullName" | "vehicle" | "openDeliveries">[]> {
  const rows = await getCouriers();
  return rows.filter((r) => r.active);
}
