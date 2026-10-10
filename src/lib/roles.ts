// Sin imports de DB ni de Prisma: lo usa el middleware (edge).

export type Role = "admin" | "courier" | "customer";

export const ROLES: readonly Role[] = ["admin", "courier", "customer"];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  courier: "Mensajero",
  customer: "Cliente",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Pantalla de inicio de cada rol tras el login o al pisar una ruta ajena. */
export function homeForRole(role: string | null | undefined): string {
  if (role === "admin") return "/admin";
  if (role === "courier") return "/mensajero";
  return "/";
}
