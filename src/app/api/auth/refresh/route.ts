import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  DURACION_ACCESS_TOKEN_MS,
  emitirRefreshToken,
  obtenerDatosUsuarioParaToken,
  verificarFirmaRefreshToken,
} from "@/modules/auth/services/token";

/**
 * Endpoint REST de Refresh Token (POST /api/auth/refresh).
 *
 * Entregable Tangible Sprint 1 (DUP p. 37) - RF-13, RN-01, RNF-08:
 * Permite validar la sesion JWT activa o un `refreshToken` provisto en el body,
 * comprobando en PostgreSQL que el usuario siga activo (`activo = true`) y
 * devolviendo los datos de sesion sincronizados junto con un nuevo Refresh Token
 * rotado y la nueva marca de expiracion del Access Token.
 */
export async function POST(request: Request) {
  let bodyRefreshToken: string | undefined;
  let bodyUserId: string | undefined;

  try {
    const body = (await request.json()) as {
      refreshToken?: unknown;
      usuarioId?: unknown;
    };
    if (typeof body?.refreshToken === "string") {
      bodyRefreshToken = body.refreshToken;
    }
    if (typeof body?.usuarioId === "string") {
      bodyUserId = body.usuarioId;
    }
  } catch {
    // El body es opcional si se invoca con la cookie httpOnly de sesion activa.
  }

  const sesion = await auth();
  const usuarioId = sesion?.user?.id || bodyUserId;

  if (!usuarioId) {
    return NextResponse.json(
      { error: "Sesion no encontrada o token ausente." },
      { status: 401 },
    );
  }

  if (sesion?.error) {
    return NextResponse.json(
      { error: "La sesion ha expirado o fue revocada.", codigo: sesion.error },
      { status: 401 },
    );
  }

  // Si se envio un refreshToken explicito por body, verificamos su firma HMAC y vigencia.
  if (
    bodyRefreshToken &&
    !verificarFirmaRefreshToken(bodyRefreshToken, usuarioId)
  ) {
    return NextResponse.json(
      { error: "Refresh token invalido o expirado." },
      { status: 401 },
    );
  }

  const datosActualizados = await obtenerDatosUsuarioParaToken({ id: usuarioId });

  if (!datosActualizados) {
    return NextResponse.json(
      { error: "El usuario no existe o su cuenta fue desactivada (RN-01)." },
      { status: 401 },
    );
  }

  const ahora = Date.now();
  const nuevoRefreshToken = emitirRefreshToken(datosActualizados.id, ahora);
  const accessTokenExpires = ahora + DURACION_ACCESS_TOKEN_MS;

  return NextResponse.json(
    {
      mensaje: "Token renovado exitosamente.",
      usuario: {
        id: datosActualizados.id,
        usuario: datosActualizados.usuario,
        correo: datosActualizados.correo,
        nombre: datosActualizados.nombre,
        rol: datosActualizados.rol,
      },
      accessTokenExpires,
      refreshToken: nuevoRefreshToken,
    },
    { status: 200 },
  );
}

