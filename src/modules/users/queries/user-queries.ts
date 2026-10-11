import "server-only";
import { db } from "@/lib/db";
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
  }));
}
