import { prisma } from "@/lib/prisma";
import { mercadoPagoHabilitado } from "@/lib/env";
import { enviarCorreoConfirmacionPedido } from "@/modules/emails/services/correo";

import {
  aprobarPedidoPendiente,
  crearPedidoPendiente,
  ErrorNegocioCheckout,
  rechazarPedidoPendiente,
} from "./checkout";

/**
 * RF-28: envia el correo de confirmacion de compra. Un fallo del
 * proveedor NUNCA rompe la compra ya confirmada: solo se loguea.
 */
async function notificarConfirmacion(numeroOrden: string): Promise<void> {
  try {
    await enviarCorreoConfirmacionPedido(numeroOrden);
  } catch (error) {
    console.error(
      `[correo] No se pudo enviar la confirmacion del pedido ${numeroOrden}:`,
      error instanceof Error ? error.message : error,
    );
  }
}

/**
 * Integracion con Mercado Pago (Sprint 3 - Camila Viegas. RF-24, RF-25).
 *
 * El pago recorre dos fases compartidas con el modo simulado:
 *   1. `crearPedidoPendiente` congela el pedido (items, cupon,
 *      promociones, envio) sin tocar stock;
 *   2. al aprobarse el pago, `aprobarPedidoPendiente` descuenta stock
 *      con guardas atomicas y confirma (RN-05).
 *
 * Modo real (requiere `MERCADO_PAGO_ACCESS_TOKEN`):
 * - Se crea una preferencia de Checkout Pro con
 *   `external_reference` = numero de orden del pedido pendiente.
 * - El webhook (src/app/api/pagos/webhook/route.ts) consulta
 *   `GET /v1/payments/{id}` antes de confirmar: nunca se confia en el
 *   cuerpo del POST (datos no confiables del externo).
 * - El webhook no llega a localhost en desarrollo; con el modo
 *   simulado se cubre la demostracion del flujo completo.
 *
 * Modo simulado (sin token): los botones de checkout ejecutan la fase
 * 1 y la fase 2 (o el rechazo RF-25) en el mismo pedido de la request,
 * sin tocar stock ni API externa.
 */

const API_MERCADO_PAGO = "https://api.mercadopago.com";

export interface PreferenciaPago {
  modo: "REAL" | "SIMULADO";
  preferenciaId: string | null;
  /** URL de Checkout Pro para redirigir al comprador (solo modo REAL). */
  urlPago: string | null;
}

/**
 * Crea la preferencia de Checkout Pro para un pedido pendiente. El
 * numero de orden viaja como external_reference para que el webhook
 * pueda vincular el pago sin confianza en el cuerpo del POST.
 */
export async function crearPreferenciaPago(
  pedido: { numeroOrden: string; total: number },
  opciones: { correoComprador: string; urlBase: string },
): Promise<PreferenciaPago> {
  if (!mercadoPagoHabilitado()) {
    return { modo: "SIMULADO", preferenciaId: null, urlPago: null };
  }

  const esHttpsPublico = opciones.urlBase.startsWith("https://");
  const cuerpoPreferencia: Record<string, unknown> = {
    external_reference: pedido.numeroOrden,
    items: [
      {
        title: `Pedido ${pedido.numeroOrden} - Sneaker`,
        quantity: 1,
        currency_id: "ARS",
        unit_price: Number(pedido.total),
      },
    ],
    back_urls: {
      success: `${opciones.urlBase}/pedido/${pedido.numeroOrden}`,
      failure: `${opciones.urlBase}/pedido/${pedido.numeroOrden}`,
      pending: `${opciones.urlBase}/pedido/${pedido.numeroOrden}`,
    },
  };

  // Mercado Pago exige URL publica HTTPS para notification_url y auto_return
  if (esHttpsPublico) {
    cuerpoPreferencia.notification_url = `${opciones.urlBase}/api/pagos/webhook`;
    cuerpoPreferencia.auto_return = "approved";
  }

  const respuesta = await fetch(`${API_MERCADO_PAGO}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
    },
    body: JSON.stringify(cuerpoPreferencia),
  });

  if (!respuesta.ok) {
    const detalleError = await respuesta.text().catch(() => "");
    console.error(`[mercadopago] Error al crear preferencia (${respuesta.status}):`, detalleError);
    throw new ErrorNegocioCheckout(
      "MP_PREFERENCIA",
      "Mercado Pago rechazó la creación del pago. Verificá las credenciales o probá de nuevo en unos minutos.",
    );
  }

  const preferencia = (await respuesta.json()) as {
    id: string;
    init_point?: string;
    sandbox_init_point?: string;
  };
  const esCredencialPrueba = (process.env.MERCADO_PAGO_ACCESS_TOKEN ?? "").startsWith("TEST-");
  const urlPago = esCredencialPrueba
    ? (preferencia.sandbox_init_point ?? preferencia.init_point ?? null)
    : (preferencia.init_point ?? preferencia.sandbox_init_point ?? null);

  return { modo: "REAL", preferenciaId: preferencia.id, urlPago };
}

/** Asocia la preferencia creada al pedido pendiente. */
export async function registrarPreferencia(
  numeroOrden: string,
  preferenciaId: string | null,
): Promise<void> {
  await prisma.pedido.updateMany({
    where: { numeroOrden, estado: "PENDIENTE" },
    data: { preferenciaId },
  });
}

/**
 * Consulta el pago en la API publica de MP (usada por el webhook para
 * no fiarse del cuerpo del POST).
 */
export async function consultarPagoMercadoPago(pagoExternoId: string) {
  const respuesta = await fetch(`${API_MERCADO_PAGO}/v1/payments/${pagoExternoId}`, {
    headers: { Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}` },
  });
  if (!respuesta.ok) {
    throw new ErrorNegocioCheckout(
      "MP_PAGO_INEXISTENTE",
      "El pago informado por Mercado Pago no existe.",
    );
  }
  const pago = (await respuesta.json()) as {
    status: string;
    external_reference: string | null;
    payment_method_id: string | null;
  };
  return {
    estado: pago.status,
    externalReference: pago.external_reference,
    metodoPago: pago.payment_method_id ?? "mercadopago",
  };
}

/** RF-24 (modo simulado): pago aprobado. Fase 1 + fase 2 en linea. */
export async function pagarSimuladoAprobado(
  usuarioId: string,
  cuponCodigo?: string | null,
): Promise<string> {
  const pedido = await crearPedidoPendiente(usuarioId, { cuponCodigo });
  await aprobarPedidoPendiente(pedido.numeroOrden, {
    metodoPago: "Mercado Pago (Checkout Pro)",
  });
  await notificarConfirmacion(pedido.numeroOrden);
  return pedido.numeroOrden;
}

/** RF-25 (modo simulado): pago rechazado; el carrito queda intacto. */
export async function pagarSimuladoRechazado(
  usuarioId: string,
  cuponCodigo?: string | null,
): Promise<string> {
  const pedido = await crearPedidoPendiente(usuarioId, { cuponCodigo });
  await rechazarPedidoPendiente(pedido.numeroOrden, {
    metodoPago: "Mercado Pago (Checkout Pro)",
  });
  return pedido.numeroOrden;
}

/**
 * RF-24 (modo real): crea el pedido pendiente, genera la preferencia y
 * devuelve la URL de Checkout Pro.
 */
export async function iniciarPagoMercadoPago(
  usuarioId: string,
  correoComprador: string,
  urlBase: string,
  cuponCodigo?: string | null,
): Promise<PreferenciaPago & { numeroOrden: string }> {
  const pedido = await crearPedidoPendiente(usuarioId, { cuponCodigo });
  const preferencia = await crearPreferenciaPago(pedido, { correoComprador, urlBase });
  await registrarPreferencia(pedido.numeroOrden, preferencia.preferenciaId);
  return { ...preferencia, numeroOrden: pedido.numeroOrden };
}

/**
 * Webhook de MP: consulta el pago real y ejecuta la fase 2 sobre el
 * pedido vinculado por external_reference. Un webhook repetido es
 * inofensivo: `aprobarPedidoPendiente` es idempotente.
 */
export async function procesarWebhookPago(
  pagoExternoId: string,
): Promise<{ numeroOrden: string; estado: string }> {
  const pago = await consultarPagoMercadoPago(pagoExternoId);
  const numeroOrden = pago.externalReference ?? "";

  if (!numeroOrden) {
    throw new ErrorNegocioCheckout(
      "MP_SIN_REFERENCIA",
      "El pago no referencia a un pedido de la tienda.",
    );
  }

  if (pago.estado === "approved") {
    try {
      await aprobarPedidoPendiente(numeroOrden, {
        metodoPago: pago.metodoPago,
        pagoExternoId,
      });
    } catch (error) {
      // Stock agotado durante el cobro: se registra el rechazo para
      // que el comprador pueda reintentar con carrito intacto.
      if (error instanceof ErrorNegocioCheckout && error.codigo === "STOCK_INSUFICIENTE") {
        await rechazarPedidoPendiente(numeroOrden, {
          metodoPago: pago.metodoPago,
          pagoExternoId,
        });
        return { numeroOrden, estado: "rejected" };
      }
      throw error;
    }
    await notificarConfirmacion(numeroOrden);
    return { numeroOrden, estado: "approved" };
  }

  if (pago.estado === "rejected" || pago.estado === "cancelled") {
    await rechazarPedidoPendiente(numeroOrden, {
      metodoPago: pago.metodoPago,
      pagoExternoId,
    });
  }
  return { numeroOrden, estado: pago.estado };
}
