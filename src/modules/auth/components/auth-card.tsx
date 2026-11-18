import Link from "next/link";
import { Check } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

interface AuthCardProps {
  eyebrow: string;
  title: string;
  description: string;
  footer: { text: string; linkLabel: string; href: string };
  children: React.ReactNode;
}

const PERKS = [
  "Tus pedidos y su seguimiento, en un solo lugar.",
  "Destinatarios guardados para comprar más rápido.",
  "Precios en tu moneda con la tasa del día.",
];

/** Marco común de login y registro: banda crema a sangre con el formulario en
 *  card y, desde `md`, un panel de marca al lado. Vive dentro del layout de la
 *  tienda (misma barra y mismo carrito); solo cambia el fondo. */
export function AuthCard({ eyebrow, title, description, footer, children }: AuthCardProps) {
  return (
    // La banda sube bajo la barra café, igual que el hero de la portada.
    <div className="-mt-7 flex flex-1 flex-col bg-cream pt-7">
      <div className="mx-auto grid w-full max-w-[1000px] flex-1 items-center gap-8 px-5 pt-10 pb-14 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:gap-12 md:px-6 md:py-16">
        <aside className="relative hidden self-stretch overflow-hidden rounded-sheet bg-brand-tile p-10 text-brand-tile-fg shadow-float md:flex md:flex-col md:justify-between">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-brand-tile-fg/8"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-brand-tile-fg/5"
          />
          <div className="on-brand relative">
            <BrandLogo tone="on-brand" />
          </div>
          <div className="relative mt-12">
            <p className="font-display text-[34px] leading-[1.08] text-balance">Compra fácil y recíbelo en casa.</p>
            <ul className="type-body mt-7 flex flex-col gap-3 text-brand-tile-fg/90">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-tile-fg/15">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="mx-auto w-full max-w-[440px]">
          <div className="flex justify-center md:hidden">
            <BrandLogo variant="stacked" />
          </div>
          <div className="mt-8 rounded-card bg-canvas p-6 shadow-card md:mt-0 md:p-8">
            <p className="eyebrow text-tostado-700">{eyebrow}</p>
            <h1 className="font-display type-title mt-2 text-espresso-900">{title}</h1>
            <p className="type-body mt-2 text-ink-muted">{description}</p>
            <div className="mt-6">{children}</div>
          </div>
          <p className="type-meta mt-6 text-center text-ink-muted">
            {footer.text}{" "}
            <Link href={footer.href} className="font-semibold text-tostado-700 hover:underline">
              {footer.linkLabel}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
