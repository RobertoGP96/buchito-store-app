"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Pencil } from "lucide-react";
import { lazyDialog } from "@/components/lazy-dialog";
import type { CourierProfileFormData } from "./courier-profile-form";

const CourierProfileForm = lazyDialog(() => import("./courier-profile-form").then((m) => m.CourierProfileForm));

export function CourierProfileEditButton({ profile }: { profile: CourierProfileFormData }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="rounded-full" onPress={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
        Editar
      </Button>
      <CourierProfileForm open={open} onOpenChange={setOpen} profile={profile} />
    </>
  );
}
