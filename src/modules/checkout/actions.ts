"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireCliente, type Sesion } from "@/lib/permissions";
import { mercadoPagoHabilitado } from "@/lib/env";

import {
  MENSAJE_UN_CUPON_POR_COMPRA,
  type EstadoAccionCheckout,
} from "./schemas";
import {
  ErrorNegocioCheckout,
  guardarCupon,
  leerCuponGuardado,
  olvidarCupon,
  validarCupon,
} from "./services/checkout";
import { resolverComprador } from "@/modules/carrito/services/carrito";
import {
  iniciarPagoMercadoPago,
  pagarSimuladoAprobado,
  pagarSimuladoRechazado,
} from "./services/pagos";

/**
 * Server Actions del Modulo Checkout
 * (Sprint 3 - Camila Viegas. RF-22, RF-24, RF-25, RN-08).
 *
 * IMPORTANTE (Next.js 16): este archivo posee `"use server"` y por lo
 * tanto unicamente exporta funciones `async`.
 *
 * Los `redirect()` se ejecutan fuera del `try/catch`: el redirect de
 * Next interrumpe el flujo lanzando un error interno que no debe
 * transformarse en mensaje de formulario.
 */

const COOKIE_CUPON = "sneaker_cupon";

function estadoError(error: unknown): EstadoAccionCheckout {
  if (error instanceof ErrorNegocioCheckout) {
    return { ok: false, error: error.message, codigo: error.codigo, marcaTiempo: Date.now() };
  }
  if (error instanceof Error && error.name === "ZodError") {
    return {
      ok: false,
      error: "El código ingresado no es válido.",
      codigo: "VALIDACION",
      marcaTiempo: Date.now(),
    };
  }
  return {
    ok: false,
    error: "Ocurrió un error inesperado en el checkout.",
    marcaTiempo: Date.now(),
  };
}

/** RF-22: aplica un cupon a la compra en curso (uno por compra, RN-08). */
export async function accionAplicarCupon(
  _prev: EstadoAccionCheckout,
  formData: FormData,
): Promise<EstadoAccionCheckout> {
  // Guard de sesion: sin login no se aplica cupon.
  const sesion = await requireCliente();

  try {
    const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
    const cupon = await validarCupon(formData.get("codigo"), usuarioId);

    // RN-08: si ya hay un cupon guardado distinto se rechaza el
    // segundo; el mismo cupon se re-confirma sin error.
    const almacen = await cookies();
    const actual = almacen.get(COOKIE_CUPON)?.value ?? null;
    if (actual && actual !== cupon.codigo) {
      return {
        ok: false,
        error: MENSAJE_UN_CUPON_POR_COMPRA,
        codigo: "CUPON_DUPLICADO",
        marcaTiempo: Date.now(),
      };
    }

    await guardarCupon(cupon.codigo);
    revalidatePath("/carrito/checkout");
    return {
      ok: true,
      mensaje: `Cupón ${cupon.codigo} aplicado: ${Number(cupon.porcentajeDescuento)}% de descuento.`,
      marcaTiempo: Date.now(),
    };
  } catch (error) {
    return estadoError(error);
  }
}

/** RF-22: quita el cupon aplicado. */
export async function accionQuitarCupon(
  _prev: EstadoAccionCheckout,
  _formData: FormData,
): Promise<EstadoAccionCheckout> {
  void _prev;
  void _formData;
  await requireCliente();

  try {
    await olvidarCupon();
    revalidatePath("/carrito/checkout");
    return { ok: true, mensaje: "Cupón quitado.", marcaTiempo: Date.now() };
  } catch (error) {
    return estadoError(error);
  }
}

/**
 * RF-24: pago con Mercado Pago. Con credenciales (`MERCADO_PAGO_ACCESS_TOKEN`)
 * crea el pedido pendiente y redirige a Checkout Pro; sin ellas recorre
 * el mismo camino de dos fases en modo simulado (fase 1 crear pedido,
 * fase 2 aprobar: stock, cupones, movimientos).
 */
export async function accionPagar(
  _prev: EstadoAccionCheckout,
  _formData: FormData,
): Promise<EstadoAccionCheckout> {
  void _prev;
  void _formData;
  const sesion: Sesion = await requireCliente();
  let destino: string | null = null;

  try {
    const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
    const cuponGuardado = await leerCuponGuardado();
    if (mercadoPagoHabilitado()) {
      const hdrs = await headers();
      const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host");
      const proto = hdrs.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
      const urlBase =
        (host ? `${proto}://${host}` : null) ??
        process.env.AUTH_URL ??
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

      const pago = await iniciarPagoMercadoPago(
        usuarioId,
        sesion.user.email ?? "",
        urlBase.replace(/\/$/, ""),
        cuponGuardado,
      );
      if (!pago.urlPago) {
        return {
          ok: false,
          error: "No se pudo iniciar el pago con Mercado Pago.",
          marcaTiempo: Date.now(),
        };
      }
      await olvidarCupon();
      destino = pago.urlPago;
    } else {
      // Modo simulado: fase 1 + fase 2 en linea, sin API externa.
      const numeroOrden = await pagarSimuladoAprobado(usuarioId, cuponGuardado);
      // El cupon queda consumido en el pedido: la proxima compra
      // arranca sin cupon aplicado.
      await olvidarCupon();
      revalidatePath("/carrito");
      revalidatePath("/carrito/checkout");
      destino = `/pedido/${numeroOrden}`;
    }
  } catch (error) {
    return estadoError(error);
  }

  redirect(destino);
}

/**
 * RF-25 (modo simulado): demuestra el camino de pago rechazado. El
 * pedido queda RECHAZADO, el stock no se descuenta y el carrito se
 * conserva para reintentar.
 */
export async function accionPagarRechazado(
  _prev: EstadoAccionCheckout,
  _formData: FormData,
): Promise<EstadoAccionCheckout> {
  void _prev;
  void _formData;
  const sesion: Sesion = await requireCliente();
  let destino: string | null = null;

  try {
    const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
    const numeroOrden = await pagarSimuladoRechazado(usuarioId);
    revalidatePath("/carrito");
    revalidatePath("/carrito/checkout");
    destino = `/pedido/${numeroOrden}`;
  } catch (error) {
    return estadoError(error);
  }

  redirect(destino);
}
