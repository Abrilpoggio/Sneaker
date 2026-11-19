"use server";

import { revalidatePath } from "next/cache";

import { requireCliente } from "@/lib/permissions";
import { resolverComprador } from "@/modules/carrito/services/carrito";
import {
  actualizarDireccionCliente,
  crearDireccionCliente,
  marcarDireccionPredeterminada,
} from "@/modules/clients/services/direcciones";
import { ErrorNegocioCliente } from "@/modules/clients/services/perfil";

export interface EstadoDireccionCheckout {
  ok: boolean;
  mensaje?: string;
  error?: string;
  erroresCampos?: Record<string, string>;
}

export const ESTADO_INICIAL_DIRECCION_CHECKOUT: EstadoDireccionCheckout = {
  ok: false,
};

function revalidarCheckoutDirecciones() {
  revalidatePath("/carrito/checkout");
  revalidatePath("/carrito/checkout/mercadopago");
  revalidatePath("/cuenta/direcciones");
  revalidatePath("/cuenta");
}

function primerErrorPorCampo(
  fieldErrors?: Record<string, string[] | undefined>,
): Record<string, string> | undefined {
  if (!fieldErrors) return undefined;
  const resultado: Record<string, string> = {};
  for (const [campo, lista] of Object.entries(fieldErrors)) {
    if (lista && lista[0]) {
      resultado[campo] = lista[0];
    }
  }
  return Object.keys(resultado).length > 0 ? resultado : undefined;
}

/**
 * RF-18: selecciona una direccion guardada durante el checkout sin
 * abandonar la compra y recalcula el costo de envio (RF-45).
 */
export async function accionSeleccionarDireccionCheckout(
  direccionId: string,
): Promise<EstadoDireccionCheckout> {
  const sesion = await requireCliente();

  try {
    const clienteId = await resolverComprador(sesion.user.id, sesion.user.email);
    await marcarDireccionPredeterminada(clienteId, direccionId);
    revalidarCheckoutDirecciones();
    return { ok: true, mensaje: "Dirección de envío actualizada." };
  } catch (error) {
    if (error instanceof ErrorNegocioCliente) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "No pudimos cambiar la dirección seleccionada." };
  }
}

/**
 * RF-18 / RN-02: crea o edita una direccion inline durante el checkout,
 * dejandola seleccionada para el envio del pedido actual.
 */
export async function accionGuardarDireccionCheckout(
  _prev: EstadoDireccionCheckout,
  formData: FormData,
): Promise<EstadoDireccionCheckout> {
  const sesion = await requireCliente();

  const direccionId = String(formData.get("direccionId") ?? "").trim();
  const payload: Record<string, unknown> = {
    destinatario: String(formData.get("destinatario") ?? ""),
    calle: String(formData.get("calle") ?? ""),
    numero: String(formData.get("numero") ?? ""),
    piso: String(formData.get("piso") ?? ""),
    departamento: String(formData.get("departamento") ?? ""),
    ciudad: String(formData.get("ciudad") ?? ""),
    provincia: String(formData.get("provincia") ?? ""),
    codigoPostal: String(formData.get("codigoPostal") ?? ""),
    predeterminada: true,
  };

  try {
    const clienteId = await resolverComprador(sesion.user.id, sesion.user.email);
    if (direccionId) {
      await actualizarDireccionCliente(clienteId, direccionId, payload);
    } else {
      await crearDireccionCliente(clienteId, payload);
    }
    revalidarCheckoutDirecciones();
    return {
      ok: true,
      mensaje: direccionId
        ? "Dirección actualizada para este envío."
        : "Dirección agregada y seleccionada para este envío.",
    };
  } catch (error) {
    if (error instanceof ErrorNegocioCliente) {
      return {
        ok: false,
        error: error.message,
        erroresCampos: primerErrorPorCampo(error.erroresCampos),
      };
    }
    return {
      ok: false,
      error: "No pudimos guardar la dirección. Intentá nuevamente.",
    };
  }
}
