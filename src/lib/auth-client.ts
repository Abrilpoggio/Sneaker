"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

const RUTAS_AUTH = new Set(["/login", "/registro", "/recuperar"]);

/**
 * Cliente de Auth.js para componentes de navegador.
 *
 * Solo se usa dentro de archivos "use client". Para leer el estado de
 * sesion en un Server Component se usa `auth()` de `@/lib/auth`, que corre
 * en el servidor.
 */
export function useSesion() {
  return useSession();
}

/**
 * Calcula las URLs de autenticacion conservando la ventana actual como
 * `callbackUrl`, de modo que al iniciar sesion (o pulsar VOLVER) el usuario
 * regrese exactamente a donde estaba o al inicio (`/`).
 */
export function useRutasAuth(): {
  loginHref: string;
  registroHref: string;
  volverHref: string;
} {
  const pathname = usePathname() ?? "/";
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch(window.location.search);
  }, [pathname]);

  if (RUTAS_AUTH.has(pathname)) {
    const params = new URLSearchParams(search);
    const cb = params.get("callbackUrl");
    const destinoValido =
      cb && cb.startsWith("/") && !cb.startsWith("//") && !RUTAS_AUTH.has(cb)
        ? cb
        : "/";
    const query =
      destinoValido !== "/"
        ? `?callbackUrl=${encodeURIComponent(destinoValido)}`
        : "";

    return {
      loginHref: `/login${query}`,
      registroHref: `/registro${query}`,
      volverHref: destinoValido,
    };
  }

  const rutaActual = `${pathname}${search}`;
  const query =
    rutaActual && rutaActual !== "/"
      ? `?callbackUrl=${encodeURIComponent(rutaActual)}`
      : "";

  return {
    loginHref: `/login${query}`,
    registroHref: `/registro${query}`,
    volverHref: "/",
  };
}

export { signIn, signOut };
