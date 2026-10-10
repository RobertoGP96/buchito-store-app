"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { STORE_NAME } from "@/lib/config";

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
      { href: "/carrito", label: "Bolsa" },
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
  "text-[13px] text-footer-fg/90 transition-colors duration-150 hover:text-white";

export interface FooterContact {
  phone: string | null;
  email: string | null;
  address: string | null;
}

// El bloque informativo solo tiene sentido en el inicio; en el resto de
// pantallas queda únicamente la barra del copyright para no alargar páginas
// de flujo (carrito, checkout, perfil).
export function SiteFooter({ contact }: { contact: FooterContact }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const hasContact = Boolean(contact.phone || contact.email || contact.address);

  return (
    <footer className="mt-auto bg-footer text-footer-fg">
      <div className="mx-auto w-full max-w-[1120px] px-5 md:px-6">
        {isHome && (
          <div className="grid gap-9 pt-12 pb-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <div className="lg:col-span-2 lg:pr-8">
              <BrandLogo tone="inverse" asLink={false} />
              <p className="mt-5 max-w-[280px] text-[13px] leading-[1.65] text-pretty text-footer-muted">
                Todo lo que necesitas, con entrega a domicilio y precios claros.
              </p>
            </div>

            {COLUMNS.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="eyebrow text-gold-500">{column.title}</p>
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
                className={`tabular ${LINK}`}
              >
                {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className={LINK}>
                {contact.email}
              </a>
            )}
            {contact.address && (
              <p className="text-[13px] text-footer-muted">{contact.address}</p>
            )}
          </div>
        )}

        <div className={isHome ? "border-t border-footer-line py-6" : "py-6"}>
          <p className="text-[12px] text-footer-muted">
            © {new Date().getFullYear()} {STORE_NAME}
          </p>
        </div>
      </div>
    </footer>
  );
}
