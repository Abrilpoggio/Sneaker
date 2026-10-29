import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/lib/auth";
import { RolUsuario } from "@/generated/prisma/enums";

/**
 * RNF-08 / RF-49 / RF-50: control de acceso por rol (RBAC).
 *
 * Todas estas funciones corren en el servidor (server component, server
 * action o route handler). El `proxy.ts` solo hace una redireccion
 * temprana por UX; la decision de permisos real vive aca, porque es lo
 * unico que no se puede esquivar desde el navegador.
 *
 * El tipo se escribe a mano en vez de usar `ReturnType<typeof auth>`: la
 * variable `auth` de Auth.js es una interseccion de sobrecargas (sirve para
 * middleware, route handlers y pages router) y `ReturnType` termina
 * resolviendo a la firma equivocada.
 */
export type Sesion = Session | null;

export async function sesionActual(): Promise<Sesion> {
  const sesion = await auth();
  if (!sesion?.user || sesion.error) {
    return null;
  }
  return sesion;
}

export function esAdmin(rol: RolUsuario | undefined | null): boolean {
  return rol === RolUsuario.ADMIN;
}

export function esVendedor(rol: RolUsuario | undefined | null): boolean {
  return rol === RolUsuario.VENDEDOR;
}

export function esCliente(rol: RolUsuario | undefined | null): boolean {
  return rol === RolUsuario.CLIENTE;
}

/** Exige sesion iniciada y vigente. RN-01: sin sesion no hay carrito ni compras. */
export async function requireSesion(): Promise<Session> {
  const sesion = await sesionActual();

  if (!sesion?.user) {
    redirect("/login");
  }

  return sesion;
}

/**
 * Exige que el usuario autenticado posea uno de los roles permitidos (RF-49).
 */
export async function requireRol(
  rolesPermitidos: readonly RolUsuario[],
): Promise<Session> {
  const sesion = await requireSesion();

  if (!rolesPermitidos.includes(sesion.user.rol)) {
    redirect("/");
  }

  return sesion;
}

/** RNF-08: panel de administracion exclusivo para ADMIN. */
export async function requireAdmin(): Promise<Session> {
  return await requireRol([RolUsuario.ADMIN]);
}

/**
 * RF-49 / RF-50: acceso para personal operativo (VENDEDOR o ADMIN).
 */
export async function requireVendedor(): Promise<Session> {
  return await requireRol([RolUsuario.VENDEDOR, RolUsuario.ADMIN]);
}

/**
 * Exige sesion de cliente o administrador.
 * ADMIN tambien opera el sitio publico para poder probar el checkout
 * sin crear una cuenta de prueba cada vez.
 */
export async function requireCliente(): Promise<Session> {
  return await requireRol([RolUsuario.CLIENTE, RolUsuario.ADMIN]);
}
