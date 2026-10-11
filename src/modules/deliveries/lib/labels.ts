import type { StatusMeta } from "@/components/status-chip";

export type DeliveryStatus = "pending" | "assigned" | "in_transit" | "delivered" | "failed" | "cancelled";
export type VehicleType = "bicycle" | "motorcycle" | "car" | "on_foot";

export const DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  "pending",
  "assigned",
  "in_transit",
  "delivered",
  "failed",
  "cancelled",
];

export const DELIVERY_STATUS_META: Record<DeliveryStatus, StatusMeta> = {
  pending: { label: "Sin asignar", tone: "warning" },
  assigned: { label: "Asignada", tone: "info" },
  in_transit: { label: "En camino", tone: "info" },
  delivered: { label: "Entregada", tone: "success" },
  failed: { label: "Fallida", tone: "danger" },
  cancelled: { label: "Cancelada", tone: "neutral" },
};

export const VEHICLE_TYPES: readonly VehicleType[] = ["motorcycle", "bicycle", "car", "on_foot"];

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  bicycle: "Bicicleta",
  motorcycle: "Moto",
  car: "Auto",
  on_foot: "A pie",
};

export const DELIVERY_TRANSITION_LABELS: Record<DeliveryStatus, string> = {
  pending: "Desasignar",
  assigned: "Asignar mensajero",
  in_transit: "Recogí el pedido",
  delivered: "Entregado",
  failed: "No se pudo entregar",
  cancelled: "Cancelar entrega",
};
