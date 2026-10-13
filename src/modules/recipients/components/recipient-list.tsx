"use client";

import { useState } from "react";
import { Button, toast } from "@heroui/react";
import { MapPin, Pencil, Plus, Star } from "lucide-react";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/empty-state";
import { lazyDialog } from "@/components/lazy-dialog";
import { StatusChip } from "@/components/status-chip";
import type { ZoneRow } from "@/modules/deliveries/queries/zone-queries";
import { deleteRecipient, setDefaultRecipient } from "../actions/recipient-actions";
import type { RecipientRow } from "../queries/recipient-queries";
import { RecipientAddress } from "./recipient-address";

const RecipientForm = lazyDialog(() => import("./recipient-form").then((m) => m.RecipientForm));

export function RecipientList({ rows, zones }: { rows: RecipientRow[]; zones: ZoneRow[] }) {
  const [editing, setEditing] = useState<RecipientRow | null>(null);
  const [open, setOpen] = useState(false);
  const [settingDefault, setSettingDefault] = useState<number | null>(null);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: RecipientRow) => {
    setEditing(row);
    setOpen(true);
  };

  const makeDefault = async (row: RecipientRow) => {
    setSettingDefault(row.recipientId);
    try {
      const result = await setDefaultRecipient(row.recipientId);
      if (!result.success) {
        toast.danger(result.error);
        return;
      }
      toast.success(`${row.name} es ahora tu destinatario principal`);
    } catch (error) {
      console.error("RecipientList:", error);
      toast.danger("No se pudo cambiar el destinatario principal");
    } finally {
      setSettingDefault(null);
    }
  };

  return (
    <>
      <div className="flex justify-end">
        <Button variant="primary" className="rounded-full" onPress={openNew}>
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          Nuevo destinatario
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Todavía no tienes destinatarios"
          description="Guarda a quién y dónde entregamos tus pedidos para no volver a escribirlo en cada compra."
        />
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.recipientId} className="rounded-card bg-canvas p-4 shadow-card md:p-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-tint text-navy-700">
                  <MapPin className="h-4 w-4" strokeWidth={1.9} />
                </span>
                <div className="min-w-0 flex-1 text-[13.5px] leading-[1.6] text-ink">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{r.name}</p>
                    {r.label && <span className="text-[12.5px] text-slate-400">{r.label}</span>}
                    {r.isDefault && <StatusChip label="Principal" tone="info" />}
                  </div>
                  <p className="tabular text-slate-500">{r.phone}</p>
                  <RecipientAddress recipient={r} className="mt-1" />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
                {!r.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    isPending={settingDefault === r.recipientId}
                    isDisabled={settingDefault != null}
                    onPress={() => makeDefault(r)}
                  >
                    <Star className="h-3.5 w-3.5" strokeWidth={1.9} />
                    Hacer principal
                  </Button>
                )}
                <Button variant="outline" size="sm" className="rounded-full" onPress={() => openEdit(r)}>
                  <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                  Editar
                </Button>
                <DeleteButton
                  appearance="button"
                  itemLabel={`a ${r.name}`}
                  description={`Se eliminará ${r.name} de tus destinatarios. Los pedidos ya hechos no cambian.`}
                  successMessage="Destinatario eliminado"
                  onConfirm={() => deleteRecipient(r.recipientId)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <RecipientForm key={editing?.recipientId ?? "new"} open={open} onOpenChange={setOpen} recipient={editing} zones={zones} />
    </>
  );
}
