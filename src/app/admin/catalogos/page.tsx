import type { Metadata } from "next";

import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CatalogosAdminUI } from "@/modules/catalogo/components/catalogos-admin-ui";

export const metadata: Metadata = {
  title: "Marcas, Proveedores y Categorías · Admin Sneaker",
};

export const dynamic = "force-dynamic";

export default async function AdminCatalogosPage() {
  await requireAdmin();

  const [marcasRaw, categoriasRaw, proveedoresRaw] = await Promise.all([
    prisma.marca.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } },
    }),
    prisma.categoria.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { productos: true } } },
    }),
    prisma.proveedor.findMany({
      orderBy: [{ estado: "asc" }, { razonSocial: "asc" }],
      include: { _count: { select: { productos: true } } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-[#9E9E9E]">
          Administración del catálogo
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#2C2C2C]">
          Marcas, Proveedores y Categorías
        </h1>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Administrá las marcas, proveedores comerciales y categorías disponibles para tus productos.
        </p>
      </header>

      <CatalogosAdminUI
        marcas={marcasRaw.map((m) => ({
          id: m.id,
          nombre: m.nombre,
          slug: m.slug,
          productosCount: m._count.productos,
        }))}
        categorias={categoriasRaw.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          slug: c.slug,
          productosCount: c._count.productos,
        }))}
        proveedores={proveedoresRaw.map((p) => ({
          id: p.id,
          razonSocial: p.razonSocial,
          cuit: p.cuit,
          nombreContacto: p.nombreContacto,
          telefono: p.telefono,
          email: p.email,
          direccion: p.direccion,
          estado: p.estado,
          productosCount: p._count.productos,
        }))}
      />
    </div>
  );
}
