import { NextResponse } from "next/server";

import { RolUsuario } from "@/generated/prisma/enums";
import { autorizarApiRol } from "@/lib/permissions";
import { MAXIMO_DIRECCIONES_POR_CLIENTE } from "@/modules/clients/schemas";
import {
  crearDireccionCliente,
  listarDireccionesCliente,
} from "@/modules/clients/services/direcciones";
import {
  ErrorNegocioCliente,
  resolverUsuarioActivoId,
} from "@/modules/clients/services/perfil";

/**
 * Endpoint REST de Direcciones del Cliente (GET / POST /api/cuenta/direcciones).
 *
 * Sprint 2 - CU3, RF-17, RF-18, RF-19, RN-02:
 * - `GET`: lista las direcciones guardadas del cliente autenticado.
 * - `POST`: registra una nueva direccion validando atomicamente el tope maximo
 *   de 3 direcciones por cliente (`RN-02`).
 */

export async function GET() {
  const auth = await autorizarApiRol([RolUsuario.CLIENTE, RolUsuario.ADMIN]);
  if (auth.respuestaError) return auth.respuestaError;

  try {
    const usuarioId = await resolverUsuarioActivoId(
      auth.sesion.user.id,
      auth.sesion.user.email,
    );
    const direcciones = await listarDireccionesCliente(usuarioId);
    return NextResponse.json(
      {
        direcciones,
        total: direcciones.length,
        maximoPermitido: MAXIMO_DIRECCIONES_POR_CLIENTE,
      },
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
      { error: "No se pudieron listar las direcciones." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
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
    const direccion = await crearDireccionCliente(
      usuarioId,
      body as Record<string, unknown>,
    );
    return NextResponse.json(
      {
        mensaje: "Dirección creada correctamente.",
        direccion,
      },
      { status: 201 },
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
      { error: "No se pudo registrar la dirección." },
      { status: 500 },
    );
  }
}

