import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Panel de administracion",
};

/**
 * Panel de administracion (RNF-08).
 *
 * `requireAdmin()` corre en el servidor y corta el render si la sesion no
 * es de ADMIN, asi que esta pagina no llega a renderizarse sin permisos
 * aunque se solicite la URL a mano. No alcanza con esconder el enlace del
 * header: por eso el control esta aca y no solo en el componente del menu.
 */
export default async function PaginaAdmin() {
  const sesion = await requireAdmin();

  // Verificacion de humo del Sprint 1: si la base esta conectada y las
  // migraciones aplicadas, estos conteos son coherentes.
  const [productos, variantes, usuarios, movimientos] = await Promise.all([
    prisma.producto.count(),
    prisma.varianteProducto.count(),
    prisma.usuario.count(),
    prisma.movimientoStock.count(),
  ]);

  const tarjetas = [
    { etiqueta: "Productos", valor: productos, destino: "/admin/productos" },
    { etiqueta: "Variantes", valor: variantes, destino: "/admin/stock" },
    { etiqueta: "Usuarios", valor: usuarios, destino: "/admin/usuarios" },
    {
      etiqueta: "Movimientos de stock",
      valor: movimientos,
      destino: "/admin/stock",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold">Panel de administracion</h1>
        <p className="mt-1 text-sm text-texto-tenue">
          Sesion iniciada como {sesion.user.email} (rol {sesion.user.rol}).
        </p>
      </header>

      <section aria-labelledby="titulo-resumen">
        <h2 id="titulo-resumen" className="text-sm font-semibold uppercase tracking-wide text-texto-tenue">
          Resumen
        </h2>

        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tarjetas.map((tarjeta) => (
            <Link
              key={tarjeta.etiqueta}
              href={tarjeta.destino}
              className="rounded-card border border-borde p-4 transition-colors hover:border-acento"
            >
              <p className="text-2xl font-semibold tabular-nums">
                {tarjeta.valor}
              </p>
              <p className="mt-1 text-sm text-texto-tenue">{tarjeta.etiqueta}</p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="titulo-sprint" className="rounded-card border border-borde p-4">
        <h2 id="titulo-sprint" className="text-sm font-semibold">
          Alcance del Sprint 1
        </h2>
        <p className="mt-2 text-sm text-texto-tenue">
          La gestion de productos, stock, pedidos, kits y promociones se
          implementa en los sprints 2 a 4. Los enlaces del resumen todavia no
          tienen destino.
        </p>
      </section>
    </div>
  );
}
