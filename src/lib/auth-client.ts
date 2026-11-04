"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

const RUTAS_AUTH = new Set(["/login", "/registro", "/recuperar"]);

function suscribirLocation(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function obtenerSearchCliente() {
  return window.location.search;
}

function obtenerSearchServidor() {
  return "";
}

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
  const search = useSyncExternalStore(
    suscribirLocation,
    obtenerSearchCliente,
    obtenerSearchServidor,
  );

  if (RUTAS_AUTH.has(pathname)) {
    const params = new URLSearchParams(search);
    const cb = params.get("callbackUrl");
    const pathnameCb = cb?.split("?")[0] ?? "";
    const destinoValido =
      cb && cb.startsWith("/") && !cb.startsWith("//") && !RUTAS_AUTH.has(pathnameCb)
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
