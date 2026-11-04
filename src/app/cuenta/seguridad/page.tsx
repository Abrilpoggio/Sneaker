import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireCliente } from "@/lib/permissions";
import { SeguridadPanel } from "@/modules/clients/components/seguridad-panel";
import {
  ErrorNegocioCliente,
  obtenerDatosCuentaCliente,
} from "@/modules/clients/services/perfil";

export const metadata: Metadata = {
  title: "Seguridad",
};

/**
 * Vista "Seguridad" (`/cuenta/seguridad` - Figma nodo `341:947`).
 *
 * Permite cambiar la contrasena con verificacion de contrasena actual (o
 * definir una contrasena local si el cliente ingreso originalmente con Google).
 */
export default async function PaginaSeguridadCuenta() {
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

  return (
    <SeguridadPanel
      tienePassword={cuenta.usuario.tienePassword}
      tieneGoogle={cuenta.usuario.tieneGoogle}
    />
  );
}

