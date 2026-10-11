"use client";

import { Dropdown } from "@heroui/react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  IdCard,
  Inbox,
  LayoutDashboard,
  LogOut,
  Package,
  PackageSearch,
  Truck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { logoutUser } from "@/modules/auth/actions/auth-actions";
import { cn } from "@/lib/utils";

/** Lo mínimo de la sesión que necesita la barra; lo pasa el layout servidor. */
export interface NavUser {
  fullName: string;
  email: string;
  role: string;
}

interface MenuLink {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
}

const GUEST_LINKS: MenuLink[] = [
  { id: "login", href: "/login", label: "Iniciar sesión", icon: UserRound },
  { id: "register", href: "/registro", label: "Crear cuenta", icon: IdCard },
];

function linksFor(user: NavUser): MenuLink[] {
  return [
    { id: "profile", href: "/perfil", label: "Mi perfil", icon: UserRound },
    { id: "orders", href: "/perfil/pedidos", label: "Mis pedidos", icon: Package },
  ];
}

/** Atajos de gestión según el rol: el admin salta a su panel desde la tienda
 *  sin pasar por el inicio; el mensajero va directo a sus entregas. */
function manageLinksFor(user: NavUser): MenuLink[] {
  if (user.role === "admin") {
    return [
      { id: "admin", href: "/admin", label: "Panel de gestión", icon: LayoutDashboard },
      { id: "admin-orders", href: "/admin/pedidos", label: "Pedidos", icon: Inbox },
      { id: "admin-products", href: "/admin/productos", label: "Productos", icon: PackageSearch },
      { id: "admin-deliveries", href: "/admin/entregas", label: "Entregas", icon: Truck },
    ];
  }
  if (user.role === "courier") {
    return [{ id: "courier", href: "/mensajero", label: "Mis entregas", icon: Truck }];
  }
  return [];
}

const ITEM = "flex items-center gap-3 text-[13px] font-medium";

export function UserMenu({ user }: { user: NavUser | null }) {
  const router = useRouter();
  const links = user ? linksFor(user) : GUEST_LINKS;
  const manageLinks = user ? manageLinksFor(user) : [];
  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? "";

  const handleAction = (key: React.Key) => {
    if (key === "logout") {
      void logoutUser();
      return;
    }
    const link = [...links, ...manageLinks].find((l) => l.id === key);
    if (link) router.push(link.href);
  };

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label={user ? `Cuenta de ${user.fullName}` : "Tu cuenta"}
        className={cn(
          "nav-label inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-full px-2 text-slate-500 transition-colors duration-150 hover:bg-hover hover:text-navy-700 data-[pressed]:bg-tint data-[pressed]:text-navy-700",
          firstName && "lg:px-3"
        )}
      >
        <UserRound className="h-[18px] w-[18px] flex-none" strokeWidth={1.9} />
        {firstName && (
          <span className="hidden max-w-[92px] truncate lg:inline">{firstName}</span>
        )}
        <ChevronDown className="hidden h-3.5 w-3.5 flex-none md:block" strokeWidth={2} />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end" className="w-[256px]">
        <Dropdown.Menu aria-label="Cuenta" onAction={handleAction}>
          <Dropdown.Section>
            <div className="mb-1 rounded-field bg-page px-3.5 py-3">
              <p className="truncate text-[14px] font-semibold text-ink">
                {user ? user.fullName : "Cliente invitado"}
              </p>
              <p className="mt-0.5 truncate text-[12px] text-slate-400">
                {user ? user.email : "Inicia sesión o crea tu cuenta"}
              </p>
            </div>
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Dropdown.Item key={link.id} id={link.id} textValue={link.label}>
                  <span className={ITEM}>
                    <Icon className="h-4 w-4 flex-none" strokeWidth={1.9} />
                    {link.label}
                  </span>
                </Dropdown.Item>
              );
            })}
          </Dropdown.Section>
          {manageLinks.length > 0 && (
            <Dropdown.Section>
              {manageLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Dropdown.Item key={link.id} id={link.id} textValue={link.label}>
                    <span className={ITEM}>
                      <Icon className="h-4 w-4 flex-none" strokeWidth={1.9} />
                      {link.label}
                    </span>
                  </Dropdown.Item>
                );
              })}
            </Dropdown.Section>
          )}
          {user && (
            <Dropdown.Section>
              <Dropdown.Item id="logout" textValue="Cerrar sesión">
                <span className={cn(ITEM, "text-danger")}>
                  <LogOut className="h-4 w-4 flex-none" strokeWidth={1.9} />
                  Cerrar sesión
                </span>
              </Dropdown.Item>
            </Dropdown.Section>
          )}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
