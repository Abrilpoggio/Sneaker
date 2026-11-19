import type { Metadata } from "next";
import Link from "next/link";

import {
  AuthShell,
  EnlaceAuthInferior,
} from "@/modules/auth/components/auth-shell";
import { RestablecerForm } from "@/modules/auth/components/restablecer-form";
import { verificarTokenRecuperacion } from "@/modules/auth/services/recuperacion";

export const metadata: Metadata = {
  title: "Restablecer contraseña · Sneaker",
};

export const dynamic = "force-dynamic";

export default async function PaginaRestablecerPassword({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const verificacion = token
    ? await verificarTokenRecuperacion(token)
    : { valido: false, motivo: "Falta el token de recuperación en el enlace." };

  return (
    <AuthShell
      bottomContent={
        <EnlaceAuthInferior
          pregunta="¿Recordaste tu contraseña?"
          accion="Iniciá sesión"
          href="/login"
        />
      }
    >
      {verificacion.valido && verificacion.usuario && token ? (
        <RestablecerForm token={token} correo={verificacion.usuario.correo} />
      ) : (
        <div className="flex min-h-[340px] w-full max-w-[531px] flex-col items-center justify-center gap-5 rounded-[40px] bg-[linear-gradient(180deg,rgba(255,0,7,0.8)_0%,rgba(153,0,4,1)_100%)] px-6 py-9 text-center text-white shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)]">
          <h1 className="text-[24px] font-semibold uppercase">
            ENLACE NO VÁLIDO
          </h1>
          <p className="max-w-[360px] text-sm leading-relaxed text-white/95">
            {verificacion.motivo ??
              "El enlace de recuperación expiró o ya fue utilizado."}
          </p>
          <Link
            href="/recuperar"
            className="inline-flex h-[44px] items-center justify-center rounded-[9px] bg-[#2C2C2C] px-6 text-base font-semibold text-white transition-opacity hover:opacity-90"
          >
            Solicitar un nuevo enlace
          </Link>
        </div>
      )}
    </AuthShell>
  );
}
