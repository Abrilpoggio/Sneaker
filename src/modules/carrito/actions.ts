"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireCliente } from "@/lib/permissions";

import { ErrorNegocioCliente } from "@/modules/clients/services/perfil";
import { type EstadoAccionCarrito } from "./schemas";
import {
  ErrorNegocioCarrito,
  actualizarCantidadItem,
  agregarItemCarrito,
  cancelarReservaCarrito,
  iniciarReservaCarrito,
  quitarItemCarrito,
  resolverComprador,
} from "./services/carrito";

/**
 * Server Actions del Modulo Carrito
 * (Sprint 3 - Abril Poggio. RF-21, RF-29, RN-01, RN-04, RN-05).
 *
 * IMPORTANTE (Next.js 16): este archivo posee `"use server"` y por lo
 * tanto unicamente exporta funciones `async`.
 *
 * RN-01: antes de tocar la base se exige sesion. `requireCliente()`
 * redirige a /login si no la hay; para las acciones que se invocan
 * con `useActionState` (donde el redirect es parte del flujo) se usa
 * el mismo guard, que ya incluye la resolucion contra la base.
 */

function revalidarRutasCarrito() {
  revalidatePath("/carrito");
  revalidatePath("/carrito/checkout");
  revalidatePath("/catalogo");
  revalidatePath("/producto/[slug]", "page");
}

function estadoError(error: unknown): EstadoAccionCarrito {
  if (error instanceof ErrorNegocioCarrito) {
    return { ok: false, error: error.message, codigo: error.codigo, marcaTiempo: Date.now() };
  }
  if (error instanceof ErrorNegocioCliente) {
    return { ok: false, error: error.message, codigo: error.codigo, marcaTiempo: Date.now() };
  }
  if (error instanceof Error && error.name === "ZodError") {
    const issues = (error as { issues?: { message?: string }[] }).issues;
    const mensajeZod = issues?.[0]?.message ?? "Ingresá una cantidad válida.";
    return {
      ok: false,
      error: mensajeZod,
      codigo: "VALIDACION",
      marcaTiempo: Date.now(),
    };
  }
  return {
    ok: false,
    error: "Ocurrió un error inesperado al procesar el carrito.",
    marcaTiempo: Date.now(),
  };
}

/** RF-21 / RN-01: agrega una variante al carrito del cliente logueado. */
export async function accionAgregarAlCarrito(
  _prev: EstadoAccionCarrito,
  formData: FormData,
): Promise<EstadoAccionCarrito> {
  const sesion = await requireCliente();

  try {
    const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
    await agregarItemCarrito(usuarioId, {
      varianteId: formData.get("varianteId"),
      cantidad: formData.get("cantidad"),
    });
    revalidarRutasCarrito();
    return { ok: true, mensaje: "Producto agregado al carrito.", marcaTiempo: Date.now() };
  } catch (error) {
    return estadoError(error);
  }
}

/** RF-21: modifica la cantidad de una linea (0 la elimina). */
export async function accionActualizarCantidad(
  _prev: EstadoAccionCarrito,
  formData: FormData,
): Promise<EstadoAccionCarrito> {
  const sesion = await requireCliente();

  try {
    const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
    await actualizarCantidadItem(usuarioId, {
      itemId: formData.get("itemId"),
      cantidad: formData.get("cantidad"),
    });
    revalidarRutasCarrito();
    return { ok: true, marcaTiempo: Date.now() };
  } catch (error) {
    return estadoError(error);
  }
}

/** RF-21: quita una linea del carrito. */
export async function accionQuitarItem(
  _prev: EstadoAccionCarrito,
  formData: FormData,
): Promise<EstadoAccionCarrito> {
  const sesion = await requireCliente();

  try {
    const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
    await quitarItemCarrito(usuarioId, {
      itemId: formData.get("itemId"),
    });
    revalidarRutasCarrito();
    return { ok: true, marcaTiempo: Date.now() };
  } catch (error) {
    return estadoError(error);
  }
}

/**
 * RF-29 / RN-04: reserva el stock del carrito por 90 segundos y avanza
 * al resumen de compra. Si otro cliente gano la carrera por el stock
 * (RN-05) se devuelve el error sin reservar nada.
 */
export async function accionIniciarReserva(
  _prev: EstadoAccionCarrito,
  formData: FormData,
): Promise<EstadoAccionCarrito> {
  const sesion = await requireCliente();

  try {
    const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
    await iniciarReservaCarrito(usuarioId);
    revalidarRutasCarrito();
    // `formData` mantiene la firma de useActionState; no se usa.
    void formData;
  } catch (error) {
    return estadoError(error);
  }
  redirect("/carrito/checkout");
}

/** RN-04: cancela la reserva y libera el stock retenido. */
export async function accionCancelarReserva(
  _prev: EstadoAccionCarrito,
  formData: FormData,
): Promise<EstadoAccionCarrito> {
  const sesion = await requireCliente();

  try {
    const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
    await cancelarReservaCarrito(usuarioId);
    revalidarRutasCarrito();
    void formData;
    return { ok: true, mensaje: "Reserva cancelada, el stock quedó liberado.", marcaTiempo: Date.now() };
  } catch (error) {
    return estadoError(error);
  }
}
