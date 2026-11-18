"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireCliente } from "@/lib/permissions";
import { resolverComprador } from "@/modules/carrito/services/carrito";
import {
  actualizarEstadoPedidoSchema,
  repetirCompraSchema,
} from "./schemas";
import {
  actualizarEstadoPedidoAdmin,
  ErrorNegocioPedido,
  ETIQUETA_ESTADO_PEDIDO,
  repetirPedidoAnterior,
} from "./services/pedidos";

export type PedidoFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

/**
 * RF-31 / RF-46 / CU12: server action exclusiva para ADMIN que actualiza el
 * estado de despacho de un pedido y revalida las vistas de admin y cliente.
 */
export async function actualizarEstadoPedidoAction(
  _prevState: PedidoFormState,
  formData: FormData,
): Promise<PedidoFormState> {
  const sesion = await requireAdmin();

  const validado = actualizarEstadoPedidoSchema.safeParse({
    pedidoId: formData.get("pedidoId"),
    nuevoEstado: formData.get("nuevoEstado"),
  });

  if (!validado.success) {
    return {
      status: "error",
      message: validado.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }

  try {
    const actualizado = await actualizarEstadoPedidoAdmin({
      pedidoId: validado.data.pedidoId,
      nuevoEstado: validado.data.nuevoEstado,
      adminUsuarioId: sesion.user.id,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/pedidos");
    revalidatePath(`/pedido/${actualizado.numeroOrden}`);
    revalidatePath("/cuenta/pedidos");

    const info = ETIQUETA_ESTADO_PEDIDO[actualizado.estado];
    return {
      status: "success",
      message: `Estado de ${actualizado.numeroOrden} actualizado a "${info.nombre}".`,
    };
  } catch (error) {
    if (error instanceof ErrorNegocioPedido) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}

/**
 * RF-33 / CU10: server action para que un cliente repita un pedido anterior
 * cargando sus variantes disponibles al carrito actual.
 */
export async function repetirCompraAction(
  _prevState: PedidoFormState,
  formData: FormData,
): Promise<PedidoFormState> {
  const sesion = await requireCliente();
  const clienteId = await resolverComprador(sesion.user.id, sesion.user.email);

  const validado = repetirCompraSchema.safeParse({
    pedidoId: formData.get("pedidoId"),
  });

  if (!validado.success) {
    return {
      status: "error",
      message: validado.error.issues[0]?.message ?? "Pedido inválido.",
    };
  }

  try {
    const res = await repetirPedidoAnterior(clienteId, validado.data.pedidoId);

    revalidatePath("/carrito");
    revalidatePath("/cuenta/pedidos");

    const avisoFaltantes =
      res.sinStock.length > 0
        ? ` Sin stock actual: ${res.sinStock.join(", ")}.`
        : "";

    return {
      status: "success",
      message: `Se agregaron ${res.agregados} artículo(s) del pedido ${res.numeroOrden} a tu carrito.${avisoFaltantes}`,
    };
  } catch (error) {
    if (error instanceof ErrorNegocioPedido) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}
