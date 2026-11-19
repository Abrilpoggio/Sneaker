import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ProductoForm } from "@/modules/catalogo/components/producto-form";
import { EliminarVarianteButton, VarianteForm } from "@/modules/catalogo/components/variante-form";
import { formatoPrecio } from "@/modules/catalogo/productos";
import { calcularStockProducto } from "@/modules/inventory/services/stock";

export const metadata: Metadata = { title: "Editar producto" };

export default async function ProductoAdminDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [producto, categorias, marcas, proveedores, etiquetas] = await Promise.all([
    prisma.producto.findUnique({
      where: { id },
      include: {
        variantes: {
          include: { _count: { select: { itemsCarrito: true, itemsPedido: true, movimientos: true, componentesKit: true } } },
          orderBy: [{ talle: "asc" }, { color: "asc" }],
        },
        kit: {
          include: {
            componentes: {
              include: { variante: { select: { stockActual: true } } },
            },
          },
        },
        etiquetas: { select: { etiquetaId: true, etiqueta: { select: { nombre: true } } } },
      },
    }),
    prisma.categoria.findMany({ where: { activa: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.marca.findMany({ where: { activa: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.proveedor.findMany({ where: { estado: "ACTIVO" }, orderBy: { razonSocial: "asc" }, select: { id: true, razonSocial: true } }),
    prisma.etiquetaUso.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);
  if (!producto) notFound();

  // RN-06: si el producto es un kit, el stock se deriva de sus componentes.
  const stockTotal = calcularStockProducto(producto.variantes, producto.kit);

  return (
    <div className="flex flex-col gap-8">
      <Link href="/admin/productos" className="w-fit text-sm font-semibold text-[#2C2C2C] underline">← Volver a productos</Link>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">{producto.sku}</p>
          <h1 className="mt-1 text-3xl font-bold text-[#2C2C2C]">{producto.nombre}</h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            {producto.kit
              ? `${producto.kit.componentes.length} componentes · ${stockTotal} kits disponibles (stock calculado RN-06) · ${formatoPrecio(Number(producto.precioVenta))}`
              : `${producto.variantes.length} variantes · ${stockTotal} unidades en stock · ${formatoPrecio(Number(producto.precioVenta))}`}
          </p>
          {producto.kit && (
            <Link href={`/admin/kits/${producto.id}`} className="mt-2 inline-block text-sm font-semibold text-[#CF1A1F] underline">
              Editar composición del kit →
            </Link>
          )}
        </div>
      </header>

      <section className="flex flex-col gap-5 rounded-md border border-[#D9D9D9] p-5">
        <h2 className="text-xl font-bold text-[#2C2C2C]">Datos del producto</h2>
        <ProductoForm
          categorias={categorias}
          marcas={marcas}
          proveedores={proveedores.map((p) => ({ id: p.id, nombre: p.razonSocial }))}
          etiquetas={etiquetas}
          producto={{
            id: producto.id,
            sku: producto.sku,
            nombre: producto.nombre,
            descripcion: producto.descripcion,
            precioVenta: producto.precioVenta.toString(),
            costoCompra: producto.costoCompra.toString(),
            garantia: producto.garantia ?? "",
            imagen: producto.imagen ?? "",
            estado: producto.estado,
            categoriaId: producto.categoriaId,
            marcaId: producto.marcaId,
            proveedorId: producto.proveedorId ?? "",
            etiquetaIds: producto.etiquetas.map((e) => e.etiquetaId),
          }}
        />
      </section>

      {producto.kit ? (
        <section className="flex flex-col gap-3 rounded-md border border-[#D9D9D9] bg-[#FAFAFA] p-5">
          <h2 className="text-xl font-bold text-[#2C2C2C]">Composición y stock del kit</h2>
          <p className="text-sm text-[#6B6B6B]">
            Este producto es un kit: su stock disponible ({stockTotal} unidades) se calcula automáticamente a partir de sus {producto.kit.componentes.length} componentes.
          </p>
          <Link
            href={`/admin/kits/${producto.id}`}
            className="w-fit rounded bg-[#CF1A1F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7C0300]"
          >
            Administrar componentes del kit →
          </Link>
        </section>
      ) : (
        <section className="flex flex-col gap-5 rounded-md border border-[#D9D9D9] p-5">
          <header>
            <h2 className="text-xl font-bold text-[#2C2C2C]">Variantes y stock</h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">Los ajustes de stock quedan registrados con responsable y motivo.</p>
          </header>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] border-collapse text-left text-sm">
              <thead className="bg-[#2C2C2C] text-white">
                <tr>
                  <th className="px-3 py-3">Talle</th><th className="px-3 py-3">Color</th><th className="px-3 py-3">Material</th><th className="px-3 py-3">Stock</th><th className="px-3 py-3">Historial</th><th className="px-3 py-3">Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {producto.variantes.map((v) => (
                  <tr key={v.id} className="border-t border-[#D9D9D9] align-top odd:bg-white even:bg-[#FAFAFA]">
                    <td colSpan={6} className="p-3">
                      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-[#6B6B6B] md:grid-cols-6">
                        <span>{v.talle ?? "—"}</span><span>{v.color ?? "—"}</span><span>{v.material ?? "—"}</span><span className="font-bold text-[#2C2C2C]">{v.stockActual} un.</span><span>{v._count.movimientos} mov.</span>
                        <EliminarVarianteButton productoId={producto.id} varianteId={v.id} />
                      </div>
                      <VarianteForm productoId={producto.id} variante={{ id: v.id, talle: v.talle, color: v.color, material: v.material, stockActual: v.stockActual }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="rounded-md border border-[#D9D9D9] p-4">
            <summary className="cursor-pointer font-semibold text-[#CF1A1F]">+ Agregar variante</summary>
            <div className="mt-4"><VarianteForm productoId={producto.id} /></div>
          </details>
        </section>
      )}
    </div>
  );
}
