import { createHmac } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { RolUsuario } from "@/generated/prisma/enums";

/**
 * Servicio de gestion de ciclo de vida de tokens JWT y Refresh Token
 * (Sprint 1 - Entregable Tangible p. 37, RF-12, RF-13, RN-01, RNF-08).
 *
 * El Access Token tiene una ventana corta de validez (15 minutos) dentro de la
 * sesion JWT firmada, mientras que el Refresh Token permite rotar y renovar
 * la sesion hasta por 7 dias, revalidando en PostgreSQL que el usuario siga
 * activo (`activo = true`, RN-01) y sincronizando su `rol` (`ADMIN`,
 * `CLIENTE`, `VENDEDOR`, RF-49).
 */

/** Ventana de validez del Access Token antes de requerir rotacion (15 min). */
export const DURACION_ACCESS_TOKEN_MS = 15 * 60 * 1000;

/** Ventana total de validez del Refresh Token / sesion (7 dias). */
export const DURACION_REFRESH_TOKEN_SEG = 60 * 60 * 24 * 7;

export interface DatosTokenUsuario {
  id: string;
  correo: string;
  nombre: string;
  usuario: string;
  rol: RolUsuario;
}

/**
 * Genera una firma deterministica de Refresh Token vinculada al usuario y
 * al instante de emision usando `AUTH_SECRET`.
 */
export function emitirRefreshToken(usuarioId: string, emitidoEn = Date.now()): string {
  const secret = process.env.AUTH_SECRET ?? "sneaker-dev-secret";
  const payload = `${usuarioId}.${emitidoEn}`;
  const firma = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${firma}`;
}

/**
 * Verifica la integridad criptografica y vigencia temporal de un Refresh Token.
 */
export function verificarFirmaRefreshToken(
  refreshToken: string,
  usuarioIdEsperado: string,
): boolean {
  const partes = refreshToken.split(".");
  if (partes.length !== 2) return false;

  const [payloadB64, firmaRecibida] = partes;
  if (!payloadB64 || !firmaRecibida) return false;

  let payloadDecodificado: string;
  try {
    payloadDecodificado = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return false;
  }

  const [idEnToken, timestampStr] = payloadDecodificado.split(".");
  const emitidoEn = Number(timestampStr);

  if (!idEnToken || idEnToken !== usuarioIdEsperado || !Number.isFinite(emitidoEn)) {
    return false;
  }

  if (Date.now() - emitidoEn > DURACION_REFRESH_TOKEN_SEG * 1000) {
    return false;
  }

  const secret = process.env.AUTH_SECRET ?? "sneaker-dev-secret";
  const firmaEsperada = createHmac("sha256", secret)
    .update(payloadDecodificado)
    .digest("base64url");

  return firmaRecibida === firmaEsperada;
}

/**
 * Obtiene los datos canonicos del usuario desde PostgreSQL para hidratar o
 * refrescar el JWT. Devuelve `null` si el usuario no existe o fue dado de
 * baja (`activo = false`, RN-01).
 */
export async function obtenerDatosUsuarioParaToken(
  criterio: { id: string } | { correo: string },
): Promise<DatosTokenUsuario | null> {
  const usuario = await prisma.usuario.findUnique({
    where: "id" in criterio ? { id: criterio.id } : { correo: criterio.correo.toLowerCase() },
    include: { cliente: true },
  });

  if (!usuario || !usuario.activo) {
    return null;
  }

  const nombre = usuario.cliente
    ? `${usuario.cliente.nombre} ${usuario.cliente.apellido}`.trim()
    : usuario.usuario;

  return {
    id: usuario.id,
    correo: usuario.correo,
    nombre,
    usuario: usuario.usuario,
    rol: usuario.rol,
  };
}

