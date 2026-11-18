import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { calcularStockKit } from "@/modules/inventory/services/stock";
import { KitAcciones } from "@/modules/kits/components/kit-acciones";
import { KitForm } from "@/modules/kits/components/kit-form";
import {
  listarVariantesComponentes,
  obtenerKit,
} from "@/modules/kits/services/kits";

export const metadata: Metadata = { title: "Editar kit" };

export default async function KitAdminDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const kit = await obtenerKit(id);
  if (!kit) notFound();

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
    listarVariantesComponentes(kit.componentes.map((componente) => componente.varianteId)),
  ]);

  const stockCalculado = calcularStockKit(kit.componentes);
  const componentesSeleccionados = new Map(
    kit.componentes.map((componente) => [
      componente.varianteId,
      {
        titulo: `${componente.variante.producto.nombre} (${[
          componente.variante.talle,
          componente.variante.color,
          componente.variante.material,
        ]
          .filter(Boolean)
          .join(" · ") || "Variante única"})`,
        cantidad: componente.cantidad,
        stock: componente.variante.stockActual,
      },
    ]),
  );

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/kits" className="w-fit text-sm font-semibold text-[#2C2C2C] underline">
        ← Volver a kits
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">
            {kit.producto.sku} · {kit.producto.estado}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-[#2C2C2C]">{kit.producto.nombre}</h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            {kit.componentes.length} componentes · stock calculado{" "}
            <span className="font-bold text-[#2C2C2C]">{stockCalculado}</span> unidades (RN-06)
          </p>
        </div>
      </header>

      <section className="rounded-md border border-[#D9D9D9] p-5">
        <h2 className="text-xl font-bold text-[#2C2C2C]">Estado del kit</h2>
        <div className="mt-3">
          <KitAcciones productoId={kit.productoId} estado={kit.producto.estado} />
        </div>
      </section>

      <section className="rounded-md border border-[#D9D9D9] p-5">
        <h2 className="mb-4 text-xl font-bold text-[#2C2C2C]">Datos y componentes</h2>
        <KitForm
          categorias={categorias}
          marcas={marcas}
          proveedores={proveedores.map((proveedor) => ({
            id: proveedor.id,
            nombre: proveedor.razonSocial,
          }))}
          variantes={variantes}
          kit={{
            productoId: kit.productoId,
            sku: kit.producto.sku,
            nombre: kit.producto.nombre,
            descripcion: kit.producto.descripcion,
            precioVenta: kit.producto.precioVenta.toString(),
            costoCompra: kit.producto.costoCompra.toString(),
            garantia: kit.producto.garantia ?? "",
            imagen: kit.producto.imagen ?? "",
            estado: kit.producto.estado,
            categoriaId: kit.producto.categoriaId,
            marcaId: kit.producto.marcaId,
            proveedorId: kit.producto.proveedorId ?? "",
            componentes: kit.componentes.map((componente) => ({
              varianteId: componente.varianteId,
              cantidad: componente.cantidad,
            })),
          }}
        />
      </section>

      <section className="rounded-md border border-[#D9D9D9] p-5">
        <h2 className="text-xl font-bold text-[#2C2C2C]">Detalle de stock por componente</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm text-[#4E4E4E]">
          {[...componentesSeleccionados].map(([varianteId, componente]) => (
            <li
              key={varianteId}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#E5E5E5] px-3 py-2"
            >
              <span>
                {componente.cantidad} x {componente.titulo}
              </span>
              <span className="tabular-nums">
                {componente.stock} u. disponibles
                <span className="text-[#9E9E9E]">
                  {" "}
                  · alcanza para {Math.floor(componente.stock / componente.cantidad)} kits
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
