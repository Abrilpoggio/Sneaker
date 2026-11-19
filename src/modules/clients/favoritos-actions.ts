"use server";

import { revalidatePath } from "next/cache";

import { sesionActual } from "@/lib/permissions";
import { resolverComprador } from "@/modules/carrito/services/carrito";
import { alternarFavorito } from "@/modules/clients/services/favoritos";

export interface ResultadoFavorito {
  ok: boolean;
  esFavorito?: boolean;
  requiereLogin?: boolean;
  error?: string;
}

/**
 * Server Action para guardar o quitar un producto de favoritos (RF-20).
 */
export async function accionAlternarFavorito(
  productoId: string,
): Promise<ResultadoFavorito> {
  const sesion = await sesionActual();
  if (!sesion?.user) {
    return { ok: false, requiereLogin: true };
  }

  if (!productoId?.trim()) {
    return { ok: false, error: "Producto inválido." };
  }

  try {
    const clienteId = await resolverComprador(sesion.user.id, sesion.user.email);
    const { esFavorito, sku } = await alternarFavorito(clienteId, productoId);

    revalidatePath("/");
    revalidatePath("/catalogo");
    revalidatePath("/cuenta");
    revalidatePath("/cuenta/favoritos");
    if (sku) {
      revalidatePath(`/producto/${sku}`);
    }

    return { ok: true, esFavorito };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "No pudimos actualizar tus favoritos.",
    };
  }
}
