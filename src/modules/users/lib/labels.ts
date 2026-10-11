import type { StatusTone } from "@/components/status-chip";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/roles";

// Unión propia (no el enum de Prisma) para que viaje a componentes cliente.
export type UserRole = Role;

export const USER_ROLES: readonly UserRole[] = ROLES;

/** Roles que se asignan desde Usuarios; los mensajeros nacen en Mensajeros. */
export const ASSIGNABLE_ROLES: readonly UserRole[] = ["admin", "customer"];

export const USER_ROLE_LABELS: Record<UserRole, string> = ROLE_LABELS;

export const USER_ROLE_TONE: Record<UserRole, StatusTone> = {
  admin: "info",
  courier: "warning",
  customer: "neutral",
};

export const COURIER_MANAGED_MESSAGE = "Los mensajeros se dan de alta y se editan en Mensajeros.";
