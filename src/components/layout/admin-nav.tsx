"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES_ADMIN = [
  { href: "/admin", label: "Panel de Control" },
  { href: "/admin/reportes", label: "Reportes y Estadísticas" },
  { href: "/admin/pedidos", label: "Pedidos y Envíos" },
  { href: "/admin/productos", label: "Gestión de Productos" },
  { href: "/admin/variantes", label: "Variantes y Stock" },
  { href: "/admin/kits", label: "Kits" },
  { href: "/admin/extracciones", label: "Extracciones" },
  { href: "/admin/catalogos", label: "Marcas y Proveedores" },
  { href: "/admin/etiquetas", label: "Etiquetas de Uso" },
  { href: "/admin/promociones", label: "Promociones y Cupones" },
  { href: "/admin/newsletter", label: "Newsletter" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Administración"
      className="flex min-h-14 items-center gap-5 overflow-x-auto bg-[#E53935] px-6 text-white"
    >
      {ENLACES_ADMIN.map((enlace) => {
        const activo =
          enlace.href === "/admin"
            ? pathname === "/admin"
            : pathname === enlace.href ||
              Boolean(pathname?.startsWith(`${enlace.href}/`));
        return (
          <Link
            key={enlace.href}
            href={enlace.href}
            aria-current={activo ? "page" : undefined}
            className={`shrink-0 border-r border-white/50 pr-5 text-sm transition-opacity last:border-0 hover:opacity-80 ${
              activo
                ? "font-bold underline decoration-2 underline-offset-4"
                : "font-medium opacity-95"
            }`}
          >
            {enlace.label}
          </Link>
        );
      })}
    </nav>
  );
}
