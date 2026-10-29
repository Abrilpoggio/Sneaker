import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  AuthShell,
  EnlaceAuthInferior,
} from "@/modules/auth/components/auth-shell";
import { RecuperarForm } from "@/modules/auth/components/recuperar-form";
import { sesionActual, esAdmin } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
};

export default async function PaginaRecuperar() {
  const sesion = await sesionActual();
  if (sesion?.user) {
    redirect(esAdmin(sesion.user.rol) ? "/admin" : "/cuenta");
  }

  return (
    <AuthShell
      bottomContent={
        <EnlaceAuthInferior
          pregunta="¿No tienes una cuenta?"
          accion="Regístrate"
          href="/registro"
        />
      }
    >
      <RecuperarForm />
    </AuthShell>
  );
}

