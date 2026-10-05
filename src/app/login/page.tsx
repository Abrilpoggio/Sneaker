import type { Metadata } from "next";

import { LoginForm } from "@/modules/auth/components/login-form";
import { googleOAuthHabilitado } from "@/lib/env";

export const metadata: Metadata = {
  title: "Ingresar",
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
    typeof params.callbackUrl === "string" ? params.callbackUrl : "/cuenta";
  const exito = typeof params.exito === "string" ? params.exito : undefined;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">Ingresar</h1>
      <p className="mt-1 text-sm text-texto-tenue">
        Para comprar o guardar favoritos necesitas una cuenta.
      </p>

      {exito && (
        <p
          role="status"
          className="mt-4 rounded-md bg-fondo-suave px-3 py-2 text-sm"
        >
          {exito}
        </p>
      )}

      <div className="mt-6">
        <LoginForm
          callbackUrl={callbackUrl}
          googleHabilitado={googleOAuthHabilitado()}
        />
      </div>
    </div>
  );
}
