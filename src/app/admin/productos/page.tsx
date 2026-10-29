import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Prisma } from "@/generated/prisma/client";
import { cambiarEstadoProductoAdmin } from "@/modules/catalogo/admin-actions";
import { formatoPrecio } from "@/modules/catalogo/productos";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Gestion de productos" };

export default async function ProductosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { q = "", estado = "TODOS" } = await searchParams;
  const filtros: Prisma.ProductoWhereInput[] = [];
  if (estado === "ACTIVO" || estado === "INACTIVO") {
    filtros.push({ estado });
  }
  const termino = q.trim();
  if (termino) {
    filtros.push({
      OR: [
        { nombre: { contains: termino, mode: "insensitive" } },
        { sku: { contains: termino, mode: "insensitive" } },
        { marca: { is: { nombre: { contains: termino, mode: "insensitive" } } } },
      ],
    });
  }

  const productos = await prisma.producto.findMany({
    where: filtros.length ? { AND: filtros } : undefined,
    include: {
      categoria: { select: { nombre: true } },
      marca: { select: { nombre: true } },
      variantes: { select: { stockActual: true } },
      etiquetas: { include: { etiqueta: { select: { nombre: true } } } },
    },
    orderBy: [{ estado: "asc" }, { actualizadoEn: "desc" }],
  });

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">Catalogo</p>
          <h1 className="mt-1 text-3xl font-bold text-[#2C2C2C]">Gestion de Productos</h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">Alta, edicion y baja logica de productos. Las fotos pueden ser rutas locales o URLs.</p>
        </div>
        <Link href="/admin/productos/nuevo" className="rounded bg-[#CF1A1F] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7C0300]">
          + Agregar Nuevo Producto
        </Link>
      </header>

      <form method="get" className="grid gap-3 rounded-md border border-[#D9D9D9] bg-[#FAFAFA] p-4 sm:grid-cols-[1fr_210px_auto]">
        <label className="sr-only" htmlFor="buscar-producto">Buscar producto</label>
        <input id="buscar-producto" name="q" defaultValue={q} placeholder="Buscar por nombre, SKU o marca" className={inputClass} />
        <label className="sr-only" htmlFor="estado-producto">Estado</label>
        <select id="estado-producto" name="estado" defaultValue={estado} className={inputClass}>
          <option value="TODOS">Todos los estados</option>
          <option value="ACTIVO">Activos</option>
          <option value="INACTIVO">Inactivos</option>
        </select>
        <button className="rounded border border-[#2C2C2C] px-5 py-2 text-sm font-semibold text-[#2C2C2C] hover:bg-white">Filtrar</button>
      </form>

      <div className="overflow-x-auto rounded-md border border-[#D9D9D9]">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="bg-[#2C2C2C] text-white">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Categoria / Marca</th>
              <th className="px-4 py-3">Variantes</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => {
              const stock = producto.variantes.reduce((total, variante) => total + variante.stockActual, 0);
              return (
                <tr key={producto.id} className="border-t border-[#D9D9D9] odd:bg-white even:bg-[#FAFAFA]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-[#2C2C2C]">
                        {producto.imagen && <Image src={producto.imagen} alt="" fill sizes="56px" className="object-cover" />}
                      </div>
                      <div>
                        <p className="font-semibold text-[#2C2C2C]">{producto.nombre}</p>
                        <p className="text-xs text-[#6B6B6B]">{producto.etiquetas.map(({ etiqueta }) => etiqueta.nombre).join(", ") || "Sin etiquetas"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{producto.sku}</td>
                  <td className="px-4 py-3">{producto.categoria.nombre}<span className="block text-xs text-[#6B6B6B]">{producto.marca.nombre}</span></td>
                  <td className="px-4 py-3">{producto.variantes.length}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{stock}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{formatoPrecio(Number(producto.precioVenta))}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${producto.estado === "ACTIVO" ? "bg-green-100 text-green-800" : "bg-[#F5F5F5] text-[#6B6B6B]"}`}>
                      {producto.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/productos/${producto.id}`} className="font-semibold text-[#CF1A1F] underline">Editar</Link>
                      <form action={cambiarEstadoProductoAdmin}>
                        <input type="hidden" name="productoId" value={producto.id} />
                        <input type="hidden" name="estado" value={producto.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO"} />
                        <button className="text-xs text-[#4E4E4E] underline">
                          {producto.estado === "ACTIVO" ? "Desactivar" : "Reactivar"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {productos.length === 0 && <p className="p-8 text-center text-sm text-[#6B6B6B]">No hay productos que coincidan con la busqueda.</p>}
      </div>
      <p className="text-xs text-[#6B6B6B]">{productos.length} productos. Desactivar conserva sus pedidos historicos y los oculta del catalogo.</p>
    </div>
  );
}

const inputClass = "w-full rounded border border-[#D9D9D9] bg-white px-3 py-2 text-sm text-[#2C2C2C] outline-none focus:border-[#CF1A1F] focus:ring-1 focus:ring-[#CF1A1F]";
