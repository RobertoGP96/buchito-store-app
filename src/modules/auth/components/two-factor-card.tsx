"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { ShieldCheck } from "lucide-react";
import { lazyDialog } from "@/components/lazy-dialog";
import { StatusChip } from "@/components/status-chip";
import { fmtDate } from "@/lib/format";
import { TWO_FACTOR_METHOD_LABELS, type TwoFactorStatus } from "../lib/two-factor-labels";

const TwoFactorSetupDialog = lazyDialog(() =>
  import("./two-factor-setup-dialog").then((m) => m.TwoFactorSetupDialog)
);
const TwoFactorDisableDialog = lazyDialog(() =>
  import("./two-factor-disable-dialog").then((m) => m.TwoFactorDisableDialog)
);

/** Card «Seguridad» de Mi perfil: estado del 2FA y los diálogos de alta/baja. */
export function TwoFactorCard({ status }: { status: TwoFactorStatus }) {
  const [setupOpen, setSetupOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);
  // Cada apertura monta un diálogo nuevo: el alta empieza siempre en el paso 1.
  const [setupKey, setSetupKey] = useState(0);

  const openSetup = () => {
    setSetupKey((k) => k + 1);
    setSetupOpen(true);
  };

  return (
    <section className="flex flex-col rounded-card bg-canvas p-5 shadow-card md:p-6">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tint text-navy-700">
          <ShieldCheck className="h-5 w-5" strokeWidth={1.9} />
        </span>
        <p className="min-w-0 flex-1 text-[15px] font-semibold text-ink">Verificación en dos pasos</p>
        <StatusChip label={status.enabled ? "Activada" : "Desactivada"} tone={status.enabled ? "success" : "neutral"} />
      </div>

      <p className="mt-3 text-[13px] leading-[1.6] text-slate-500">
        {status.enabled
          ? status.method === "app"
            ? "Al entrar te pediremos, además de la contraseña, el código de tu app de autenticación."
            : "Al entrar te pediremos, además de la contraseña, un código enviado a tu correo."
          : "Añade un código de un solo uso al iniciar sesión: aunque alguien tenga tu contraseña, no podrá entrar."}
      </p>

      {status.enabled && status.method && (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13px]">
          <dt className="text-slate-400">Método</dt>
          <dd className="font-medium text-ink">{TWO_FACTOR_METHOD_LABELS[status.method]}</dd>
          {status.enabledAt && (
            <>
              <dt className="text-slate-400">Desde</dt>
              <dd className="font-medium text-ink">{fmtDate(status.enabledAt)}</dd>
            </>
          )}
          <dt className="text-slate-400">Códigos de respaldo</dt>
          <dd className="font-medium text-ink tabular">
            {status.recoveryCodesLeft === 0 ? "Ninguno" : `${status.recoveryCodesLeft} sin usar`}
          </dd>
        </dl>
      )}

      {status.enabled && status.recoveryCodesLeft === 0 && (
        <p className="mt-3 text-[12.5px] leading-[1.6] text-danger">
          Sin códigos de respaldo. Si pierdes el acceso al método, desactiva y vuelve a activar la verificación para
          generar otros.
        </p>
      )}

      <div className="mt-auto pt-4">
        {status.enabled ? (
          <Button variant="outline" size="sm" className="rounded-full" onPress={() => setDisableOpen(true)}>
            Desactivar
          </Button>
        ) : (
          <Button variant="primary" size="sm" className="rounded-full" onPress={openSetup}>
            Activar
          </Button>
        )}
      </div>

      <TwoFactorSetupDialog
        key={setupKey}
        open={setupOpen}
        onOpenChange={setSetupOpen}
        emailAvailable={status.emailAvailable}
      />
      <TwoFactorDisableDialog open={disableOpen} onOpenChange={setDisableOpen} />
    </section>
  );
}
