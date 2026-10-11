"use client";

import { lazyDialog } from "@/components/lazy-dialog";
import { useState } from "react";
import { Button } from "@heroui/react";
import { Pencil, Plus, UserCog } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ListCard, ResponsiveList, type ListColumn } from "@/components/responsive-list";
import { StatusChip } from "@/components/status-chip";
import { fmtDateTime } from "@/lib/format";
import { USER_ROLE_LABELS, USER_ROLE_TONE } from "../lib/labels";
import type { UserRow } from "../queries/user-queries";

const UserForm = lazyDialog(() => import("./user-form").then((m) => m.UserForm));

export function UserList({ rows }: { rows: UserRow[] }) {
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (row: UserRow) => {
    setEditing(row);
    setOpen(true);
  };

  const columns: ListColumn<UserRow>[] = [
    {
      id: "name",
      header: "Usuario",
      isRowHeader: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="font-semibold text-ink">{r.fullName}</p>
          <p className="text-[12px] text-slate-400">{r.email}</p>
        </div>
      ),
    },
    { id: "role", header: "Rol", cell: (r) => <StatusChip label={USER_ROLE_LABELS[r.role]} tone={USER_ROLE_TONE[r.role]} /> },
    {
      id: "status",
      header: "Estado",
      cell: (r) => <StatusChip label={r.isActive ? "Activo" : "Inactivo"} tone={r.isActive ? "success" : "neutral"} />,
    },
    {
      id: "lastLogin",
      header: "Último acceso",
      cell: (r) => <span className="tabular text-slate-500">{r.lastLoginAt ? fmtDateTime(r.lastLoginAt) : "Nunca"}</span>,
    },
    { id: "created", header: "Alta", cell: (r) => <span className="tabular text-slate-500">{fmtDateTime(r.createdAt)}</span> },
    {
      id: "actions",
      header: "",
      align: "right",
      cell: (r) => (
        <Button variant="ghost" size="sm" isIconOnly aria-label={`Editar ${r.fullName}`} onPress={() => openEdit(r)}>
          <Pencil className="h-4 w-4" strokeWidth={1.9} />
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-end">
        <Button variant="primary" className="rounded-full" onPress={openNew}>
          <Plus className="h-4 w-4" strokeWidth={2.2} />
          Nuevo usuario
        </Button>
      </div>

      <ResponsiveList
        rows={rows}
        rowKey={(r) => r.userId}
        columns={columns}
        ariaLabel="Usuarios"
        empty={
          <div className="rounded-card bg-canvas shadow-card">
            <EmptyState icon={UserCog} title="Sin usuarios" description="Crea la primera cuenta de acceso." size="compact" />
          </div>
        }
        renderCard={(r) => (
          <ListCard
            title={r.fullName}
            subtitle={r.email}
            badge={<StatusChip label={USER_ROLE_LABELS[r.role]} tone={USER_ROLE_TONE[r.role]} />}
            rows={[
              { label: "Estado", value: <StatusChip label={r.isActive ? "Activo" : "Inactivo"} tone={r.isActive ? "success" : "neutral"} /> },
              { label: "Último acceso", value: r.lastLoginAt ? fmtDateTime(r.lastLoginAt) : "Nunca" },
              { label: "Alta", value: fmtDateTime(r.createdAt) },
            ]}
            actions={
              <Button variant="outline" size="sm" className="rounded-full" onPress={() => openEdit(r)}>
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
                Editar
              </Button>
            }
          />
        )}
      />

      <UserForm key={editing?.userId ?? "new"} open={open} onOpenChange={setOpen} user={editing} />
    </>
  );
}
