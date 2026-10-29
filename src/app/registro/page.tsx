import type { Metadata } from "next";
import { redirect } from "next/navigation";

import {
  AuthShell,
  EnlaceAuthInferior,
} from "@/modules/auth/components/auth-shell";
import { RegistroForm } from "@/modules/auth/components/registro-form";
import { googleOAuthHabilitado } from "@/lib/env";
import { sesionActual } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

const RUTAS_AUTH = new Set(["/login", "/registro", "/recuperar"]);

export default async function PaginaRegistro({
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

  const loginHref =
    callbackUrl !== "/"
      ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/login";

  return (
    <AuthShell
      bottomContent={
        <EnlaceAuthInferior
          pregunta="¿Tienes una cuenta?"
          accion="Inicia sesión"
          href={loginHref}
        />
      }
    >
      <RegistroForm
        callbackUrl={callbackUrl}
        googleHabilitado={googleOAuthHabilitado()}
      />
    </AuthShell>
  );
}
