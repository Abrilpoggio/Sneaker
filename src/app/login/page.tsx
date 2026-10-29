import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  AuthShell,
  EnlaceAuthInferior,
} from "@/modules/auth/components/auth-shell";
import { LoginForm } from "@/modules/auth/components/login-form";
import { googleOAuthHabilitado } from "@/lib/env";
import { sesionActual } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

const RUTAS_AUTH = new Set(["/login", "/registro", "/recuperar"]);

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const rawCb = typeof params.callbackUrl === "string" ? params.callbackUrl : "";
  const pathnameCb = rawCb.split("?")[0] ?? "";
  const callbackUrl =
    rawCb.startsWith("/") && !rawCb.startsWith("//") && !RUTAS_AUTH.has(pathnameCb)
      ? rawCb
      : "/";

  // Precondicion de CU2 (DUP p. 17): "No tener sesion iniciada".
  const sesion = await sesionActual();
  if (sesion?.user) {
    redirect(callbackUrl);
  }

  const exito = typeof params.exito === "string" ? params.exito : undefined;
  const registroHref =
    callbackUrl !== "/"
      ? `/registro?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/registro";

  return (
    <AuthShell
      bottomContent={
        <>
          <EnlaceAuthInferior
            pregunta="¿No tienes una cuenta?"
            accion="Regístrate"
            href={registroHref}
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
