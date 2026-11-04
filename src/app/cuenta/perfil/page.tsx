import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireCliente } from "@/lib/permissions";
import { PerfilPanel } from "@/modules/clients/components/perfil-panel";
import {
  ErrorNegocioCliente,
  obtenerDatosCuentaCliente,
} from "@/modules/clients/services/perfil";

export const metadata: Metadata = {
  title: "Información de perfil",
};

/**
 * Vista "Informacion de perfil" (`/cuenta/perfil` - Figma nodo `334:818`).
 *
 * Sprint 2 - CU3, RF-15, RF-16, RN-03:
 * Edicion de datos personales bloqueando `usuario`, `correo` y `dni` registrado.
 */
export default async function PaginaInformacionPerfil({
  searchParams,
}: {
  searchParams: Promise<{ editar?: string }>;
}) {
  const [sesion, params] = await Promise.all([requireCliente(), searchParams]);
  const cuenta = await obtenerDatosCuentaCliente(
    sesion.user.id,
    sesion.user.email,
  ).catch((error: unknown) => {
    if (error instanceof ErrorNegocioCliente) {
      redirect("/login");
    }
    throw error;
  });

  return (
    <PerfilPanel
      usuario={{
        usuario: cuenta.usuario.usuario,
        correo: cuenta.usuario.correo,
        rol: cuenta.usuario.rol,
        creadoEnIso: cuenta.usuario.creadoEn.toISOString(),
        tienePassword: cuenta.usuario.tienePassword,
        tieneGoogle: cuenta.usuario.tieneGoogle,
      }}
      cliente={
        cuenta.cliente
          ? {
              nombre: cuenta.cliente.nombre,
              apellido: cuenta.cliente.apellido,
              telefono: cuenta.cliente.telefono,
              dni: cuenta.cliente.dni,
            }
          : null
      }
      iniciarEnEdicion={params.editar === "1"}
    />
  );
}

