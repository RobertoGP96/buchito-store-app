import "server-only";
import { db } from "@/lib/db";
import type { TwoFactorMethod } from "@/modules/auth/lib/two-factor-labels";
import type { UserRole } from "../lib/labels";

export interface UserRow {
  userId: number;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  /** Tiene perfil de mensajero: su rol se gestiona en Mensajeros. */
  hasCourierProfile: boolean;
  /** Método 2FA activo; null si no lo tiene (un alta a medias cuenta como no). */
  twoFactorMethod: TwoFactorMethod | null;
}

export async function getUsers(): Promise<UserRow[]> {
  const rows = await db.user.findMany({
    orderBy: [{ role: "asc" }, { fullName: "asc" }],
    select: {
      userId: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      courier: { select: { courierId: true } },
      // Solo método y estado: el secreto y los hashes nunca salen de aquí.
      twoFactor: { select: { method: true, enabledAt: true } },
    },
  });
  return rows.map((u) => ({
    userId: u.userId,
    fullName: u.fullName,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    hasCourierProfile: u.courier !== null,
    twoFactorMethod: u.twoFactor?.enabledAt ? u.twoFactor.method : null,
  }));
}
