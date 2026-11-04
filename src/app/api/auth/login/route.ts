import { NextResponse } from "next/server";
import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";
import { loginSchema } from "@/modules/auth/schemas";
import {
  DURACION_ACCESS_TOKEN_MS,
  emitirRefreshToken,
  obtenerDatosUsuarioParaToken,
} from "@/modules/auth/services/token";

/**
 * Endpoint REST de Login con emision de sesion JWT y Refresh Token
 * (POST /api/auth/login).
 *
 * Entregable Tangible Sprint 1 (DUP p. 37) - RF-12, RF-13, RF-49, RN-01:
 * Valida credenciales con Zod, autentica mediante Auth.js (emitiendo la cookie
 * firmada `httpOnly` de sesion JWT) y devuelve el perfil con su rol junto al
 * `refreshToken` y ventana de expiracion del `accessToken`.
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

  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Datos de inicio de sesion invalidos.",
        erroresCampos: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const correo = parsed.data.correo.trim().toLowerCase();

  try {
    await signIn("credentials", {
      correo,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: "Correo o contrasena incorrectos." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "No se pudo procesar el inicio de sesion." },
      { status: 500 },
    );
  }

  const datosUsuario = await obtenerDatosUsuarioParaToken({ correo });

  if (!datosUsuario) {
    return NextResponse.json(
      { error: "Cuenta inactiva o inexistente (RN-01)." },
      { status: 401 },
    );
  }

  const ahora = Date.now();

  return NextResponse.json(
    {
      mensaje: "Sesion iniciada exitosamente.",
      usuario: {
        id: datosUsuario.id,
        usuario: datosUsuario.usuario,
        correo: datosUsuario.correo,
        nombre: datosUsuario.nombre,
        rol: datosUsuario.rol,
      },
      accessTokenExpires: ahora + DURACION_ACCESS_TOKEN_MS,
      refreshToken: emitirRefreshToken(datosUsuario.id, ahora),
    },
    { status: 200 },
  );
}

