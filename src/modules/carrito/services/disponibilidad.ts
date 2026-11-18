import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

/**
 * Disponibilidad real del carrito (Sprint 4 - Camila Viegas).
 *
 * RF-21 / RN-04 / RN-05: una linea reserva stock mientras el carrito
 * tiene una reserva vigente. Las lineas de kit no tienen variante
 * propia: reservan (y consumen) las variantes de sus componentes en
 * proporcion a la cantidad de kits.
 *
 * Los helpers calculan siempre "stock fisico - reservas ajenas -
 * consumo propio restante", de modo que un kit y una variante que
 * comparten un componente nunca se sobrevendan dentro del mismo
 * carrito.
 */

type Cliente = Prisma.TransactionClient | typeof prisma;

/**
 * RN-04: unidades de cada variante retenidas por carritos con reserva
 * vigente. Si se pasa `excluirCarritoId`, no cuenta el carrito propio.
 */
export async function reservasVigentesPorVariante(
  tx: Cliente,
  varianteIds: readonly string[],
  excluirCarritoId?: string,
): Promise<Map<string, number>> {
  const reservas = new Map<string, number>();
  if (varianteIds.length === 0) return reservas;

  const ids = [...varianteIds];
  const carrito = {
    reservaExpiracion: { gt: new Date() },
    ...(excluirCarritoId ? { id: { not: excluirCarritoId } } : {}),
  };

  const [directas, kits] = await Promise.all([
    tx.itemCarrito.groupBy({
      by: ["varianteProductoId"],
      _sum: { cantidad: true },
      where: { varianteProductoId: { in: ids }, carrito },
    }),
    tx.itemCarrito.findMany({
      where: {
        kitProductoId: { not: null },
        carrito,
        kit: { componentes: { some: { varianteId: { in: ids } } } },
      },
      select: {
        cantidad: true,
        kit: {
          select: {
            componentes: {
              where: { varianteId: { in: ids } },
              select: { varianteId: true, cantidad: true },
            },
          },
        },
      },
    }),
  ]);

  for (const grupo of directas) {
    if (!grupo.varianteProductoId) continue;
    reservas.set(grupo.varianteProductoId, grupo._sum.cantidad ?? 0);
  }

  for (const item of kits) {
    for (const componente of item.kit?.componentes ?? []) {
      reservas.set(
        componente.varianteId,
        (reservas.get(componente.varianteId) ?? 0) + item.cantidad * componente.cantidad,
      );
    }
  }

  return reservas;
}

/**
 * Unidades de cada variante que consume el carrito propio, contando
 * tanto lineas directas como los componentes de las lineas de kit.
 * `excluirItemId` permite recalcular una linea que se esta editando.
 */
export async function consumoCarritoPorVariante(
  tx: Cliente,
  carritoId: string,
  varianteIds: readonly string[],
  excluirItemId?: string,
): Promise<Map<string, number>> {
  const consumo = new Map<string, number>();
  if (varianteIds.length === 0) return consumo;

  const ids = [...varianteIds];
  const items = await tx.itemCarrito.findMany({
    where: {
      carritoId,
      ...(excluirItemId ? { id: { not: excluirItemId } } : {}),
    },
    select: {
      cantidad: true,
      varianteProductoId: true,
      kit: {
        select: {
          componentes: {
            where: { varianteId: { in: ids } },
            select: { varianteId: true, cantidad: true },
          },
        },
      },
    },
  });

  for (const item of items) {
    if (item.varianteProductoId && ids.includes(item.varianteProductoId)) {
      consumo.set(
        item.varianteProductoId,
        (consumo.get(item.varianteProductoId) ?? 0) + item.cantidad,
      );
    }
    for (const componente of item.kit?.componentes ?? []) {
      consumo.set(
        componente.varianteId,
        (consumo.get(componente.varianteId) ?? 0) + item.cantidad * componente.cantidad,
      );
    }
  }

  return consumo;
}

/**
 * Unidades disponibles para el carrito de cada variante:
 * stock fisico - reservas ajenas - consumo propio restante.
 */
export async function disponibilidadPorVariante(
  tx: Cliente,
  varianteIds: readonly string[],
  carritoId: string,
  excluirItemId?: string,
): Promise<Map<string, number>> {
  const disponibles = new Map<string, number>();
  if (varianteIds.length === 0) return disponibles;

  const ids = [...new Set(varianteIds)];
  const [variantes, reservas, consumo] = await Promise.all([
    tx.varianteProducto.findMany({
      where: { id: { in: ids } },
      select: { id: true, stockActual: true },
    }),
    reservasVigentesPorVariante(tx, ids, carritoId),
    consumoCarritoPorVariante(tx, carritoId, ids, excluirItemId),
  ]);

  for (const variante of variantes) {
    disponibles.set(
      variante.id,
      Math.max(
        variante.stockActual -
          (reservas.get(variante.id) ?? 0) -
          (consumo.get(variante.id) ?? 0),
        0,
      ),
    );
  }

  return disponibles;
}

/**
 * RN-06: unidades de kit que puede llevar el carrito, limitadas por
 * la variante componente con menor disponibilidad.
 */
export function disponibilidadKit(
  componentes: readonly { cantidad: number; varianteId: string }[],
  disponibles: Map<string, number>,
): number {
  if (componentes.length === 0) return 0;
  return Math.min(
    ...componentes.map((componente) =>
      Math.floor(
        (disponibles.get(componente.varianteId) ?? 0) / Math.max(componente.cantidad, 1),
      ),
    ),
  );
}
