import type { Metadata } from "next";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Variantes y stock" };

export default async function VariantesAdminPage() {
  const variantes = await prisma.varianteProducto.findMany({
    include: {
      producto: {
        select: {
          id: true,
          sku: true,
          nombre: true,
          estado: true,
          categoria: { select: { nombre: true } },
          marca: { select: { nombre: true } },
        },
      },
      _count: { select: { movimientos: true, itemsPedido: true } },
    },
    orderBy: [{ producto: { nombre: "asc" } }, { talle: "asc" }],
  });

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">Inventario</p>
        <h1 className="mt-1 text-3xl font-bold text-[#2C2C2C]">Variantes y Stock</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">Para editar datos o ajustar stock con motivo, abre la ficha del producto.</p>
      </header>

      <div className="overflow-x-auto rounded-md border border-[#D9D9D9]">
        <table className="w-full min-w-[850px] border-collapse text-left text-sm">
          <thead className="bg-[#2C2C2C] text-white">
            <tr><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Producto</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Talle</th><th className="px-4 py-3">Color</th><th className="px-4 py-3">Material</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Movimientos</th><th className="px-4 py-3">Accion</th></tr>
          </thead>
          <tbody>
            {variantes.map((v) => (
              <tr key={v.id} className="border-t border-[#D9D9D9] odd:bg-white even:bg-[#FAFAFA]">
                <td className="px-4 py-3 font-mono text-xs">{v.producto.sku}</td>
                <td className="px-4 py-3 font-semibold">{v.producto.nombre}<span className="block text-xs font-normal text-[#6B6B6B]">{v.producto.marca.nombre}</span></td>
                <td className="px-4 py-3">{v.producto.categoria.nombre}</td>
                <td className="px-4 py-3">{v.talle ?? "—"}</td>
                <td className="px-4 py-3">{v.color ?? "—"}</td>
                <td className="px-4 py-3">{v.material ?? "—"}</td>
                <td className="px-4 py-3 font-bold tabular-nums">{v.stockActual}</td>
                <td className="px-4 py-3">{v._count.movimientos}</td>
                <td className="px-4 py-3"><Link href={`/admin/productos/${v.producto.id}`} className="font-semibold text-[#CF1A1F] underline">Gestionar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {variantes.length === 0 && <p className="p-8 text-center text-sm text-[#6B6B6B]">No hay variantes registradas.</p>}
      </div>
    </div>
  );
}
