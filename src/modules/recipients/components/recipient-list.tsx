"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { MapPin, Pencil, Plus } from "lucide-react";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/empty-state";
import { lazyDialog } from "@/components/lazy-dialog";
import { ListCard } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import type { ZoneRow } from "@/modules/deliveries/queries/zone-queries";
import { deleteRecipient } from "../actions/recipient-actions";
import type { RecipientRow } from "../queries/recipient-queries";
import { RecipientAddress } from "./recipient-address";

const RecipientForm = lazyDialog(() => import("./recipient-form").then((m) => m.RecipientForm));

interface RecipientListProps {
  recipients: RecipientRow[];
  zones: ZoneRow[];
}

/** Destinatarios del cliente: cards en todos los tamaños (es la tienda, no
 *  el panel), alta en diálogo y borrado con confirmación. */
export function RecipientList({ recipients, zones }: RecipientListProps) {
  const [editing, setEditing] = useState<RecipientRow | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: RecipientRow) => {
    setEditing(row);
    setOpen(true);
  };

  const newButton = (
    <Button variant="primary" className="rounded-full" onPress={openNew}>
      <Plus className="h-4 w-4" strokeWidth={2.2} />
      Nuevo destinatario
    </Button>
  );

  return (
    <>
      {recipients.length === 0 ? (
        <div className="rounded-card bg-canvas shadow-card">
          <EmptyState
            icon={MapPin}
            title="Sin destinatarios"
            description="Guarda a quién le entregamos tus pedidos: nombre, teléfono y dirección. Así no los escribes en cada compra."
            size="compact"
            action={newButton}
          />
        </div>
      ) : (
        <>
          <div className="flex justify-end">{newButton}</div>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {recipients.map((r) => (
              <li key={r.addressId}>
                <ListCard
                  title={r.name}
                  subtitle={<span className="tabular">{r.phone}</span>}
                  badge={r.isDefault ? <StatusChip label="Principal" tone="info" /> : undefined}
                  actions={
                    <>
                      <Button variant="outline" size="sm" className="rounded-full" onPress={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                        Editar
                      </Button>
                      <DeleteButton
                        appearance="button"
                        itemLabel={`a ${r.name}`}
                        description={`${r.name} dejará de aparecer entre tus destinatarios. Los pedidos ya hechos conservan sus datos.`}
                        successMessage="Destinatario eliminado"
                        onConfirm={() => deleteRecipient(r.addressId)}
                      />
                    </>
                  }
                >
                  <address className="mt-3 text-[13px] not-italic leading-[1.6] text-ink">
                    <RecipientAddress address={r} />
                  </address>
                </ListCard>
              </li>
            ))}
          </ul>
        </>
      )}

      <RecipientForm key={editing?.addressId ?? "new"} open={open} onOpenChange={setOpen} recipient={editing} zones={zones} />
    </>
  );
}
