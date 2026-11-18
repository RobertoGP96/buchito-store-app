import { Coins, Truck, Wallet, type LucideIcon } from "lucide-react";

interface Benefit {
  icon: LucideIcon;
  title: string;
  description: string;
}

const BENEFITS: Benefit[] = [
  { icon: Truck, title: "Entrega a domicilio", description: "Sigues tu pedido paso a paso hasta la puerta." },
  { icon: Coins, title: "Precios en tu moneda", description: "Con la tasa del día siempre a la vista." },
  { icon: Wallet, title: "Varias formas de pago", description: "Eliges método y moneda al confirmar." },
];

/** Franja de promesas bajo el hero: lo que distingue a la tienda, dicho una
 *  vez. En móvil solo el título, en tres columnas; la descripción desde `sm`. */
export function BenefitsStrip() {
  return (
    <ul className="grid grid-cols-3 divide-x divide-line rounded-card bg-canvas shadow-card">
      {BENEFITS.map(({ icon: Icon, title, description }) => (
        <li
          key={title}
          className="flex flex-col items-center gap-2 px-2 py-3.5 text-center sm:flex-row sm:items-center sm:gap-3.5 sm:px-5 sm:py-4 sm:text-left"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-field bg-crema-100 text-tostado-700 sm:h-11 sm:w-11">
            <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="type-caption block leading-tight font-semibold text-balance text-ink sm:type-body">
              {title}
            </span>
            <span className="type-caption mt-0.5 hidden text-pretty text-ink-muted sm:block">{description}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
