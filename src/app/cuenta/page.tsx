import type { Metadata } from "next";

import { requireSesion } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Mi cuenta",
};

/**
 * Panel de perfil (RF-15, RF-16).
 *
 * RN-03: el usuario y el correo se muestran solo lectura. La validacion de
 * "no me los mandes por POST igual" esta en el schema `perfilSchema`, que
 * no incluye esos campos, y en la accion de servidor del Sprint 2.
 */
export default async function PaginaCuenta() {
  const sesion = await requireSesion();

  const cliente = await prisma.cliente.findUnique({
    where: { usuarioId: sesion.user.id },
    include: {
      usuario: { select: { usuario: true, correo: true, rol: true } },
      _count: { select: { direcciones: true, pedidos: true, favoritos: true } },
    },
  });

  if (!cliente) {
    // Un ADMIN no tiene fila en clientes: entra igual al panel pero no hay
    // perfil que mostrar.
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Mi cuenta</h1>
        <p className="text-sm text-texto-tenue">
          Esta sesion no tiene un perfil de cliente asociado.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold">
          Hola, {cliente.nombre}
        </h1>
        <p className="mt-1 text-sm text-texto-tenue">
          Tus datos de contacto y envios.
        </p>
      </header>

      <section aria-labelledby="titulo-datos">
        <h2 id="titulo-datos" className="text-sm font-semibold uppercase tracking-wide text-texto-tenue">
          Datos de la cuenta
        </h2>

        <dl className="mt-3 divide-y divide-borde rounded-card border border-borde">
          {[
            { termino: "Usuario", descripcion: cliente.usuario.usuario, editable: false },
            { termino: "Correo", descripcion: cliente.usuario.correo, editable: false },
            { termino: "Nombre", descripcion: cliente.nombre, editable: true },
            { termino: "Apellido", descripcion: cliente.apellido, editable: true },
            { termino: "Telefono", descripcion: cliente.telefono ?? "—", editable: true },
            { termino: "DNI", descripcion: cliente.dni ?? "—", editable: false },
          ].map((dato) => (
            <div key={dato.termino} className="flex items-center justify-between px-4 py-3">
              <dt className="text-sm text-texto-tenue">{dato.termino}</dt>
              <dd className="flex items-center gap-2 text-sm">
                {dato.descripcion}
                {!dato.editable && (
                  <span className="rounded bg-fondo-suave px-1.5 py-0.5 text-xs text-texto-tenue">
                    no editable
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="titulo-resumen">
        <h2 id="titulo-resumen" className="text-sm font-semibold uppercase tracking-wide text-texto-tenue">
          Resumen
        </h2>

        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          {[
            { etiqueta: "Direcciones", valor: cliente._count.direcciones },
            { etiqueta: "Pedidos", valor: cliente._count.pedidos },
            { etiqueta: "Favoritos", valor: cliente._count.favoritos },
          ].map((item) => (
            <div key={item.etiqueta} className="rounded-card border border-borde p-4">
              <p className="text-2xl font-semibold tabular-nums">{item.valor}</p>
              <p className="mt-1 text-sm text-texto-tenue">{item.etiqueta}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-sm text-texto-tenue">
        La edicion de datos y el alta de direcciones se habilitan en el
        Sprint 2. El limite es de 3 direcciones por cliente (RN-02).
      </p>
    </div>
  );
}
