import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { ProductoForm } from "@/modules/catalogo/components/producto-form";

export const metadata: Metadata = { title: "Agregar producto" };

export default async function NuevoProductoAdminPage() {
  const [categorias, marcas, proveedores, etiquetas] = await Promise.all([
    prisma.categoria.findMany({ where: { activa: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.marca.findMany({ where: { activa: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.proveedor.findMany({ where: { estado: "ACTIVO" }, orderBy: { razonSocial: "asc" }, select: { id: true, razonSocial: true } }),
    prisma.etiquetaUso.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/productos" className="w-fit text-sm font-semibold text-[#2C2C2C] underline">← Volver a productos</Link>
      <header>
        <h1 className="text-3xl font-bold text-[#2C2C2C]">Agregar Nuevo Producto</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">El producto se crea con su primera variante; podras agregar las restantes desde su ficha.</p>
      </header>
      <ProductoForm
        categorias={categorias}
        marcas={marcas}
        proveedores={proveedores.map((p) => ({ id: p.id, nombre: p.razonSocial }))}
        etiquetas={etiquetas}
      />
    </div>
  );
}
