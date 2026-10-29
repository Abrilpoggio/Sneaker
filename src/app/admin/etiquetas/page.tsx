import type { Metadata } from "next";

import { prisma } from "@/lib/prisma";
import {
  CrearEtiquetaForm,
  EditarEtiquetaForm,
  EliminarEtiquetaButton,
} from "@/modules/catalogo/components/etiquetas-crud";

export const metadata: Metadata = { title: "Etiquetas de uso" };

export default async function EtiquetasAdminPage() {
  const etiquetas = await prisma.etiquetaUso.findMany({
    include: { _count: { select: { productos: true } } },
    orderBy: { nombre: "asc" },
  });

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">Catalogo</p>
        <h1 className="mt-1 text-3xl font-bold text-[#2C2C2C]">Etiquetas de Uso</h1>
        <p className="mt-2 text-sm text-[#6B6B6B]">Administra las etiquetas que ayudan a clasificar y encontrar productos.</p>
      </header>

      <CrearEtiquetaForm />

      <div className="overflow-x-auto rounded-md border border-[#D9D9D9]">
        <table className="w-full min-w-[600px] border-collapse text-left text-sm">
          <thead className="bg-[#2C2C2C] text-white">
            <tr><th className="px-4 py-3">Etiqueta</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Productos asignados</th><th className="px-4 py-3">Editar</th><th className="px-4 py-3">Eliminar</th></tr>
          </thead>
          <tbody>
            {etiquetas.map((etiqueta) => (
              <tr key={etiqueta.id} className="border-t border-[#D9D9D9] align-middle odd:bg-white even:bg-[#FAFAFA]">
                <td className="px-4 py-3 font-semibold">{etiqueta.nombre}</td>
                <td className="px-4 py-3 font-mono text-xs">{etiqueta.slug}</td>
                <td className="px-4 py-3">{etiqueta._count.productos}</td>
                <td className="px-4 py-3"><EditarEtiquetaForm id={etiqueta.id} nombre={etiqueta.nombre} /></td>
                <td className="px-4 py-3"><EliminarEtiquetaButton id={etiqueta.id} asignada={etiqueta._count.productos > 0} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {etiquetas.length === 0 && <p className="p-8 text-center text-sm text-[#6B6B6B]">Todavia no hay etiquetas.</p>}
      </div>
    </div>
  );
}
