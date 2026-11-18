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

export const TRANSICIONES_PERMITIDAS: Record<EstadoPedido, readonly EstadoPedido[]> = {
  [EstadoPedido.CONFIRMADO]: [
    EstadoPedido.PREPARANDO,
    EstadoPedido.EN_CAMINO,
    EstadoPedido.RECIBIDO,
    EstadoPedido.CANCELADO,
  ],
  [EstadoPedido.PREPARANDO]: [
    EstadoPedido.EN_CAMINO,
    EstadoPedido.RECIBIDO,
    EstadoPedido.CANCELADO,
  ],
  [EstadoPedido.EN_CAMINO]: [
    EstadoPedido.RECIBIDO,
    EstadoPedido.CANCELADO,
  ],
  [EstadoPedido.RECIBIDO]: [],
  [EstadoPedido.PENDIENTE]: [
    EstadoPedido.CONFIRMADO,
    EstadoPedido.CANCELADO,
  ],
  [EstadoPedido.CANCELADO]: [],
  [EstadoPedido.RECHAZADO]: [],
};

export const ETIQUETA_ESTADO_PEDIDO: Record<
  EstadoPedido,
  { nombre: string; descripcion: string; badgeClase: string }
> = {
  CONFIRMADO: {
    nombre: "Confirmado",
    descripcion: "Pago acreditado. Pedido listo para entrar en preparación.",
    badgeClase: "border-emerald-700 bg-emerald-50 text-emerald-800",
  },
  PREPARANDO: {
    nombre: "Preparando",
    descripcion: "El depósito está armando y embalando el paquete.",
    badgeClase: "border-blue-700 bg-blue-50 text-blue-800",
  },
  EN_CAMINO: {
    nombre: "En camino",
    descripcion: "El pedido ya fue despachado hacia el domicilio de entrega.",
    badgeClase: "border-indigo-700 bg-indigo-50 text-indigo-800",
  },
  RECIBIDO: {
    nombre: "Recibido",
    descripcion: "Entregado en el domicilio de destino.",
    badgeClase: "border-green-800 bg-green-100 text-green-900",
  },
  PENDIENTE: {
    nombre: "Pendiente de pago",
    descripcion: "Esperando acreditación de la pasarela de pago.",
    badgeClase: "border-amber-600 bg-amber-50 text-amber-800",
  },
  CANCELADO: {
    nombre: "Cancelado",
    descripcion: "Pedido anulado y stock restaurado en inventario.",
    badgeClase: "border-neutral-400 bg-neutral-100 text-neutral-700",
  },
  RECHAZADO: {
    nombre: "Pago rechazado",
    descripcion: "El cobro fue rechazado por el medio de pago.",
    badgeClase: "border-[#CF1A1F] bg-[#FFCDD2] text-[#7C0300]",
  },
};

