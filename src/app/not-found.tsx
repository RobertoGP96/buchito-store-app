import { PackageSearch } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <EmptyState
        icon={PackageSearch}
        eyebrow="Error 404"
        title="No encontramos esta página"
        description="La página que buscas no existe o ya no está disponible."
        ctaLabel="Ir al inicio"
        ctaHref="/"
      />
    </div>
  );
}
