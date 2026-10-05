"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

/**
 * Proveedores de contexto del lado del cliente.
 *
 * `SessionProvider` es necesario para que los componentes que usan
 * `useSession()` (por ejemplo el bloque de sesion del header) puedan leer
 * el estado de la sesion.
 *
 * Va como wrapper en el layout raiz a proposito: pedir la sesion con
 * `auth()` dentro del Header convertiria TODAS las paginas en dinamicas,
 * incluido el catalogo publico, que es justamente lo que mas conviene
 * cachear en un e-commerce.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
