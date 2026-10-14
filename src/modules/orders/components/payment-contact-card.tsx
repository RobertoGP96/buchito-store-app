import { Money } from "@/components/money";
import { WhatsappLink } from "@/components/whatsapp-link";
import type { OrderDetailData } from "../queries/order-queries";

interface PaymentContactCardProps {
  order: OrderDetailData;
  /** Enlace wa.me ya construido con el mensaje prellenado. */
  href: string;
  /** Saldo pendiente en la moneda de pago del pedido. */
  amount: number;
}

/** Siguiente paso tras el checkout: coordinar el pago con la tienda por
 *  WhatsApp. Server component. El número nunca se pinta: solo viaja en el href. */
export function PaymentContactCard({ order, href, amount }: PaymentContactCardProps) {
  const partial = order.paymentStatus === "partial";
  // El pedido puede seguir vivo con saldo después de confirmarse o entregarse
  // (contra entrega sin anotar): ahí ya no prometemos "confirmarlo".
  const pending = order.status === "pending";
  const heading = partial
    ? "Te queda un saldo por pagar"
    : pending
      ? "Coordina tu pago por WhatsApp"
      : "Tu pedido tiene un pago pendiente";
  const steps = [
    {
      title: "Realiza el pago",
      body: (
        <>
          <p className="text-[13.5px] text-ink">
            {order.paymentMethodName} · <Money value={amount} currency={order.paymentCurrency} className="font-semibold" />
          </p>
          {order.paymentInstructions && (
            <p className="mt-2 rounded-chip bg-page px-3 py-2 text-[12.5px] leading-[1.6] break-words text-slate-500">
              {order.paymentInstructions}
            </p>
          )}
        </>
      ),
    },
    {
      title: "Envíanos el comprobante por WhatsApp",
      body: (
        <p className="text-[13px] leading-[1.6] text-slate-500">
          El mensaje ya lleva tu número de pedido; adjunta la captura o foto del pago.
        </p>
      ),
    },
    pending
      ? {
          title: "Confirmamos tu pedido",
          body: (
            <p className="text-[13px] leading-[1.6] text-slate-500">
              En cuanto verifiquemos el pago lo confirmamos y te avisamos.
            </p>
          ),
        }
      : {
          title: "Registramos tu pago",
          body: (
            <p className="text-[13px] leading-[1.6] text-slate-500">
              En cuanto lo verifiquemos quedará anotado en tu pedido.
            </p>
          ),
        },
  ];

  return (
    <section aria-labelledby="payment-contact-title" className="anim-fade-up rounded-card bg-canvas p-5 shadow-card md:p-6">
      <p className="eyebrow">Siguiente paso</p>
      <h2 id="payment-contact-title" className="font-display mt-2 text-[20px] leading-tight text-navy-900 md:text-[24px]">
        {heading}
      </h2>
      <ol className="mt-5 flex flex-col gap-4">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-tint text-[12.5px] font-semibold text-navy-700">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">{step.title}</p>
              <div className="mt-1">{step.body}</div>
            </div>
          </li>
        ))}
      </ol>
      <WhatsappLink href={href} size="lg" className="mt-6 w-full sm:w-auto">
        Escribir por WhatsApp
      </WhatsappLink>
      <p className="mt-3 text-[12px] leading-[1.6] text-slate-400">
        WhatsApp se abre en una pestaña nueva; este resumen se queda aquí.
      </p>
    </section>
  );
}
