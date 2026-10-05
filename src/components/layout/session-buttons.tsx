"use client";

import Link from "next/link";

import { useSesion, signOut } from "@/lib/auth-client";
import { RolUsuario } from "@/generated/prisma/enums";

/**
 * Bloque de sesion del header (RN-01, RNF-08).
 *
 * El boton de "Panel" solo se renderiza para ADMIN. Ojo: esto es solo
 * visibilidad de interfaz. Ocultar el link NO es seguridad: el control real
 * esta en `requireAdmin()` y corre en el servidor, de modo que escribir
 * /admin a mano no alcanza.
 */
export function SessionButtons() {
  const { data: sesion, status } = useSesion();

  if (status === "loading") {
    return <span className="h-9 w-24 animate-pulse rounded-md bg-fondo-suave" />;
  }

  if (!sesion?.user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-9 items-center rounded-md bg-marca px-4 text-sm font-medium text-marca-contraste hover:opacity-90 transition-opacity"
      >
        Ingresar
      </Link>
    );
  }

  const esAdmin = sesion.user.rol === RolUsuario.ADMIN;

  return (
    <div className="flex items-center gap-3">
      {esAdmin && (
        <Link
          href="/admin"
          className="inline-flex h-9 items-center rounded-md border border-borde px-3 text-sm font-medium hover:border-acento hover:text-acento transition-colors"
        >
          Panel
        </Link>
      )}

      <Link
        href="/cuenta"
        className="hidden text-sm text-texto hover:text-acento transition-colors sm:inline"
      >
        Mi cuenta
      </Link>

      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: "/" })}
        className="inline-flex h-9 items-center rounded-md border border-borde px-3 text-sm text-texto hover:border-acento hover:text-acento transition-colors"
      >
        Salir
      </button>
    </div>
  );
}
