import { NextResponse } from "next/server";

import { RolUsuario } from "@/generated/prisma/enums";
import { autorizarApiRol } from "@/lib/permissions";
import {
  actualizarPerfilCliente,
  ErrorNegocioCliente,
  obtenerDatosCuentaCliente,
  resolverUsuarioActivoId,
} from "@/modules/clients/services/perfil";

/**
 * Endpoint REST de Perfil del Cliente (GET / PATCH /api/cuenta/perfil).
 *
 * Sprint 2 - CU3, RF-15, RF-16, RN-03:
 * - `GET`: devuelve los datos de la cuenta y del perfil del usuario autenticado.
 * - `PATCH`: actualiza `nombre`, `apellido`, `telefono` (y `dni` por unica vez
 *   si estaba vacio), rechazando explicitamente cualquier intento de modificar
 *   `usuario` o `correo` (`RN-03`).
 */

export async function GET() {
  const auth = await autorizarApiRol([RolUsuario.CLIENTE, RolUsuario.ADMIN]);
  if (auth.respuestaError) return auth.respuestaError;

  try {
    const cuenta = await obtenerDatosCuentaCliente(
      auth.sesion.user.id,
      auth.sesion.user.email,
    );
    return NextResponse.json(cuenta, { status: 200 });
  } catch (error) {
    if (error instanceof ErrorNegocioCliente) {
      return NextResponse.json(
        { error: error.message, codigo: error.codigo },
        { status: error.statusHttp },
      );
    }
    return NextResponse.json(
      { error: "No se pudo consultar el perfil." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await autorizarApiRol([RolUsuario.CLIENTE, RolUsuario.ADMIN]);
  if (auth.respuestaError) return auth.respuestaError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la petición debe ser JSON válido." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Formato de datos inválido." },
      { status: 400 },
    );
  }

  try {
    const usuarioId = await resolverUsuarioActivoId(
      auth.sesion.user.id,
      auth.sesion.user.email,
    );
    const cliente = await actualizarPerfilCliente(
      usuarioId,
      body as Record<string, unknown>,
    );
    return NextResponse.json(
      {
        mensaje: "Datos personales actualizados correctamente.",
        cliente,
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ErrorNegocioCliente) {
      return NextResponse.json(
        {
          error: error.message,
          codigo: error.codigo,
          erroresCampos: error.erroresCampos,
        },
        { status: error.statusHttp },
      );
    }
    return NextResponse.json(
      { error: "No se pudo actualizar el perfil." },
      { status: 500 },
    );
  }
}

