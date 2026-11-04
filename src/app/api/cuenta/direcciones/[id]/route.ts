import { NextResponse } from "next/server";

import { RolUsuario } from "@/generated/prisma/enums";
import { autorizarApiRol } from "@/lib/permissions";
import {
  actualizarDireccionCliente,
  eliminarDireccionCliente,
  marcarDireccionPredeterminada,
} from "@/modules/clients/services/direcciones";
import {
  ErrorNegocioCliente,
  resolverUsuarioActivoId,
} from "@/modules/clients/services/perfil";

/**
 * Endpoint REST por Direccion (PATCH / DELETE /api/cuenta/direcciones/[id]).
 *
 * Sprint 2 - CU3, RF-17, RF-18, RF-19, RN-02:
 * Verifica pertenencia (`clienteId === sesion.user.id`) para impedir acceso
 * cruzado (IDOR) entre distintos clientes.
 */

interface ContextoRutaDireccion {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: ContextoRutaDireccion) {
  const auth = await autorizarApiRol([RolUsuario.CLIENTE, RolUsuario.ADMIN]);
  if (auth.respuestaError) return auth.respuestaError;

  const { id } = await context.params;

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

  const payload = body as Record<string, unknown>;

  try {
    const usuarioId = await resolverUsuarioActivoId(
      auth.sesion.user.id,
      auth.sesion.user.email,
    );

    // Atajo si solo se solicita marcar la direccion como predeterminada
    const soloPredeterminar =
      payload.predeterminada === true && Object.keys(payload).length === 1;

    const direccion = soloPredeterminar
      ? await marcarDireccionPredeterminada(usuarioId, id)
      : await actualizarDireccionCliente(usuarioId, id, payload);

    return NextResponse.json(
      {
        mensaje: "Dirección actualizada correctamente.",
        direccion,
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
      { error: "No se pudo actualizar la dirección." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: ContextoRutaDireccion,
) {
  const auth = await autorizarApiRol([RolUsuario.CLIENTE, RolUsuario.ADMIN]);
  if (auth.respuestaError) return auth.respuestaError;

  const { id } = await context.params;

  try {
    const usuarioId = await resolverUsuarioActivoId(
      auth.sesion.user.id,
      auth.sesion.user.email,
    );
    await eliminarDireccionCliente(usuarioId, id);
    return NextResponse.json(
      { mensaje: "Dirección eliminada correctamente." },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ErrorNegocioCliente) {
      return NextResponse.json(
        { error: error.message, codigo: error.codigo },
        { status: error.statusHttp },
      );
    }
    return NextResponse.json(
      { error: "No se pudo eliminar la dirección." },
      { status: 500 },
    );
  }
}

