import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { buttonLinkClasses, type ButtonLinkSize, type ButtonLinkVariant } from "@/components/button-link";

interface WhatsappLinkProps {
  /** Resultado de `buildWhatsappLink`; quien lo pinta ya descartó `null`. */
  href: string;
  children: ReactNode;
  variant?: ButtonLinkVariant;
  size?: ButtonLinkSize;
  className?: string;
}

/** Enlace externo a wa.me con aspecto de botón. Es un <a> plano: `ButtonLink`
 *  siempre es `Link` y el `Button` de HeroUI queda para `onPress`. Abre
 *  WhatsApp en pestaña nueva sin `window.open` (Safari/iOS lo bloquean tras un
 *  await y el cliente perdería la pantalla). lucide no trae iconos de marca. */
export function WhatsappLink({ href, children, variant = "solid", size = "default", className }: WhatsappLinkProps) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={buttonLinkClasses(variant, size, className)}>
      <MessageCircle className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
      {children}
      <span className="sr-only"> (se abre en una pestaña nueva)</span>
    </a>
  );
}
