import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { resolverUsuarioActivoId } from "@/modules/clients/services/perfil";

import {
  DURACION_RESERVA_SEG,
  agregarAlCarritoSchema,
  actualizarCantidadSchema,
  quitarItemSchema,
} from "../schemas";
import {
  disponibilidadKit,
  disponibilidadPorVariante,
  reservasVigentesPorVariante,
  consumoCarritoPorVariante,
} from "./disponibilidad";

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
  /** RN-06: una linea es de variante o de kit. */
  varianteProductoId: string | null;
  kitProductoId: string | null;
  esKit: boolean;
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
 * items. La lectura de reservas (incluidos los componentes de kits)
 * se concentra en services/disponibilidad.ts.
 */

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

/** RF-21 / RF-38: agrega una variante o un kit con tope de stock real. */
export async function agregarItemCarrito(
  usuarioId: string,
  entrada: unknown,
): Promise<void> {
  const { varianteId, kitProductoId, cantidad } = agregarAlCarritoSchema.parse(entrada);

  await prisma.$transaction(async (tx) => {
    const carrito = await tx.carrito.upsert({
      where: { clienteId: usuarioId },
      update: {},
      create: { clienteId: usuarioId },
    });
    await asegurarCarritoLibre(tx, carrito.id);

    if (varianteId) {
      const variante = await tx.varianteProducto.findUnique({
        where: { id: varianteId },
        select: {
          id: true,
          producto: { select: { estado: true, precioVenta: true } },
        },
      });
      if (!variante) {
        throw new ErrorNegocioCarrito("VARIANTE_INEXISTENTE", "La variante seleccionada no existe.");
      }
      if (variante.producto.estado !== "ACTIVO") {
        throw new ErrorNegocioCarrito("PRODUCTO_INACTIVO", "El producto no está disponible.");
      }

      const disponibles = await disponibilidadPorVariante(tx, [varianteId], carrito.id);
      const disponible = disponibles.get(varianteId) ?? 0;
      if (disponible <= 0) {
        throw new ErrorNegocioCarrito(
          "SIN_STOCK",
          "No quedan unidades disponibles de esa variante (reservadas por otro cliente u agotadas).",
        );
      }
      if (cantidad > disponible) {
        throw new ErrorNegocioCarrito(
          "STOCK_INSUFICIENTE",
          `Solo podés agregar ${disponible} unidad(es) más de esta variante. Ajustá la cantidad para continuar.`,
        );
      }

      const item = await tx.itemCarrito.findUnique({
        where: {
          carritoId_varianteProductoId: {
            carritoId: carrito.id,
            varianteProductoId: varianteId,
          },
        },
        select: { id: true, cantidad: true },
      });

      if (item) {
        // Decision 8: se conserva el precio congelado de la linea.
        await tx.itemCarrito.update({
          where: { id: item.id },
          data: { cantidad: item.cantidad + cantidad },
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
      return;
    }

    if (!kitProductoId) {
      throw new ErrorNegocioCarrito("REFERENCIA_INVALIDA", "Falta la variante o el kit a agregar.");
    }

    const kit = await tx.kit.findUnique({
      where: { productoId: kitProductoId },
      select: {
        productoId: true,
        producto: { select: { estado: true, precioVenta: true, nombre: true } },
        componentes: {
          select: { varianteId: true, cantidad: true, variante: { select: { stockActual: true } } },
        },
      },
    });
    if (!kit) {
      throw new ErrorNegocioCarrito("KIT_INEXISTENTE", "El kit seleccionado no existe.");
    }
    if (kit.producto.estado !== "ACTIVO") {
      throw new ErrorNegocioCarrito("PRODUCTO_INACTIVO", "El kit no está disponible.");
    }
    if (kit.componentes.length < 2) {
      throw new ErrorNegocioCarrito(
        "KIT_INCOMPLETO",
        "El kit todavía no tiene dos componentes configurados.",
      );
    }

    const disponibles = await disponibilidadPorVariante(
      tx,
      kit.componentes.map((componente) => componente.varianteId),
      carrito.id,
    );
    const disponible = disponibilidadKit(kit.componentes, disponibles);
    if (disponible <= 0) {
      throw new ErrorNegocioCarrito(
        "SIN_STOCK",
        `No quedan unidades disponibles de "${kit.producto.nombre}": alguno de sus componentes está agotado o reservado.`,
      );
    }
    if (cantidad > disponible) {
      throw new ErrorNegocioCarrito(
        "STOCK_INSUFICIENTE",
        `Solo podés agregar ${disponible} unidad(es) más de "${kit.producto.nombre}" (RN-06: manda el componente con menor stock).`,
      );
    }

    const item = await tx.itemCarrito.findUnique({
      where: {
        carritoId_kitProductoId: {
          carritoId: carrito.id,
          kitProductoId,
        },
      },
      select: { id: true, cantidad: true },
    });

    if (item) {
      await tx.itemCarrito.update({
        where: { id: item.id },
        data: { cantidad: item.cantidad + cantidad },
      });
    } else {
      await tx.itemCarrito.create({
        data: {
          carritoId: carrito.id,
          kitProductoId,
          cantidad,
          precioUnitario: kit.producto.precioVenta,
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
      select: {
        id: true,
        carritoId: true,
        varianteProductoId: true,
        kitProductoId: true,
        kit: {
          select: {
            producto: { select: { nombre: true } },
            componentes: { select: { varianteId: true, cantidad: true } },
          },
        },
      },
    });
    if (!item) {
      throw new ErrorNegocioCarrito("ITEM_INEXISTENTE", "Ese item no pertenece a tu carrito.");
    }

    if (cantidad === 0) {
      await tx.itemCarrito.delete({ where: { id: item.id } });
      return;
    }

    await asegurarCarritoLibre(tx, item.carritoId);

    const esKit = Boolean(item.kit);
    const variantes = esKit
      ? (item.kit?.componentes ?? []).map((componente) => componente.varianteId)
      : item.varianteProductoId
        ? [item.varianteProductoId]
        : [];
    const disponibles = await disponibilidadPorVariante(
      tx,
      variantes,
      item.carritoId,
      item.id,
    );
    const disponible = esKit
      ? disponibilidadKit(item.kit?.componentes ?? [], disponibles)
      : disponibles.get(item.varianteProductoId ?? "") ?? 0;
    if (cantidad > disponible) {
      throw new ErrorNegocioCarrito(
        "STOCK_INSUFICIENTE",
        esKit
          ? `"${item.kit?.producto.nombre ?? "El kit"}" admite hasta ${Math.max(disponible, 0)} unidad(es) con el stock de sus componentes (RN-06).`
          : `Solo quedan ${Math.max(disponible, 0)} unidad(es) de esta variante. Probá con una cantidad menor.`,
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
        items: {
          select: {
            id: true,
            cantidad: true,
            varianteProductoId: true,
            varianteProducto: {
              select: {
                producto: { select: { nombre: true, estado: true } },
              },
            },
            kit: {
              select: {
                producto: { select: { nombre: true, estado: true } },
                componentes: { select: { varianteId: true, cantidad: true } },
              },
            },
          },
        },
      },
    });
    if (!carrito) {
      throw new ErrorNegocioCarrito("CARRITO_VACIO", "Tu carrito está vacío.");
    }
    if (carrito.items.length === 0) {
      throw new ErrorNegocioCarrito("CARRITO_VACIO", "Tu carrito está vacío.");
    }

    // Verificar que todos los productos del carrito sigan activos
    const inactivo = carrito.items.find((item) => {
      const estado =
        item.kit?.producto.estado ?? item.varianteProducto?.producto.estado;
      return estado !== "ACTIVO";
    });
    if (inactivo) {
      const nombre =
        inactivo.kit?.producto.nombre ??
        inactivo.varianteProducto?.producto.nombre ??
        "un producto";
      throw new ErrorNegocioCarrito(
        "PRODUCTO_INACTIVO",
        `El producto "${nombre}" ya no está disponible. Quitalo del carrito para continuar.`,
      );
    }

    // Reserva ya vigente: es idempotente, no reinicia el temporizador.
    if (carrito.reservaExpiracion && carrito.reservaExpiracion > new Date()) {
      return carrito.reservaExpiracion;
    }

    // RN-05 / RN-06: se valida el consumo agregado del carrito. Un kit
    // puede compartir componentes con otra linea, asi que comparar
    // linea por linea no alcanza.
    const consumo = new Map<string, number>();
    for (const item of carrito.items) {
      if (item.varianteProductoId) {
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

    const variantesIds = [...consumo.keys()];
    const [variantes, reservas] = await Promise.all([
      tx.varianteProducto.findMany({
        where: { id: { in: variantesIds } },
        select: { id: true, stockActual: true, producto: { select: { nombre: true } } },
      }),
      reservasVigentesPorVariante(tx, variantesIds, carrito.id),
    ]);
    const stockPorVariante = new Map(variantes.map((v) => [v.id, v.stockActual]));
    const nombrePorVariante = new Map(variantes.map((v) => [v.id, v.producto.nombre]));

    for (const [varianteId, unidades] of consumo) {
      const disponible =
        (stockPorVariante.get(varianteId) ?? 0) - (reservas.get(varianteId) ?? 0);
      if (unidades > disponible) {
        throw new ErrorNegocioCarrito(
          "STOCK_INSUFICIENTE",
          `No hay stock suficiente del componente "${nombrePorVariante.get(varianteId) ?? "una variante"}": quedan ${Math.max(disponible, 0)} unidad(es) y tu carrito necesita ${unidades}. Ajustá las cantidades para continuar.`,
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
          kitProductoId: true,
          kit: {
            select: {
              producto: {
                select: { nombre: true, sku: true, imagen: true, estado: true },
              },
              componentes: {
                select: {
                  cantidad: true,
                  varianteId: true,
                  variante: {
                    select: {
                      talle: true,
                      color: true,
                      material: true,
                      producto: { select: { nombre: true } },
                    },
                  },
                },
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

  const variantesIds = [
    ...new Set(
      carrito.items.flatMap((item) => [
        ...(item.varianteProductoId ? [item.varianteProductoId] : []),
        ...(item.kit?.componentes.map((componente) => componente.varianteId) ?? []),
      ]),
    ),
  ];

  const [variantes, reservasAjenas, consumoPropio] = await Promise.all([
    prisma.varianteProducto.findMany({
      where: { id: { in: variantesIds } },
      select: { id: true, stockActual: true },
    }),
    reservasVigentesPorVariante(prisma, variantesIds, carrito.id),
    consumoCarritoPorVariante(prisma, carrito.id, variantesIds),
  ]);
  const stockPorVariante = new Map(variantes.map((v) => [v.id, v.stockActual]));

  const items: ItemCarritoVista[] = carrito.items.map((item) => {
    const precio = Number(item.precioUnitario);
    const esKit = Boolean(item.kit);

    // Unidades que esta misma linea consume de cada variante. Se
    // descuentan del consumo propio para mostrar el maximo que la
    // linea puede llegar a tener sin cambiar las demas lineas.
    const consumoLinea = new Map<string, number>();
    if (item.varianteProductoId) {
      consumoLinea.set(item.varianteProductoId, item.cantidad);
    }
    for (const componente of item.kit?.componentes ?? []) {
      consumoLinea.set(
        componente.varianteId,
        item.cantidad * componente.cantidad,
      );
    }

    const disponiblePorVariante = new Map<string, number>();
    for (const [varianteId, consumo] of consumoLinea) {
      const disponible =
        (stockPorVariante.get(varianteId) ?? 0) -
        (reservasAjenas.get(varianteId) ?? 0) -
        ((consumoPropio.get(varianteId) ?? 0) - consumo);
      disponiblePorVariante.set(varianteId, Math.max(disponible, 0));
    }

    const stockDisponible = esKit
      ? disponibilidadKit(
          (item.kit?.componentes ?? []).map((componente) => ({
            varianteId: componente.varianteId,
            cantidad: componente.cantidad,
          })),
          disponiblePorVariante,
        )
      : disponiblePorVariante.get(item.varianteProductoId ?? "") ?? 0;

    const producto = item.kit?.producto ?? item.varianteProducto?.producto;
    const titulo = item.varianteProducto
      ? [
          item.varianteProducto.talle,
          item.varianteProducto.color,
          item.varianteProducto.material,
        ]
          .filter(Boolean)
          .join(" · ")
      : (item.kit?.componentes ?? [])
          .map(
            (componente) =>
              `${componente.cantidad} x ${
                [
                  componente.variante.producto.nombre,
                  componente.variante.talle,
                  componente.variante.color,
                ]
                  .filter(Boolean)
                  .join(" ")
              }`,
          )
          .join(" + ");

    return {
      id: item.id,
      varianteProductoId: item.varianteProductoId,
      kitProductoId: item.kitProductoId,
      esKit,
      cantidad: item.cantidad,
      precioUnitario: precio,
      subtotal: precio * item.cantidad,
      nombreProducto: producto?.nombre ?? "Producto",
      sku: producto?.sku ?? "",
      imagen: producto?.imagen ?? null,
      productoActivo: producto?.estado === "ACTIVO",
      tituloVariante: esKit
        ? `Kit: ${titulo || "sin componentes"}`
        : titulo || "Variante única",
      stockDisponible,
      faltante: Math.max(item.cantidad - stockDisponible, 0),
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
