"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";

const RUTAS_AUTH = new Set(["/login", "/registro", "/recuperar"]);

/**
 * Mantiene sincronizado el `SessionProvider` del cliente cuando el usuario
 * entra o sale de rutas de autenticacion (por ejemplo tras Server Actions o
 * callbacks OAuth), evitando que el Header o el SideMenu queden con estado viejo.
 */
function SincronizadorSesion() {
  const pathname = usePathname() ?? "/";
  const { update } = useSession();
  const rutaPreviaRef = useRef(pathname);

  useEffect(() => {
    const previa = rutaPreviaRef.current;
    rutaPreviaRef.current = pathname;

    if (previa !== pathname && (RUTAS_AUTH.has(previa) || RUTAS_AUTH.has(pathname))) {
      void update();
    }
  }, [pathname, update]);

  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus>
      <SincronizadorSesion />
      {children}
    </SessionProvider>
  );
}
