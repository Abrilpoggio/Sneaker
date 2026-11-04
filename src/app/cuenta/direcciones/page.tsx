import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireCliente } from "@/lib/permissions";
import { DireccionesManager } from "@/modules/clients/components/direcciones-manager";
import { listarDireccionesCliente } from "@/modules/clients/services/direcciones";
import {
  ErrorNegocioCliente,
  obtenerDatosCuentaCliente,
} from "@/modules/clients/services/perfil";

export const metadata: Metadata = {
  title: "Mis direcciones",
};

/**
 * Vista "Mis direcciones" (`/cuenta/direcciones` - Figma `Vista 8`, nodo `226:3609`).
 *
 * Sprint 2 - CU3, RF-17, RF-18, RF-19, RN-02:
 * CRUD completo de direcciones de envio con validacion de limite maximo de 3
 * direcciones por cliente (`RN-02`), seleccion de predeterminada y soporte de
 * destinatario distinto al titular de la cuenta (`RF-19`).
 */
export default async function PaginaDireccionesCuenta() {
  const sesion = await requireCliente();

  const cuenta = await obtenerDatosCuentaCliente(
    sesion.user.id,
    sesion.user.email,
  ).catch((error: unknown) => {
    if (error instanceof ErrorNegocioCliente) {
      redirect("/login");
    }
    throw error;
  });

  const direcciones = await listarDireccionesCliente(cuenta.usuario.id);

  const destinatarioSugerido = cuenta.cliente
    ? [
        cuenta.cliente.nombre,
        cuenta.cliente.apellido !== cuenta.cliente.nombre
          ? cuenta.cliente.apellido
          : "",
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return (
    <DireccionesManager
      puedeGestionar={Boolean(cuenta.cliente)}
      destinatarioSugerido={destinatarioSugerido}
      direcciones={direcciones.map((d) => ({
        id: d.id,
        destinatario: d.destinatario,
        calle: d.calle,
        numero: d.numero,
        piso: d.piso,
        departamento: d.departamento,
        ciudad: d.ciudad,
        provincia: d.provincia,
        codigoPostal: d.codigoPostal,
        predeterminada: d.predeterminada,
      }))}
    />
  );
}
