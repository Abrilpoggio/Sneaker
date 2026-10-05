"use client";

import { signIn, signOut, useSession } from "next-auth/react";

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

export { signIn, signOut };
