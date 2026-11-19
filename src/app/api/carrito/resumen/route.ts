import { NextResponse } from "next/server";

import { sesionActual } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { resolverComprador } from "@/modules/carrito/services/carrito";

export const dynamic = "force-dynamic";

/**
 * GET /api/carrito/resumen
 * Devuelve la cantidad total de unidades en el carrito del usuario autenticado
 * para mostrar el contador en el header.
 */
export async function GET() {
  const sesion = await sesionActual();
  if (!sesion?.user) {
    return NextResponse.json({ totalItems: 0 }, { status: 200 });
  }

  try {
    const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
    const carrito = await prisma.carrito.findUnique({
      where: { clienteId: usuarioId },
      select: { items: { select: { cantidad: true } } },
    });
    const totalItems =
      carrito?.items.reduce((acc, item) => acc + item.cantidad, 0) ?? 0;

    return NextResponse.json(
      { totalItems },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ totalItems: 0 }, { status: 200 });
  }
}
