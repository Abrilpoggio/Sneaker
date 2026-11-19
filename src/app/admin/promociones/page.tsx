import type { Metadata } from "next";

import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  MarketingAdminUI,
  type CuponAdminItem,
  type ProductoOpcionMarketing,
  type PromocionAdminItem,
} from "@/modules/marketing/components/marketing-admin-ui";

export const metadata: Metadata = {
  title: "Promociones y Cupones · Admin Sneaker",
};

export const dynamic = "force-dynamic";

/**
 * ABM de Promociones (RF-41) y Cupones de Descuento (RF-42).
 */
export default async function PaginaAdminPromociones() {
  await requireAdmin();

  const [promosRaw, cuponesRaw, productosRaw] = await Promise.all([
    prisma.promocion.findMany({
      orderBy: [{ activa: "desc" }, { creadoEn: "desc" }],
      select: {
        id: true,
        nombre: true,
        porcentajeDescuento: true,
        fechaInicio: true,
        fechaFin: true,
        activa: true,
        _count: { select: { productos: true, pedidos: true } },
      },
    }),
    prisma.cupon.findMany({
      orderBy: [{ activo: "desc" }, { creadoEn: "desc" }],
      select: {
        id: true,
        codigo: true,
        porcentajeDescuento: true,
        fechaVigencia: true,
        fechaVigenciaFin: true,
        descripcion: true,
        activo: true,
        _count: { select: { pedidos: true } },
      },
    }),
    prisma.producto.findMany({
      where: { estado: "ACTIVO" },
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        sku: true,
        nombre: true,
        marca: { select: { nombre: true } },
      },
    }),
  ]);

  const promociones: PromocionAdminItem[] = promosRaw.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    porcentajeDescuento: Number(p.porcentajeDescuento),
    fechaInicioISO: p.fechaInicio.toISOString(),
    fechaFinISO: p.fechaFin.toISOString(),
    activa: p.activa,
    cantidadProductos: p._count.productos,
    cantidadPedidos: p._count.pedidos,
  }));

  const cupones: CuponAdminItem[] = cuponesRaw.map((c) => ({
    id: c.id,
    codigo: c.codigo,
    porcentajeDescuento: Number(c.porcentajeDescuento),
    fechaVigenciaISO: c.fechaVigencia.toISOString(),
    fechaVigenciaFinISO: c.fechaVigenciaFin
      ? c.fechaVigenciaFin.toISOString()
      : null,
    descripcion: c.descripcion,
    activo: c.activo,
    cantidadPedidos: c._count.pedidos,
  }));

  const productos: ProductoOpcionMarketing[] = productosRaw.map((p) => ({
    id: p.id,
    sku: p.sku,
    nombre: p.nombre,
    marca: p.marca.nombre,
  }));

  const ahora = new Date();
  const hoyISO = ahora.toISOString().slice(0, 10);
  const enUnMes = new Date(ahora);
  enUnMes.setMonth(enUnMes.getMonth() + 1);
  const enUnMesISO = enUnMes.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">
          Marketing · RF-41 / RF-42
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#2C2C2C]">
          Promociones y Cupones de Descuento
        </h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Creá, activá o desactivá promociones por fecha y códigos de cupón. Los
          cambios se reflejan al instante en la tienda y el checkout.
        </p>
      </header>

      <MarketingAdminUI
        promociones={promociones}
        cupones={cupones}
        productos={productos}
        hoyISO={hoyISO}
        enUnMesISO={enUnMesISO}
      />
    </div>
  );
}
