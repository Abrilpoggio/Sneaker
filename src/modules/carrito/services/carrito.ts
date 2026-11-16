import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { resolverUsuarioActivoId } from "@/modules/clients/services/perfil";

import {
  DURACION_RESERVA_SEG,
  agregarAlCarritoSchema,
  actualizarCantidadSchema,
  quitarItemSchema,
} from "../schemas";

/**
 * Servicio del Modulo Carrito (Sprint 3 - Abril Poggio).
 *
 * RF-21: agregar variantes al carrito, modificar cantidades y quitar
 *   lineas respetando la disponibilidad real.
 * RF-29 / RN-04: la reserva temporal retiene stock entre 1 y 2
 *   minutos (90 s) y se libera sola al vencer: no hay proceso externo
 *   ni columnas de stock "bloqueado"; el stock reservado se calcula
 *   sumando los items de carritos con `reservaExpiracion` en el
 *   futuro, de modo que al vencer deja de computar en todas las
 *   consultas sin necesidad de limpieza.
 * RN-01: toda entrada exige sesion resuelta contra la base.
 * RN-05: ante concurrencia, la reserva es a quien la pide primero;
 *   el pago confirmado (Sprint 3 de Camila) define al ganador final.
 *
 * Decision 8 del modelado: `precioUnitario` se congela al agregar la
 * linea y no se re-escribe al modificar cantidades.
 */

export class ErrorNegocioCarrito extends Error {
  constructor(
    public codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorNegocioCarrito";
  }
}

type Transaccion = Prisma.TransactionClient;

export interface ItemCarritoVista {
  id: string;
  varianteProductoId: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  nombreProducto: string;
  sku: string;
  imagen: string | null;
  productoActivo: boolean;
  tituloVariante: string;
  stockDisponible: number;
  /** RF-21: unidades que la disponibilidad actual no puede cubrir. */
  faltante: number;
}

export interface EstadoCarrito {
  carritoId: string;
  items: ItemCarritoVista[];
  subtotal: number;
  totalItems: number;
  reservaExpiracion: Date | null;
  reservaActiva: boolean;
}

/**
 * RN-04: los carritos con reserva vigente retienen el stock de sus
 * items. `excluirCarritoId` permite mirar solo la reserva ajena.
 */
function reservadoPorOtros(
  tx: Transaccion,
  varianteId: string,
  excluirCarritoId?: string,
): Promise<number> {
  return tx.itemCarrito
    .aggregate({
      _sum: { cantidad: true },
      where: {
        varianteProductoId: varianteId,
        carrito: {
          reservaExpiracion: { gt: new Date() },
          ...(excluirCarritoId ? { id: { not: excluirCarritoId } } : {}),
        },
      },
    })
    .then((r) => r._sum.cantidad ?? 0);
}

export async function obtenerCarrito(usuarioId: string) {
  return prisma.carrito.upsert({
    where: { clienteId: usuarioId },
    update: {},
    create: { clienteId: usuarioId },
  });
}

async function asegurarCarritoLibre(
  tx: Transaccion,
  carritoId: string,
): Promise<void> {
  const carrito = await tx.carrito.findUnique({
    where: { id: carritoId },
    select: { reservaExpiracion: true },
  });
  if (carrito?.reservaExpiracion && carrito.reservaExpiracion > new Date()) {
    throw new ErrorNegocioCarrito(
      "CARRITO_RESERVADO",
      "Tu carrito está reservado mientras dura la compra (RN-04). Cancelá la reserva para modificarlo.",
    );
  }
}

/**
 * RN-01: resuelve la sesion contra la base (id o correo de respaldo)
 * y garantiza que exista la fila 1:1 en `clientes` para evitar fallos
 * de clave foranea (`carritos_clienteId_fkey`) cuando un usuario
 * (p. ej. ADMIN probando la tienda o cuenta recién creada) opera el carrito.
 */
export async function resolverComprador(
  usuarioId: string,
  correo?: string | null,
): Promise<string> {
  const idResuelto = await resolverUsuarioActivoId(usuarioId, correo);

  const usuario = await prisma.usuario.findUnique({
    where: { id: idResuelto },
    select: { id: true, usuario: true, cliente: { select: { usuarioId: true } } },
  });

  if (usuario && !usuario.cliente) {
    await prisma.cliente.upsert({
      where: { usuarioId: usuario.id },
      update: {},
      create: {
        usuarioId: usuario.id,
        nombre: usuario.usuario,
        apellido: "",
      },
    });
  }

  return idResuelto;
}

/** RF-21: agrega una variante al carrito con tope de stock real. */
export async function agregarItemCarrito(
  usuarioId: string,
  entrada: unknown,
): Promise<void> {
  const { varianteId, cantidad } = agregarAlCarritoSchema.parse(entrada);

  await prisma.$transaction(async (tx) => {
    const variante = await tx.varianteProducto.findUnique({
      where: { id: varianteId },
      select: {
        id: true,
        stockActual: true,
        producto: { select: { estado: true, precioVenta: true } },
      },
    });
    if (!variante) {
      throw new ErrorNegocioCarrito("VARIANTE_INEXISTENTE", "La variante seleccionada no existe.");
    }
    if (variante.producto.estado !== "ACTIVO") {
      throw new ErrorNegocioCarrito("PRODUCTO_INACTIVO", "El producto no está disponible.");
    }

    const carrito = await tx.carrito.upsert({
      where: { clienteId: usuarioId },
      update: {},
      create: { clienteId: usuarioId },
    });
    await asegurarCarritoLibre(tx, carrito.id);

    const item = await tx.itemCarrito.findUnique({
      where: { carritoId_varianteProductoId: {
        carritoId: carrito.id,
        varianteProductoId: varianteId,
      } },
      select: { id: true, cantidad: true },
    });

    // RN-05: el tope es el stock fisico menos lo reservado por OTROS
    // carritos. Mis propias lineas no se cuentan contra stock ajeno,
    // pero la cantidad acumulada (en carrito + nueva) no puede superar el disponible.
    const reservado = await reservadoPorOtros(tx, varianteId, carrito.id);
    const disponible = variante.stockActual - reservado;
    if (disponible <= 0) {
      throw new ErrorNegocioCarrito(
        "SIN_STOCK",
        "No quedan unidades disponibles de esa variante (reservadas por otro cliente u agotadas).",
      );
    }
    const cantidadActual = item?.cantidad ?? 0;
    const cantidadTotal = cantidadActual + cantidad;
    if (cantidadTotal > disponible) {
      const restantesParaAgregar = Math.max(disponible - cantidadActual, 0);
      throw new ErrorNegocioCarrito(
        "STOCK_INSUFICIENTE",
        cantidadActual > 0
          ? `Ya tenés ${cantidadActual} unidad(es) en el carrito y el stock disponible es ${disponible} (podés sumar hasta ${restantesParaAgregar} más).`
          : `Solo quedan ${disponible} unidad(es) de esta variante. Ajustá la cantidad para continuar.`,
      );
    }

    if (item) {
      // Decision 8: se conserva el precio congelado de la linea.
      await tx.itemCarrito.update({
        where: { id: item.id },
        data: { cantidad: cantidadTotal },
      });
    } else {
      await tx.itemCarrito.create({
        data: {
          carritoId: carrito.id,
          varianteProductoId: varianteId,
          cantidad,
          precioUnitario: variante.producto.precioVenta,
        },
      });
    }
  });
}

/** RF-21: modifica la cantidad de una linea; 0 la elimina. */
export async function actualizarCantidadItem(
  usuarioId: string,
  entrada: unknown,
): Promise<void> {
  const { itemId, cantidad } = actualizarCantidadSchema.parse(entrada);

  await prisma.$transaction(async (tx) => {
    const item = await tx.itemCarrito.findFirst({
      where: { id: itemId, carrito: { clienteId: usuarioId } },
      select: { id: true, carritoId: true, varianteProductoId: true },
    });
    if (!item) {
      throw new ErrorNegocioCarrito("ITEM_INEXISTENTE", "Ese item no pertenece a tu carrito.");
    }

    if (cantidad === 0) {
      await tx.itemCarrito.delete({ where: { id: item.id } });
      return;
    }

    await asegurarCarritoLibre(tx, item.carritoId);

    const variante = await tx.varianteProducto.findUnique({
      where: { id: item.varianteProductoId },
      select: { stockActual: true },
    });
    const reservado = await reservadoPorOtros(tx, item.varianteProductoId, item.carritoId);
    const disponible = (variante?.stockActual ?? 0) - reservado;
    if (cantidad > disponible) {
      throw new ErrorNegocioCarrito(
        "STOCK_INSUFICIENTE",
        `Solo quedan ${Math.max(disponible, 0)} unidad(es) de esta variante. Probá con una cantidad menor.`,
      );
    }

    await tx.itemCarrito.update({ where: { id: item.id }, data: { cantidad } });
  });
}

/** RF-21: quita una linea del carrito. Permitido aun con reserva. */
export async function quitarItemCarrito(
  usuarioId: string,
  entrada: unknown,
): Promise<void> {
  const { itemId } = quitarItemSchema.parse(entrada);

  await prisma.$transaction(async (tx) => {
    const item = await tx.itemCarrito.findFirst({
      where: { id: itemId, carrito: { clienteId: usuarioId } },
      select: { id: true },
    });
    if (!item) {
      throw new ErrorNegocioCarrito("ITEM_INEXISTENTE", "Ese item no pertenece a tu carrito.");
    }
    await tx.itemCarrito.delete({ where: { id: item.id } });
  });
}

/**
 * RF-29 / RN-04: inicia la reserva del carrito completo por
 * DURACION_RESERVA_SEG. La transaccion re-valida cada linea contra el
 * stock no reservado: si otro cliente reservo antes, aca se pierde la
 * carrera de forma explicita (RN-05) y la compra no avanza.
 */
export async function iniciarReservaCarrito(
  usuarioId: string,
): Promise<Date> {
  return prisma.$transaction(async (tx) => {
    const carrito = await tx.carrito.findUnique({
      where: { clienteId: usuarioId },
      select: {
        id: true,
        reservaExpiracion: true,
        items: { select: { id: true, cantidad: true, varianteProductoId: true } },
      },
    });
    if (!carrito) {
      throw new ErrorNegocioCarrito("CARRITO_VACIO", "Tu carrito está vacío.");
    }
    if (carrito.items.length === 0) {
      throw new ErrorNegocioCarrito("CARRITO_VACIO", "Tu carrito está vacío.");
    }

    // Reserva ya vigente: es idempotente, no reinicia el temporizador.
    if (carrito.reservaExpiracion && carrito.reservaExpiracion > new Date()) {
      return carrito.reservaExpiracion;
    }

    for (const item of carrito.items) {
      const reservado = await reservadoPorOtros(tx, item.varianteProductoId, carrito.id);
      const variante = await tx.varianteProducto.findUnique({
        where: { id: item.varianteProductoId },
        select: { stockActual: true, producto: { select: { nombre: true } } },
      });
      const disponible = (variante?.stockActual ?? 0) - reservado;
      if (item.cantidad > disponible) {
        throw new ErrorNegocioCarrito(
          "STOCK_INSUFICIENTE",
          `No hay stock suficiente de "${variante?.producto.nombre ?? "una variante"}": quedan ${Math.max(disponible, 0)} unidad(es) y tu carrito tiene ${item.cantidad}. Ajustá la cantidad para continuar.`,
        );
      }
    }

    const expiracion = new Date(Date.now() + DURACION_RESERVA_SEG * 1000);
    await tx.carrito.update({
      where: { id: carrito.id },
      data: { reservaExpiracion: expiracion },
    });
    return expiracion;
  });
}

/** RN-04: cancelacion manual; el stock retenido queda libre. */
export async function cancelarReservaCarrito(usuarioId: string): Promise<void> {
  await prisma.carrito.updateMany({
    where: { clienteId: usuarioId },
    data: { reservaExpiracion: null },
  });
}

/**
 * Vista del carrito para las paginas. La disponibilidad de cada linea
 * se recalcula en cada lectura: una reserva vencida (RN-04) deja de
 * retener stock automaticamente porque ya no entra en el filtro.
 */
export async function obtenerEstadoCarrito(
  usuarioId: string,
): Promise<EstadoCarrito> {
  const carrito = await prisma.carrito.findUnique({
    where: { clienteId: usuarioId },
    select: {
      id: true,
      reservaExpiracion: true,
      items: {
        orderBy: { creadoEn: "asc" },
        select: {
          id: true,
          cantidad: true,
          precioUnitario: true,
          varianteProductoId: true,
          varianteProducto: {
            select: {
              stockActual: true,
              talle: true,
              color: true,
              material: true,
              producto: {
                select: { nombre: true, sku: true, imagen: true, estado: true },
              },
            },
          },
        },
      },
    },
  });

  if (!carrito) {
    return {
      carritoId: "",
      items: [],
      subtotal: 0,
      totalItems: 0,
      reservaExpiracion: null,
      reservaActiva: false,
    };
  }

  const reservasAjenas = new Map<string, number>();
  const variantesIds = carrito.items.map((i) => i.varianteProductoId);
  if (variantesIds.length > 0) {
    const grupos = await prisma.itemCarrito.groupBy({
      by: ["varianteProductoId"],
      _sum: { cantidad: true },
      where: {
        varianteProductoId: { in: variantesIds },
        carrito: { reservaExpiracion: { gt: new Date() }, id: { not: carrito.id } },
      },
    });
    for (const grupo of grupos) {
      reservasAjenas.set(grupo.varianteProductoId, grupo._sum.cantidad ?? 0);
    }
  }

  const items: ItemCarritoVista[] = carrito.items.map((item) => {
    const precio = Number(item.precioUnitario);
    const stock = item.varianteProducto.stockActual;
    const reservado = reservasAjenas.get(item.varianteProductoId) ?? 0;
    const disponible = Math.max(stock - reservado, 0);
    const titulo = [
      item.varianteProducto.talle,
      item.varianteProducto.color,
      item.varianteProducto.material,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: item.id,
      varianteProductoId: item.varianteProductoId,
      cantidad: item.cantidad,
      precioUnitario: precio,
      subtotal: precio * item.cantidad,
      nombreProducto: item.varianteProducto.producto.nombre,
      sku: item.varianteProducto.producto.sku,
      imagen: item.varianteProducto.producto.imagen,
      productoActivo: item.varianteProducto.producto.estado === "ACTIVO",
      tituloVariante: titulo || "Variante única",
      stockDisponible: disponible,
      faltante: Math.max(item.cantidad - disponible, 0),
    };
  });

  const reservaActiva = Boolean(
    carrito.reservaExpiracion && carrito.reservaExpiracion > new Date(),
  );

  return {
    carritoId: carrito.id,
    items,
    subtotal: items.reduce((total, item) => total + item.subtotal, 0),
    totalItems: items.reduce((total, item) => total + item.cantidad, 0),
    reservaExpiracion: carrito.reservaExpiracion,
    reservaActiva,
  };
}
