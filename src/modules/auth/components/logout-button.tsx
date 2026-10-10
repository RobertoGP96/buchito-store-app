"use client";

import { Button } from "@heroui/react";
import { LogOut } from "lucide-react";
import { logoutUser } from "../actions/auth-actions";

export function LogoutButton() {
  return (
    <Button variant="outline" size="sm" className="rounded-full" onPress={() => void logoutUser()}>
      <LogOut className="h-4 w-4" strokeWidth={1.9} />
      Cerrar sesión
    </Button>
  );
}
