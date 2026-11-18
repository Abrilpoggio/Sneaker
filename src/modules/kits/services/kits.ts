import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { calcularStockKit } from "@/modules/inventory/services/stock";
import type { KitAdminInput, KitComponenteInput } from "@/modules/kits/schemas";

/**
 * Servicio del ABM de kits (Sprint 4 - Camila Viegas).
 *
 * RF-38: un kit es un producto compuesto por 2..* variantes.
 * RF-39: se puede dar de baja/reactivar sin borrar el historial.
 * RN-06: el stock nunca se persiste; se deriva del componente con
 * menor disponibilidad (inventory/services/stock.ts).
 */

export class ErrorNegocioKit extends Error {
  constructor(
    public codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorNegocioKit";
  }
}

export interface KitListado {
  productoId: string;
  sku: string;
  nombre: string;
  estado: "ACTIVO" | "INACTIVO";
  precioVenta: number;
  categoria: string;
  marca: string;
  stockCalculado: number;
  componentes: {
    varianteId: string;
    titulo: string;
    cantidad: number;
    stockComponente: number;
  }[];
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

/** Listado del panel: incluye stock calculado y detalle de componentes. */
export async function listarKits(): Promise<KitListado[]> {
  const registros = await prisma.kit.findMany({
    include: {
      producto: {
        include: {
          categoria: { select: { nombre: true } },
          marca: { select: { nombre: true } },
        },
      },
      componentes: {
        include: {
          variante: {
            include: { producto: { select: { nombre: true } } },
          },
        },
        orderBy: { variante: { producto: { nombre: "asc" } } },
      },
    },
    orderBy: { producto: { nombre: "asc" } },
  });

  return registros.map((kit) => ({
    productoId: kit.productoId,
    sku: kit.producto.sku,
    nombre: kit.producto.nombre,
    estado: kit.producto.estado,
    precioVenta: Number(kit.producto.precioVenta),
    categoria: kit.producto.categoria.nombre,
    marca: kit.producto.marca.nombre,
    stockCalculado: calcularStockKit(kit.componentes),
    componentes: kit.componentes.map((componente) => ({
      varianteId: componente.varianteId,
      titulo: `${componente.variante.producto.nombre} (${tituloVariante(componente.variante)})`,
      cantidad: componente.cantidad,
      stockComponente: componente.variante.stockActual,
    })),
  }));
}

/** Ficha completa de un kit para el formulario de edicion. */
export async function obtenerKit(productoId: string) {
  return prisma.kit.findUnique({
    where: { productoId },
    include: {
      producto: {
        include: {
          categoria: { select: { id: true, nombre: true } },
          marca: { select: { id: true, nombre: true } },
        },
      },
      componentes: {
        include: {
          variante: {
            include: { producto: { select: { nombre: true } } },
          },
        },
      },
    },
  });
}

/** Variantes disponibles para elegir como componente del kit. */
export async function listarVariantesComponentes(incluirIds: string[] = []) {
  return prisma.varianteProducto.findMany({
    where: {
      OR: [
        { producto: { estado: "ACTIVO" } },
        ...(incluirIds.length > 0 ? [{ id: { in: incluirIds } }] : []),
      ],
    },
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
}

/**
 * Valida las referencias del formulario. Devuelve un mensaje de error
 * o null. Un componente debe ser una variante real; el kit no puede
 * incluir variantes de si mismo (en la practica un kit no tiene).
 */
export async function validarComponentesKit(
  productoId: string | null,
  componentes: readonly KitComponenteInput[],
): Promise<string | null> {
  const ids = componentes.map((componente) => componente.varianteId);
  const variantes = await prisma.varianteProducto.findMany({
    where: { id: { in: ids } },
    select: { id: true, productoId: true },
  });

  if (variantes.length !== new Set(ids).size) {
    return "Una o mas variantes seleccionadas ya no existen.";
  }
  if (productoId && variantes.some((variante) => variante.productoId === productoId)) {
    return "El kit no puede contener variantes de si mismo.";
  }
  return null;
}

function datosProducto(input: KitAdminInput) {
  return {
    sku: input.sku,
    nombre: input.nombre,
    descripcion: input.descripcion,
    precioVenta: new Prisma.Decimal(input.precioVenta),
    costoCompra: new Prisma.Decimal(input.costoCompra),
    garantia: input.garantia,
    imagen: input.imagen,
    estado: input.estado === "ACTIVO" ? ("ACTIVO" as const) : ("INACTIVO" as const),
    categoriaId: input.categoriaId,
    marcaId: input.marcaId,
    proveedorId: input.proveedorId,
  };
}

/** RF-38: alta de kit + componentes en una sola transaccion. */
export async function crearKit(
  input: KitAdminInput,
  componentes: readonly KitComponenteInput[],
): Promise<{ productoId: string }> {
  const producto = await prisma.producto.create({
    data: {
      ...datosProducto(input),
      kit: {
        create: {
          componentes: {
            create: componentes.map((componente) => ({
              varianteId: componente.varianteId,
              cantidad: componente.cantidad,
            })),
          },
        },
      },
    },
    select: { id: true },
  });
  return { productoId: producto.id };
}

/** RF-38: edicion de datos y composicion del kit. */
export async function actualizarKit(
  productoId: string,
  input: KitAdminInput,
  componentes: readonly KitComponenteInput[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const kit = await tx.kit.findUnique({
      where: { productoId },
      select: { productoId: true },
    });
    if (!kit) {
      throw new ErrorNegocioKit("KIT_INEXISTENTE", "El kit no existe.");
    }

    await tx.producto.update({
      where: { id: productoId },
      data: datosProducto(input),
    });
    await tx.kitComponente.deleteMany({ where: { kitProductoId: productoId } });
    await tx.kitComponente.createMany({
      data: componentes.map((componente) => ({
        kitProductoId: productoId,
        varianteId: componente.varianteId,
        cantidad: componente.cantidad,
      })),
    });
  });
}

/** RF-39: baja logica / reactivacion del kit. */
export async function cambiarEstadoKit(
  productoId: string,
  estado: "ACTIVO" | "INACTIVO",
): Promise<void> {
  const kit = await prisma.kit.findUnique({
    where: { productoId },
    select: { productoId: true },
  });
  if (!kit) {
    throw new ErrorNegocioKit("KIT_INEXISTENTE", "El kit no existe.");
  }
  await prisma.producto.update({ where: { id: productoId }, data: { estado } });
}

/**
 * Baja fisica permitida solo si el kit nunca se vendio ni esta en un
 * carrito. Con historial se conserva y se desactiva (RF-39 / RNF-09).
 */
export async function eliminarKit(productoId: string): Promise<void> {
  const [kit, vendidos, enCarritos] = await Promise.all([
    prisma.kit.findUnique({ where: { productoId }, select: { productoId: true } }),
    prisma.itemPedido.count({ where: { kitProductoId: productoId } }),
    prisma.itemCarrito.count({ where: { kitProductoId: productoId } }),
  ]);
  if (!kit) {
    throw new ErrorNegocioKit("KIT_INEXISTENTE", "El kit no existe.");
  }
  if (vendidos > 0 || enCarritos > 0) {
    throw new ErrorNegocioKit(
      "KIT_CON_HISTORIAL",
      "El kit tiene ventas o esta en un carrito: desactivalo en lugar de eliminarlo (RNF-09).",
    );
  }
  await prisma.producto.delete({ where: { id: productoId } });
}
