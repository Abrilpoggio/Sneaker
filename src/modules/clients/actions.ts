"use server";

import { revalidatePath } from "next/cache";

import { requireCliente } from "@/lib/permissions";
import type { EstadoAccionCliente } from "./schemas";
import {
  actualizarDireccionCliente,
  crearDireccionCliente,
  eliminarDireccionCliente,
  marcarDireccionPredeterminada,
} from "./services/direcciones";
import {
  actualizarPerfilCliente,
  cambiarPasswordUsuario,
  ErrorNegocioCliente,
  resolverUsuarioActivoId,
} from "./services/perfil";

/**
 * Server Actions del Modulo 2: Perfil & Clientes
 * (Sprint 2 - CU3, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RN-02, RN-03).
 *
 * IMPORTANTE (Next.js 16): Este archivo posee `"use server"` y por lo tanto
 * unicamente exporta funciones `async` en tiempo de ejecucion.
 */

function formatearErrorAccion(error: unknown): EstadoAccionCliente {
  if (error instanceof ErrorNegocioCliente) {
    return {
      ok: false,
      error: error.message,
      codigo: error.codigo,
      erroresCampos: error.erroresCampos,
      marcaTiempo: Date.now(),
    };
  }

  return {
    ok: false,
    error: "Ocurrió un error inesperado al procesar la solicitud.",
    marcaTiempo: Date.now(),
  };
}

function revalidarRutasCuenta() {
  revalidatePath("/cuenta");
  revalidatePath("/cuenta/perfil");
  revalidatePath("/cuenta/seguridad");
  revalidatePath("/cuenta/direcciones");
}

/**
 * RF-15 / RF-16 / RN-03: Actualiza los datos personales editables del perfil
 * rechazando cualquier intento de alterar `usuario`, `correo` o un `dni` previo.
 */
export async function accionActualizarPerfil(
  _prev: EstadoAccionCliente,
  formData: FormData,
): Promise<EstadoAccionCliente> {
  const sesion = await requireCliente();

  const payload: Record<string, unknown> = {
    nombre: formData.get("nombre") ?? "",
    apellido: formData.get("apellido") ?? "",
    telefono: formData.get("telefono") ?? "",
    dni: formData.get("dni") ?? "",
  };

  // Si alguien inyecta `usuario` o `correo` manualmente en el POST, lo pasamos
  // al servicio para que dispare el rechazo explicito de RN-03 / CU3.
  if (formData.has("usuario")) {
    payload.usuario = formData.get("usuario");
  }
  if (formData.has("correo")) {
    payload.correo = formData.get("correo");
  }

  try {
    const usuarioId = await resolverUsuarioActivoId(
      sesion.user.id,
      sesion.user.email,
    );
    await actualizarPerfilCliente(usuarioId, payload);
    revalidarRutasCuenta();
    return {
      ok: true,
      mensaje: "Tus datos personales se actualizaron correctamente.",
      marcaTiempo: Date.now(),
    };
  } catch (error) {
    return formatearErrorAccion(error);
  }
}

/**
 * RF-14 / Mockup `Seguridad` (`341:947`): Actualiza la contrasena del usuario.
 */
export async function accionCambiarPassword(
  _prev: EstadoAccionCliente,
  formData: FormData,
): Promise<EstadoAccionCliente> {
  const sesion = await requireCliente();

  const payload: Record<string, unknown> = {
    passwordActual: formData.get("passwordActual") ?? "",
    passwordNueva: formData.get("passwordNueva") ?? "",
    confirmarPassword: formData.get("confirmarPassword") ?? "",
  };

  try {
    const usuarioId = await resolverUsuarioActivoId(
      sesion.user.id,
      sesion.user.email,
    );
    await cambiarPasswordUsuario(usuarioId, payload);
    revalidarRutasCuenta();
    return {
      ok: true,
      mensaje: "Tu contraseña se actualizó correctamente.",
      marcaTiempo: Date.now(),
    };
  } catch (error) {
    return formatearErrorAccion(error);
  }
}

/**
 * RF-17 / RN-02 / RF-19: Da de alta una nueva direccion (maximo 3 por cliente).
 */
export async function accionCrearDireccion(
  _prev: EstadoAccionCliente,
  formData: FormData,
): Promise<EstadoAccionCliente> {
  const sesion = await requireCliente();

  const payload: Record<string, unknown> = {
    destinatario: formData.get("destinatario") ?? "",
    calle: formData.get("calle") ?? "",
    numero: formData.get("numero") ?? "",
    piso: formData.get("piso") ?? "",
    departamento: formData.get("departamento") ?? "",
    ciudad: formData.get("ciudad") ?? "",
    provincia: formData.get("provincia") ?? "",
    codigoPostal: formData.get("codigoPostal") ?? "",
    predeterminada:
      formData.get("predeterminada") === "on" ||
      formData.get("predeterminada") === "true",
  };

  try {
    const usuarioId = await resolverUsuarioActivoId(
      sesion.user.id,
      sesion.user.email,
    );
    await crearDireccionCliente(usuarioId, payload);
    revalidarRutasCuenta();
    return {
      ok: true,
      mensaje: "Dirección agregada correctamente.",
      marcaTiempo: Date.now(),
    };
  } catch (error) {
    return formatearErrorAccion(error);
  }
}

/**
 * RF-17 / RF-18 / RF-19: Edita una direccion existente del cliente autenticado.
 */
export async function accionEditarDireccion(
  _prev: EstadoAccionCliente,
  formData: FormData,
): Promise<EstadoAccionCliente> {
  const sesion = await requireCliente();
  const direccionId = String(formData.get("direccionId") ?? "").trim();

  if (!direccionId) {
    return {
      ok: false,
      error: "Falta el identificador de la dirección a editar.",
      marcaTiempo: Date.now(),
    };
  }

  const payload: Record<string, unknown> = {
    destinatario: formData.get("destinatario") ?? "",
    calle: formData.get("calle") ?? "",
    numero: formData.get("numero") ?? "",
    piso: formData.get("piso") ?? "",
    departamento: formData.get("departamento") ?? "",
    ciudad: formData.get("ciudad") ?? "",
    provincia: formData.get("provincia") ?? "",
    codigoPostal: formData.get("codigoPostal") ?? "",
    predeterminada:
      formData.get("predeterminada") === "on" ||
      formData.get("predeterminada") === "true",
  };

  try {
    const usuarioId = await resolverUsuarioActivoId(
      sesion.user.id,
      sesion.user.email,
    );
    await actualizarDireccionCliente(usuarioId, direccionId, payload);
    revalidarRutasCuenta();
    return {
      ok: true,
      mensaje: "Dirección actualizada correctamente.",
      marcaTiempo: Date.now(),
    };
  } catch (error) {
    return formatearErrorAccion(error);
  }
}

/**
 * RF-17 / RF-18: Marca una direccion como predeterminada ("Actual").
 */
export async function accionPredeterminarDireccion(
  direccionId: string,
): Promise<EstadoAccionCliente> {
  const sesion = await requireCliente();

  try {
    const usuarioId = await resolverUsuarioActivoId(
      sesion.user.id,
      sesion.user.email,
    );
    await marcarDireccionPredeterminada(usuarioId, direccionId);
    revalidarRutasCuenta();
    return {
      ok: true,
      mensaje: "Dirección predeterminada actualizada.",
      marcaTiempo: Date.now(),
    };
  } catch (error) {
    return formatearErrorAccion(error);
  }
}

/**
 * RF-17 / RN-02: Elimina una direccion del cliente autenticado.
 */
export async function accionEliminarDireccion(
  direccionId: string,
): Promise<EstadoAccionCliente> {
  const sesion = await requireCliente();

  try {
    const usuarioId = await resolverUsuarioActivoId(
      sesion.user.id,
      sesion.user.email,
    );
    await eliminarDireccionCliente(usuarioId, direccionId);
    revalidarRutasCuenta();
    return {
      ok: true,
      mensaje: "Dirección eliminada correctamente.",
      marcaTiempo: Date.now(),
    };
  } catch (error) {
    return formatearErrorAccion(error);
  }
}
