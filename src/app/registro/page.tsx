import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  AuthShell,
  EnlaceAuthInferior,
} from "@/modules/auth/components/auth-shell";
import { RegistroForm } from "@/modules/auth/components/registro-form";
import { googleOAuthHabilitado } from "@/lib/env";
import { sesionActual, esAdmin } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default async function PaginaRegistro() {
  // Precondicion de CU2 (DUP p. 17): "No tener sesion iniciada".
  const sesion = await sesionActual();
  if (sesion?.user) {
    redirect(esAdmin(sesion.user.rol) ? "/admin" : "/cuenta");
  }

  return (
    <AuthShell
      bottomContent={
        <EnlaceAuthInferior
          pregunta="¿Tienes una cuenta?"
          accion="Inicia sesión"
          href="/login"
        />
      }
    >
      <RegistroForm googleHabilitado={googleOAuthHabilitado()} />
    </AuthShell>
  );
}
