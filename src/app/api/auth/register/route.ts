import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { registroSchema } from "@/modules/auth/schemas";
import {
  registrarCliente,
  verificarDuplicadosRegistro,
} from "@/modules/auth/services/usuarios";

/**
 * Endpoint REST de Registro de Clientes (POST /api/auth/register).
 *
 * Entregable Tangible Sprint 1 (DUP p. 37) - RF-12, RF-50, RN-03:
 * Valida los datos con Zod, verifica unicidad de correo, usuario y DNI,
 * hashea la contrasena con bcrypt (costo 12) y crea las filas en `usuarios`
 * (rol CLIENTE) y `clientes` dentro de una transaccion.
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "El cuerpo de la peticion debe ser JSON valido." },
      { status: 400 },
    );
  }

  const parsed = registroSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos de registro invalidos.",
        erroresCampos: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const datos = parsed.data;
  const correo = datos.correo.trim().toLowerCase();
  const usuario = datos.usuario.trim().toLowerCase();

  const erroresDuplicados = await verificarDuplicadosRegistro({
    correo,
    usuario,
    dni: datos.dni ?? null,
  });

  if (Object.keys(erroresDuplicados).length > 0) {
    return NextResponse.json(
      {
        error: "Ya existe una cuenta con alguno de los datos ingresados.",
        erroresCampos: erroresDuplicados,
      },
      { status: 409 },
    );
  }

  try {
    const passwordHash = await bcrypt.hash(datos.password, 12);

    const creado = await registrarCliente({
      nombre: datos.nombre,
      apellido: datos.apellido,
      usuario,
      correo,
      telefono: datos.telefono || undefined,
      dni: datos.dni ?? null,
      passwordHash,
    });

    return NextResponse.json(
      {
        mensaje: "Cuenta creada exitosamente.",
        usuario: {
          id: creado.id,
          usuario: creado.usuario,
          correo: creado.correo,
          rol: creado.rol,
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "No se pudo completar el registro. Intenta nuevamente." },
      { status: 500 },
    );
  }
}

