import { z } from "zod";
import { EstadoPedido } from "@/generated/prisma/enums";

/**
 * Validaciones del modulo de pedidos y envios (Sprint 4 - Abril Poggio).
 *
 * RF-30: estados de despacho (CONFIRMADO, PREPARANDO, EN_CAMINO, RECIBIDO)
 *   mas CANCELADO (con restauracion automatica de stock, RF-37).
 * RF-31 / RF-46 / CU12: actualizacion manual por parte del administrador.
 */

export const ESTADOS_DESPACHO_ADMIN: readonly EstadoPedido[] = [
  EstadoPedido.CONFIRMADO,
  EstadoPedido.PREPARANDO,
  EstadoPedido.EN_CAMINO,
  EstadoPedido.RECIBIDO,
  EstadoPedido.CANCELADO,
] as const;

export const actualizarEstadoPedidoSchema = z.object({
  pedidoId: z.string().trim().min(1, "El pedido es obligatorio."),
  nuevoEstado: z.enum(
    [
      EstadoPedido.CONFIRMADO,
      EstadoPedido.PREPARANDO,
      EstadoPedido.EN_CAMINO,
      EstadoPedido.RECIBIDO,
      EstadoPedido.CANCELADO,
    ],
    { message: "Selecciona un estado de pedido valido." },
  ),
});

export const repetirCompraSchema = z.object({
  pedidoId: z.string().trim().min(1, "El pedido es obligatorio."),
});

export type ActualizarEstadoPedidoInput = z.infer<typeof actualizarEstadoPedidoSchema>;
