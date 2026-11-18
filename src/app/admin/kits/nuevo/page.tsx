import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { KitForm } from "@/modules/kits/components/kit-form";
import { listarVariantesComponentes } from "@/modules/kits/services/kits";

export const metadata: Metadata = { title: "Nuevo kit" };

export default async function NuevoKitPage() {
  await requireAdmin();
  const [categorias, marcas, proveedores, variantes] = await Promise.all([
    prisma.categoria.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.marca.findMany({
      where: { activa: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.proveedor.findMany({
      where: { estado: "ACTIVO" },
      orderBy: { razonSocial: "asc" },
      select: { id: true, razonSocial: true },
    }),
    listarVariantesComponentes(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/kits" className="w-fit text-sm font-semibold text-[#2C2C2C] underline">
        ← Volver a kits
      </Link>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">Inventario</p>
        <h1 className="mt-1 text-3xl font-bold text-[#2C2C2C]">Nuevo kit</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">
          El kit es un producto compuesto: no tiene variantes propias, se arma con al
          menos dos variantes existentes.
        </p>
      </header>

      <KitForm
        categorias={categorias}
        marcas={marcas}
        proveedores={proveedores.map((proveedor) => ({
          id: proveedor.id,
          nombre: proveedor.razonSocial,
        }))}
        variantes={variantes}
      />
    </div>
  );
}
