import type { Metadata } from "next";
import Link from "next/link";

import { requireAdmin } from "@/lib/permissions";
import { formatoPrecio } from "@/modules/catalogo/productos";
import { listarKits } from "@/modules/kits/services/kits";

export const metadata: Metadata = { title: "Gestion de kits" };

/**
 * ABM de kits (Sprint 4 - Camila Viegas. RF-38, RF-39, RN-06).
 * El stock mostrado es calculado en el momento: nunca se persiste.
 */
export default async function KitsAdminPage() {
  await requireAdmin();
  const kits = await listarKits();

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">Inventario</p>
          <h1 className="mt-1 text-3xl font-bold text-[#2C2C2C]">Gestion de Kits</h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">
            Un kit se vende como una unidad y descuenta el stock de cada componente. El
            stock disponible es el del componente que alcanza para menos kits (RN-06).
          </p>
        </div>
        <Link
          href="/admin/kits/nuevo"
          className="rounded bg-[#CF1A1F] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#7C0300]"
        >
          + Nuevo kit
        </Link>
      </header>

      <div className="overflow-x-auto rounded-md border border-[#D9D9D9]">
        <table className="w-full min-w-[950px] border-collapse text-left text-sm">
          <thead className="bg-[#2C2C2C] text-white">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Kit</th>
              <th className="px-4 py-3">Composicion</th>
              <th className="px-4 py-3">Stock calculado</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Accion</th>
            </tr>
          </thead>
          <tbody>
            {kits.map((kit) => (
              <tr
                key={kit.productoId}
                className="border-t border-[#D9D9D9] align-top odd:bg-white even:bg-[#FAFAFA]"
              >
                <td className="px-4 py-3 font-mono text-xs">{kit.sku}</td>
                <td className="px-4 py-3 font-semibold">
                  {kit.nombre}
                  <span className="block text-xs font-normal text-[#6B6B6B]">
                    {kit.categoria} · {kit.marca}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <ul className="flex flex-col gap-1 text-xs text-[#4E4E4E]">
                    {kit.componentes.map((componente) => (
                      <li key={componente.varianteId}>
                        {componente.cantidad} x {componente.titulo}
                        <span className="text-[#9E9E9E]"> ({componente.stockComponente} u.)</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-base font-bold tabular-nums ${
                      kit.stockCalculado > 0
                        ? "bg-[#E8F5E9] text-[#1B5E20]"
                        : "bg-[#FFEBEE] text-[#B71C1C]"
                    }`}
                  >
                    {kit.stockCalculado}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums">{formatoPrecio(kit.precioVenta)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-semibold ${
                      kit.estado === "ACTIVO"
                        ? "bg-[#E8F5E9] text-[#1B5E20]"
                        : "bg-[#EEEEEE] text-[#616161]"
                    }`}
                  >
                    {kit.estado === "ACTIVO" ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/kits/${kit.productoId}`}
                    className="font-semibold text-[#CF1A1F] underline"
                  >
                    Gestionar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {kits.length === 0 && (
          <p className="p-8 text-center text-sm text-[#6B6B6B]">
            Todavia no hay kits. Crea el primero con el boton &quot;Nuevo kit&quot;.
          </p>
        )}
      </div>
    </div>
  );
}
