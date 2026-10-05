import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/lib/auth";
import { RolUsuario } from "@/generated/prisma/enums";

/**
 * RNF-08: control de acceso por rol.
 *
 * Todas estas funciones corren en el servidor (server component, server
 * action o route handler). El `proxy.ts` solo hace una redireccion
 * temprana por UX; la decision de permisos real vive aca, porque es lo
 * unico que no se puede esquivar desde el navegador.
 *
 * El tipo se escribe a mano en vez de usar `ReturnType<typeof auth>`: la
 * variable `auth` de Auth.js es una interseccion de sobrecargas (serve para
 * middleware, route handlers y pages router) y `ReturnType` termina
 * resolviendo a la firma equivocada.
 */
export type Sesion = Session | null;

export async function sesionActual(): Promise<Sesion> {
  return await auth();
}

export function esAdmin(rol: RolUsuario | undefined | null): boolean {
  return rol === RolUsuario.ADMIN;
}

/** Exige sesion iniciada. RN-01: sin sesion no hay carrito ni compras. */
export async function requireSesion(): Promise<Session> {
  const sesion = await auth();

  if (!sesion?.user) {
    redirect("/login");
  }

  return sesion;
}

/** RNF-08: panel de administracion exclusivo para ADMIN. */
export async function requireAdmin(): Promise<Session> {
  const sesion = await requireSesion();

  if (sesion.user.rol !== RolUsuario.ADMIN) {
    // No se revela que la ruta existe: se manda al inicio igual que
    // si no hubiera sesion.
    redirect("/");
  }

  return sesion;
}

/**
 * Exige sesion de cliente o administrador.
 * ADMIN tambien opera el sitio publico para poder probar el checkout
 * sin crear una cuenta de prueba cada vez.
 */
export async function requireCliente(): Promise<Session> {
  const sesion = await requireSesion();

  if (sesion.user.rol === RolUsuario.VENDEDOR) {
    redirect("/");
  }

  return sesion;
}
