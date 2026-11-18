import { TipoMovimiento } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import type { ExtraccionInput } from "@/modules/inventory/schemas";

/**
 * Registro de extracciones de stock (Sprint 4 - Camila Viegas).
 *
 * RF-36 / RN-07: toda extraccion descuenta stock y crea un
 * MovimientoStock con motivo y responsable. Nunca se emite como VENTA
 * para no inflar las estadisticas de ventas.
 */
export class ErrorNegocioExtraccion extends Error {
  constructor(
    public codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorNegocioExtraccion";
  }
}

export interface ExtraccionListado {
  id: string;
  fecha: Date;
  cantidad: number;
  motivo: string | null;
  stockResultante: number | null;
  responsable: string;
  responsableCorreo: string;
  producto: string;
  sku: string;
  variante: string;
}

function tituloVariante(variante: {
  talle: string | null;
  color: string | null;
  material: string | null;
}): string {
  return (
    [variante.talle, variante.color, variante.material].filter(Boolean).join(" · ") ||
    "Variante única"
  );
}

/**
 * Descuenta stock con guarda atomica y registra la extraccion en la
 * misma transaccion. `responsableId` es el usuario autenticado que
 * ejecuta la operacion.
 */
export async function registrarExtraccion(
  responsableId: string,
  input: ExtraccionInput,
): Promise<{ movimientoId: string; stockResultante: number }> {
  return prisma.$transaction(async (tx) => {
    const variante = await tx.varianteProducto.findUnique({
      where: { id: input.varianteId },
      select: {
        id: true,
        stockActual: true,
        producto: { select: { nombre: true } },
      },
    });
    if (!variante) {
      throw new ErrorNegocioExtraccion(
        "VARIANTE_INEXISTENTE",
        "La variante seleccionada no existe.",
      );
    }

    const actualizado = await tx.varianteProducto.updateMany({
      where: { id: input.varianteId, stockActual: { gte: input.cantidad } },
      data: { stockActual: { decrement: input.cantidad } },
    });
    if (actualizado.count === 0) {
      throw new ErrorNegocioExtraccion(
        "STOCK_INSUFICIENTE",
        `Solo hay ${variante.stockActual} unidad(es) de "${variante.producto.nombre}" y se intentan extraer ${input.cantidad}.`,
      );
    }

    const stockResultante = variante.stockActual - input.cantidad;
    const movimiento = await tx.movimientoStock.create({
      data: {
        tipo: TipoMovimiento.EXTRACCION,
        cantidad: input.cantidad,
        justificacion: input.motivo,
        stockResultante,
        varianteProductoId: input.varianteId,
        responsableId,
      },
      select: { id: true },
    });

    return { movimientoId: movimiento.id, stockResultante };
  });
}

/** Historial de extracciones para el panel. */
export async function listarExtracciones(limite = 100): Promise<ExtraccionListado[]> {
  const movimientos = await prisma.movimientoStock.findMany({
    where: { tipo: TipoMovimiento.EXTRACCION },
    orderBy: { fecha: "desc" },
    take: limite,
    include: {
      responsable: { select: { usuario: true, correo: true } },
      varianteProducto: {
        include: { producto: { select: { nombre: true, sku: true } } },
      },
    },
  });

  return movimientos.map((movimiento) => ({
    id: movimiento.id,
    fecha: movimiento.fecha,
    cantidad: movimiento.cantidad,
    motivo: movimiento.justificacion,
    stockResultante: movimiento.stockResultante,
    responsable: movimiento.responsable.usuario,
    responsableCorreo: movimiento.responsable.correo,
    producto: movimiento.varianteProducto.producto.nombre,
    sku: movimiento.varianteProducto.producto.sku,
    variante: tituloVariante(movimiento.varianteProducto),
  }));
}

/** Variantes con stock para el selector del formulario. */
export async function listarVariantesExtraccion() {
  const variantes = await prisma.varianteProducto.findMany({
    where: { producto: { estado: "ACTIVO" } },
    select: {
      id: true,
      talle: true,
      color: true,
      material: true,
      stockActual: true,
      producto: { select: { nombre: true, sku: true } },
    },
    orderBy: [{ producto: { nombre: "asc" } }, { talle: "asc" }],
  });

  return variantes
    .map((variante) => ({
      ...variante,
      titulo: tituloVariante(variante),
    }))
    .sort((a, b) => {
      if (a.stockActual > 0 && b.stockActual === 0) return -1;
      if (a.stockActual === 0 && b.stockActual > 0) return 1;
      return 0;
    });
}
