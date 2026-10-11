import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  /** Enlace "ver todo" a la pantalla completa del módulo. */
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
  className?: string;
}

/** Card del panel: eyebrow + enlace opcional a la sección completa. */
export function DashboardCard({ title, href, hrefLabel = "Ver todo", children, className }: DashboardCardProps) {
  return (
    <section className={cn("flex flex-col rounded-card bg-canvas p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{title}</p>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-navy-700 hover:text-navy-600"
          >
            {hrefLabel}
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        )}
      </div>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </section>
  );
}
