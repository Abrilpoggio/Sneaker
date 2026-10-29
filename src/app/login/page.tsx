import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  AuthShell,
  EnlaceAuthInferior,
} from "@/modules/auth/components/auth-shell";
import { LoginForm } from "@/modules/auth/components/login-form";
import { googleOAuthHabilitado } from "@/lib/env";
import { sesionActual, esAdmin } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default async function PaginaLogin({
  searchParams,
}: {
  // Tipo explicito en lugar de PageProps<"/login">: los tipos de rutas
  // generadas de Next solo existen despues de un dev/build, y hacen fallar
  // el typecheck en un repo recien clonado.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // En Next 16 los searchParams son una Promise.
  const params = await searchParams;

  const callbackUrl =
    typeof params.callbackUrl === "string" &&
    params.callbackUrl.startsWith("/") &&
    !params.callbackUrl.startsWith("//")
      ? params.callbackUrl
      : "/cuenta";

  // Precondicion de CU2 (DUP p. 17): "No tener sesion iniciada".
  const sesion = await sesionActual();
  if (sesion?.user) {
    redirect(
      esAdmin(sesion.user.rol) && callbackUrl === "/cuenta"
        ? "/admin"
        : callbackUrl,
    );
  }

  const exito = typeof params.exito === "string" ? params.exito : undefined;

  return (
    <AuthShell
      bottomContent={
        <>
          <EnlaceAuthInferior
            pregunta="¿No tienes una cuenta?"
            accion="Regístrate"
            href="/registro"
          />
          <EnlaceAuthInferior
            pregunta="¿Olvidaste tu contraseña?"
            accion="Pide ayuda"
            href="/recuperar"
          />
        </>
      }
    >
      <LoginForm
        callbackUrl={callbackUrl}
        googleHabilitado={googleOAuthHabilitado()}
        mensajeExito={exito}
      />
    </AuthShell>
  );
}
