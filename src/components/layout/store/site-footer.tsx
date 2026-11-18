"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { STORE_NAME } from "@/lib/config";
import { BOTTOM_NAV_CLEARANCE, isBottomNavVisible } from "@/lib/store-nav";
import { cn } from "@/lib/utils";

interface FooterColumn {
  title: string;
  links: { href: string; label: string }[];
}

// Solo rutas que existen: un enlace a una página inventada es un 404 servido
// desde el footer de todas las pantallas.
const COLUMNS: FooterColumn[] = [
  {
    title: "Tienda",
    links: [
      { href: "/catalogo", label: "Catálogo" },
      { href: "/combos", label: "Combos" },
      { href: "/ofertas", label: "Ofertas" },
      { href: "/pagos", label: "Formas de pago" },
      { href: "/carrito", label: "Carrito de compra" },
    ],
  },
  {
    title: "Cuenta",
    links: [
      { href: "/perfil", label: "Mi perfil" },
      { href: "/perfil/pedidos", label: "Mis pedidos" },
      { href: "/login", label: "Iniciar sesión" },
    ],
  },
];

const LINK =
  "type-meta text-footer-fg/90 transition-colors duration-150 hover:text-footer-fg";

export interface FooterContact {
  phone: string | null;
  email: string | null;
  address: string | null;
}

// Pantallas de flujo: el pie no debe competir con el siguiente paso.
const FLOW_PREFIXES = ["/carrito", "/checkout", "/pedido-confirmado", "/login", "/registro"];

// Tres alturas: completo en el inicio, una fila de enlaces en las pantallas de
// exploración (catálogo, ficha, perfil) y solo el copyright en las de flujo,
// para no alargarlas.
export function SiteFooter({ contact }: { contact: FooterContact }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isFlow = FLOW_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  // En móvil la barra inferior flota sobre el footer: el hueco que necesita
  // lo pone el propio footer, así el café llega hasta el borde de la pantalla.
  const navVisible = isBottomNavVisible(pathname);
  const hasContact = Boolean(contact.phone || contact.email || contact.address);

  return (
    <footer className={cn("mt-auto bg-footer text-footer-fg", navVisible && BOTTOM_NAV_CLEARANCE)}>
      <div className="mx-auto w-full max-w-[1120px] px-5 md:px-6">
        {isHome && (
          <div className="grid gap-9 pt-12 pb-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <div className="lg:col-span-2 lg:pr-8">
              <BrandLogo tone="inverse" asLink={false} />
              <p className="mt-5 max-w-[280px] type-meta leading-[1.65] text-pretty text-footer-muted">
                Todo lo que necesitas, con entrega a domicilio y precios claros.
              </p>
            </div>

            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="eyebrow text-caramelo-500">{column.title}</p>
                <ul className="mt-4 flex flex-col gap-3">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className={LINK}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        )}

        {isHome && hasContact && (
          <div className="flex flex-col gap-3 border-t border-footer-line py-6 md:flex-row md:gap-10">
            {contact.phone && (
              <a
                href={`tel:${contact.phone.replace(/\s+/g, "")}`}
                className={`tabular inline-flex items-center gap-2 ${LINK}`}
              >
                <Phone className="h-4 w-4 flex-none text-caramelo-500" strokeWidth={1.9} aria-hidden />
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className={`inline-flex items-center gap-2 ${LINK}`}>
                <Mail className="h-4 w-4 flex-none text-caramelo-500" strokeWidth={1.9} aria-hidden />
                {contact.email}
              </a>
            )}
            {contact.address && (
              <p className="type-meta inline-flex items-center gap-2 text-footer-muted">
                <MapPin className="h-4 w-4 flex-none text-caramelo-500" strokeWidth={1.9} aria-hidden />
                {contact.address}
              </p>
            )}
          </div>
        )}

        <div
          className={cn(
            "flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between",
            isHome && "border-t border-footer-line"
          )}
        >
          {!isHome && !isFlow && (
            <nav aria-label="Tienda" className="flex flex-wrap gap-x-6 gap-y-2">
              {COLUMNS[0].links.slice(0, 4).map((link) => (
                <Link key={link.href} href={link.href} className={LINK}>
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
          <p className="type-caption text-footer-muted">
            © {new Date().getFullYear()} {STORE_NAME}
          </p>
        </div>
      </div>
    </footer>
  );
}
