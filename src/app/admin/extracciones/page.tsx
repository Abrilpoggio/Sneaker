import type { Metadata } from "next";

import { requireAdmin } from "@/lib/permissions";
import { ExtraccionForm } from "@/modules/inventory/components/extraccion-form";
import {
  listarExtracciones,
  listarVariantesExtraccion,
} from "@/modules/inventory/services/extracciones";

export const metadata: Metadata = { title: "Extracciones de stock" };

/**
 * Registro de extracciones (Sprint 4 - Camila Viegas. RF-36, RN-07).
 * Cada extraccion descuenta stock y queda auditada con motivo,
 * responsable, fecha y stock resultante.
 */
export default async function ExtraccionesAdminPage() {
  const sesion = await requireAdmin();
  const [variantes, extracciones] = await Promise.all([
    listarVariantesExtraccion(),
    listarExtracciones(),
  ]);

  const totalExtraido = extracciones.reduce(
    (total, extraccion) => total + extraccion.cantidad,
    0,
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">Inventario</p>
          <h1 className="mt-1 text-3xl font-bold text-[#2C2C2C]">Extracciones de stock</h1>
          <p className="mt-2 max-w-3xl text-sm text-[#6B6B6B]">
            Una extraccion descuenta unidades sin contarse como venta (RN-07). Queda
            registrada con motivo, responsable y stock resultante para auditoria.
          </p>
        </div>
        <div className="rounded-md border border-[#D9D9D9] bg-[#FAFAFA] px-5 py-3 text-right">
          <p className="text-2xl font-bold tabular-nums text-[#2C2C2C]">{totalExtraido}</p>
          <p className="text-xs text-[#6B6B6B]">
            unidades en las ultimas {extracciones.length} extracciones
          </p>
        </div>
      </header>

      <section className="rounded-md border border-[#D9D9D9] p-5">
        <h2 className="text-xl font-bold text-[#2C2C2C]">Registrar extraccion</h2>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          El motivo es obligatorio y el stock se descuenta de forma atomica: si no
          alcanza, no se registra nada.
        </p>
        <div className="mt-4">
          <ExtraccionForm
            variantes={variantes}
            responsable={{
              nombre: sesion.user.name ?? sesion.user.email ?? "Usuario",
              correo: sesion.user.email ?? "",
            }}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold text-[#2C2C2C]">Ultimas extracciones</h2>
        <div className="overflow-x-auto rounded-md border border-[#D9D9D9]">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-[#2C2C2C] text-white">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Variante</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Stock resultante</th>
              </tr>
            </thead>
            <tbody>
              {extracciones.map((extraccion) => (
                <tr
                  key={extraccion.id}
                  className="border-t border-[#D9D9D9] align-top odd:bg-white even:bg-[#FAFAFA]"
                >
                  <td className="px-4 py-3 text-xs text-[#6B6B6B]">
                    {extraccion.fecha.toLocaleString("es-AR")}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {extraccion.producto}
                    <span className="block font-mono text-xs font-normal text-[#6B6B6B]">
                      {extraccion.sku}
                    </span>
                  </td>
                  <td className="px-4 py-3">{extraccion.variante}</td>
                  <td className="px-4 py-3 font-bold tabular-nums text-[#B71C1C]">
                    -{extraccion.cantidad}
                  </td>
                  <td className="max-w-[300px] px-4 py-3">{extraccion.motivo ?? "—"}</td>
                  <td className="px-4 py-3">
                    {extraccion.responsable}
                    <span className="block text-xs text-[#6B6B6B]">
                      {extraccion.responsableCorreo}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {extraccion.stockResultante ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {extracciones.length === 0 && (
            <p className="p-8 text-center text-sm text-[#6B6B6B]">
              Todavia no hay extracciones registradas.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
