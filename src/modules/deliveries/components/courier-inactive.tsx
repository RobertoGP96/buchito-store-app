import { UserX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

/** Cuenta con rol mensajero pero sin perfil activo: todas las vistas de la
 *  app muestran lo mismo en lugar de datos vacíos. */
export function CourierInactive() {
  return (
    <div className="rounded-card bg-canvas shadow-card">
      <EmptyState
        icon={UserX}
        title="Tu cuenta de mensajero no está activa"
        description="Pide al administrador que active tu perfil de mensajero para ver tus entregas."
        size="compact"
      />
    </div>
  );
}
