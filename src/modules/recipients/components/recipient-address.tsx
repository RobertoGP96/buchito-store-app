import type { RecipientRow } from "../queries/recipient-queries";

type AddressLike = Pick<RecipientRow, "line1" | "line2" | "neighborhood" | "city" | "reference" | "zoneName">;

/** Dirección en dos líneas más zona y referencia; la comparten la lista del
 *  perfil y el selector del checkout. */
export function RecipientAddress({ address, className }: { address: AddressLike; className?: string }) {
  return (
    <span className={className}>
      {address.line1}
      {address.line2 && <>, {address.line2}</>}
      <br />
      {address.neighborhood && <>{address.neighborhood}, </>}
      {address.city}
      {address.zoneName && <span className="block text-slate-500">Zona: {address.zoneName}</span>}
      {address.reference && <span className="block text-slate-500">Ref.: {address.reference}</span>}
    </span>
  );
}
