import Link from "next/link";
import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/permissions";

const enlaces = [
  { href: "/admin", label: "Panel de Control" },
  { href: "/admin/productos", label: "Gestion de Productos" },
  { href: "/admin/variantes", label: "Variantes y Stock" },
  { href: "/admin/etiquetas", label: "Etiquetas de Uso" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="-mx-4 -my-8">
      <nav
        aria-label="Administracion"
        className="flex min-h-14 items-center gap-6 overflow-x-auto bg-[#E53935] px-6 text-white"
      >
        {enlaces.map((enlace) => (
          <Link
            key={enlace.href}
            href={enlace.href}
            className="shrink-0 border-r border-white/60 pr-6 text-base font-medium transition-opacity last:border-0 hover:opacity-75"
          >
            {enlace.label}
          </Link>
        ))}
      </nav>
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8">{children}</div>
    </div>
  );
}
