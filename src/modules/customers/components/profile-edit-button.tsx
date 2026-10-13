"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { Pencil } from "lucide-react";
import { lazyDialog } from "@/components/lazy-dialog";
import type { ProfileFormCustomer } from "./profile-form";

const ProfileForm = lazyDialog(() => import("./profile-form").then((m) => m.ProfileForm));

export function ProfileEditButton({ customer }: { customer: ProfileFormCustomer }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="rounded-full" onPress={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" strokeWidth={1.9} />
        Editar
      </Button>
      <ProfileForm open={open} onOpenChange={setOpen} customer={customer} />
    </>
  );
}
