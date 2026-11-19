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

  const [
    pedidos,
    productos,
    variantes,
    usuarios,
    movimientos,
    kits,
    extracciones,
    promociones,
    cupones,
  ] = await Promise.all([
    prisma.pedido.count(),
    prisma.producto.count(),
    prisma.varianteProducto.count(),
    prisma.usuario.count(),
    prisma.movimientoStock.count(),
    prisma.kit.count(),
    prisma.movimientoStock.count({ where: { tipo: "EXTRACCION" } }),
    prisma.promocion.count({ where: { activa: true } }),
    prisma.cupon.count({ where: { activo: true } }),
  ]);

  const tarjetas = [
    { etiqueta: "Pedidos", valor: pedidos, destino: "/admin/pedidos" },
    { etiqueta: "Productos", valor: productos, destino: "/admin/productos" },
    { etiqueta: "Variantes", valor: variantes, destino: "/admin/variantes" },
    { etiqueta: "Kits", valor: kits, destino: "/admin/kits" },
    { etiqueta: "Extracciones", valor: extracciones, destino: "/admin/extracciones" },
    { etiqueta: "Promociones activas", valor: promociones, destino: "/admin/promociones" },
    { etiqueta: "Cupones activos", valor: cupones, destino: "/admin/promociones" },
    { etiqueta: "Usuarios registrados", valor: usuarios, destino: "/admin/reportes" },
    {
      etiqueta: "Movimientos de stock",
      valor: movimientos,
      destino: "/admin/variantes",
    },
  ];

  const tarjetasExtra = [
    {
      etiqueta: "Promociones y Cupones (RF-41 / RF-42)",
      detalle: "Crear, activar y gestionar descuentos",
      destino: "/admin/promociones",
    },
    {
      etiqueta: "Newsletter (RF-44)",
      detalle: "Enviar novedades a suscriptos",
      destino: "/admin/newsletter",
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

      <section aria-labelledby="titulo-reportes" className="rounded-card border border-borde p-4 bg-gray-50/50">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="titulo-reportes" className="text-base font-semibold text-[#2C2C2C]">
              Reportes y Estadísticas de Ventas (RF-47 / RF-48)
            </h2>
            <p className="mt-1 text-sm text-texto-tenue">
              Visualizá KPIs comerciales, ranking de productos y clientes, y exportá registros consolidados a Excel (.xlsx).
            </p>
          </div>
          <Link
            href="/admin/reportes"
            className="inline-flex items-center gap-2 rounded-md bg-[#CF1A1F] px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[#b0161a]"
          >
            Ver Reportes y Exportar &rarr;
          </Link>
        </div>
      </section>

      <section aria-labelledby="titulo-catalogo" className="rounded-card border border-borde p-4">
        <h2 id="titulo-catalogo" className="text-sm font-semibold">
          Catalogo e inventario
        </h2>
        <p className="mt-2 text-sm text-texto-tenue">
          Administra productos, variantes, kits y extracciones. Los cambios de
          stock quedan registrados con responsable y motivo.
        </p>
        <div className="mt-3 flex flex-wrap gap-4">
          <Link href="/admin/kits" className="text-sm font-semibold text-[#CF1A1F] underline">
            Gestionar kits (stock calculado)
          </Link>
          <Link
            href="/admin/extracciones"
            className="text-sm font-semibold text-[#CF1A1F] underline"
          >
            Registrar extracciones
          </Link>
          <Link href="/admin/etiquetas" className="text-sm font-semibold text-[#CF1A1F] underline">
            Gestionar etiquetas de uso
          </Link>
        </div>
      </section>

      <section aria-labelledby="titulo-marketing" className="rounded-card border border-borde p-4">
        <h2 id="titulo-marketing" className="text-sm font-semibold">
          Marketing
        </h2>
        <p className="mt-2 text-sm text-texto-tenue">
          Gestioná promociones por fecha, cupones de descuento y comunicaciones
          a suscriptores del newsletter.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {tarjetasExtra.map((tarjeta) => (
            <Link
              key={tarjeta.etiqueta}
              href={tarjeta.destino}
              className="text-sm font-semibold text-[#CF1A1F] underline"
            >
              {tarjeta.etiqueta} — {tarjeta.detalle}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
