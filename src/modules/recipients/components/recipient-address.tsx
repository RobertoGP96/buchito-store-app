import type { RecipientRow } from "../queries/recipient-queries";

/** Dirección de un destinatario en una línea, con zona y referencia debajo. */
export function RecipientAddress({ recipient, className }: { recipient: RecipientRow; className?: string }) {
  return (
    <p className={className}>
      {recipient.line1}
      {recipient.line2 && <>, {recipient.line2}</>}
      {recipient.neighborhood && <>, {recipient.neighborhood}</>}
      {recipient.zoneName && <span className="block text-slate-500">Zona: {recipient.zoneName}</span>}
      {recipient.reference && <span className="block text-slate-500">Ref.: {recipient.reference}</span>}
    </p>
  );
}
