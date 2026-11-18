import { EstadoPedido, TipoMovimiento } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { calcularCostoEnvio } from "@/modules/envios/tarifas";

/**
 * Servicio de gestion de pedidos, estados de envio e historial (Sprint 4 - Abril Poggio).
 *
 * Cubre:
 * - RF-30: gestion de pedidos mediante estados Confirmado, Preparando, En camino y Recibido.
 * - RF-31 / RF-46 / CU12: interfaz administrativa para consultar pedidos y actualizar
 *   manualmente el estado del envio.
 * - RF-37: restauracion automatica del stock ante cancelacion de un pedido confirmado.
 * - RF-32 / CU11: consulta de estado de pedidos e historial de compras del cliente.
 * - RF-33 / CU10: repetir una compra anterior sujeto a disponibilidad actual.
 */

export class ErrorNegocioPedido extends Error {
  constructor(
    public codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorNegocioPedido";
  }
}

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

export interface FiltrosPedidosAdmin {
  estado?: EstadoPedido | "TODOS";
  busqueda?: string;
}

export async function listarPedidosAdmin(filtros: FiltrosPedidosAdmin = {}) {
  const estadoFiltro =
    filtros.estado && filtros.estado !== "TODOS" ? filtros.estado : undefined;
  const termino = filtros.busqueda?.trim();

  const [pedidos, conteosAgrupados] = await Promise.all([
    prisma.pedido.findMany({
      where: {
        ...(estadoFiltro ? { estado: estadoFiltro } : {}),
        ...(termino
          ? {
              OR: [
                { numeroOrden: { contains: termino, mode: "insensitive" } },
                {
                  cliente: {
                    OR: [
                      { nombre: { contains: termino, mode: "insensitive" } },
                      { apellido: { contains: termino, mode: "insensitive" } },
                      {
                        usuario: {
                          correo: { contains: termino, mode: "insensitive" },
                        },
                      },
                    ],
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { fechaCreacion: "desc" },
      include: {
        cliente: {
          include: {
            usuario: { select: { correo: true, usuario: true } },
          },
        },
        cupon: { select: { codigo: true, porcentajeDescuento: true } },
        promociones: {
          include: { promocion: { select: { nombre: true } } },
        },
        items: {
          include: {
            varianteProducto: {
              select: {
                talle: true,
                color: true,
                material: true,
                producto: { select: { imagen: true, sku: true } },
              },
            },
          },
        },
      },
    }),
    prisma.pedido.groupBy({
      by: ["estado"],
      _count: { _all: true },
    }),
  ]);

  const conteos: Record<string, number> = { TODOS: 0 };
  for (const fila of conteosAgrupados) {
    conteos[fila.estado] = fila._count._all;
    conteos.TODOS += fila._count._all;
  }

  return { pedidos, conteos };
}

/**
 * RF-31 / RF-46 / RF-37 / CU12: actualiza manualmente el estado de un pedido.
 * Si pasa a CANCELADO desde un estado con stock descontado (CONFIRMADO,
 * PREPARANDO o EN_CAMINO), restaura las unidades a cada variante y registra
 * el MovimientoStock de tipo INGRESO con justificacion y responsable.
 */
export async function actualizarEstadoPedidoAdmin(input: {
  pedidoId: string;
  nuevoEstado: EstadoPedido;
  adminUsuarioId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { id: input.pedidoId },
      include: {
        items: {
          select: {
            varianteProductoId: true,
            cantidad: true,
          },
        },
      },
    });

    if (!pedido) {
      throw new ErrorNegocioPedido("PEDIDO_INEXISTENTE", "El pedido indicado no existe.");
    }

    if (pedido.estado === input.nuevoEstado) {
      return pedido;
    }

    const permitidos = TRANSICIONES_PERMITIDAS[pedido.estado] ?? [];
    if (!permitidos.includes(input.nuevoEstado)) {
      throw new ErrorNegocioPedido(
        "TRANSICION_INVALIDA",
        `No se puede pasar un pedido de "${ETIQUETA_ESTADO_PEDIDO[pedido.estado].nombre}" a "${ETIQUETA_ESTADO_PEDIDO[input.nuevoEstado].nombre}".`,
      );
    }

    const estadosConStockDescontado: readonly EstadoPedido[] = [
      EstadoPedido.CONFIRMADO,
      EstadoPedido.PREPARANDO,
      EstadoPedido.EN_CAMINO,
    ];

    // Si el pedido estaba PENDIENTE y el admin lo confirma manualmente, descontar stock
    if (
      pedido.estado === EstadoPedido.PENDIENTE &&
      input.nuevoEstado === EstadoPedido.CONFIRMADO
    ) {
      for (const item of pedido.items) {
        const res = await tx.varianteProducto.updateMany({
          where: { id: item.varianteProductoId, stockActual: { gte: item.cantidad } },
          data: { stockActual: { decrement: item.cantidad } },
        });
        if (res.count === 0) {
          throw new ErrorNegocioPedido(
            "SIN_STOCK",
            "No hay stock suficiente para confirmar este pedido pendiente.",
          );
        }
        const varianteActualizada = await tx.varianteProducto.findUniqueOrThrow({
          where: { id: item.varianteProductoId },
          select: { stockActual: true },
        });
        await tx.movimientoStock.create({
          data: {
            tipo: TipoMovimiento.VENTA,
            cantidad: item.cantidad,
            justificacion: `Confirmación administrativa del pedido ${pedido.numeroOrden}`,
            stockResultante: varianteActualizada.stockActual,
            varianteProductoId: item.varianteProductoId,
            responsableId: input.adminUsuarioId,
            pedidoId: pedido.id,
          },
        });
      }
    }

    // RF-37: si se cancela un pedido que ya habia descontado stock, restaurar unidades
    if (
      input.nuevoEstado === EstadoPedido.CANCELADO &&
      estadosConStockDescontado.includes(pedido.estado)
    ) {
      for (const item of pedido.items) {
        const varianteActualizada = await tx.varianteProducto.update({
          where: { id: item.varianteProductoId },
          data: { stockActual: { increment: item.cantidad } },
          select: { stockActual: true },
        });

        await tx.movimientoStock.create({
          data: {
            tipo: TipoMovimiento.INGRESO,
            cantidad: item.cantidad,
            justificacion: `Restauración de stock por cancelación del pedido ${pedido.numeroOrden} (RF-37)`,
            stockResultante: varianteActualizada.stockActual,
            varianteProductoId: item.varianteProductoId,
            responsableId: input.adminUsuarioId,
            pedidoId: pedido.id,
          },
        });
      }
    }

    const actualizado = await tx.pedido.update({
      where: { id: pedido.id },
      data: { estado: input.nuevoEstado },
    });

    return actualizado;
  });
}

/**
 * RF-32 / CU11: lista todos los pedidos historicos de un cliente autenticado.
 */
export async function listarPedidosCliente(clienteId: string) {
  return prisma.pedido.findMany({
    where: { clienteId },
    orderBy: { fechaCreacion: "desc" },
    include: {
      cupon: { select: { codigo: true, porcentajeDescuento: true } },
      promociones: {
        include: { promocion: { select: { nombre: true } } },
      },
      items: {
        include: {
          varianteProducto: {
            select: {
              id: true,
              talle: true,
              color: true,
              material: true,
              stockActual: true,
              producto: {
                select: {
                  nombre: true,
                  imagen: true,
                  estado: true,
                  precioVenta: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

/**
 * RF-33 / CU10: repite una compra anterior volcando al carrito actual los items
 * que tengan stock disponible hoy. Si alguna variante tiene menos stock o esta
 * agotada, agrega lo disponible e informa el detalle al comprador.
 */
export async function repetirPedidoAnterior(clienteId: string, pedidoId: string) {
  const pedido = await prisma.pedido.findFirst({
    where: { id: pedidoId, clienteId },
    include: {
      items: {
        include: {
          varianteProducto: {
            include: {
              producto: {
                select: {
                  nombre: true,
                  precioVenta: true,
                  estado: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!pedido) {
    throw new ErrorNegocioPedido("PEDIDO_INEXISTENTE", "No encontramos ese pedido en tu historial.");
  }

  let agregados = 0;
  const sinStock: string[] = [];

  await prisma.$transaction(async (tx) => {
    const carrito = await tx.carrito.upsert({
      where: { clienteId },
      update: {},
      create: { clienteId },
    });

    for (const item of pedido.items) {
      const variante = item.varianteProducto;
      if (variante.producto.estado !== "ACTIVO" || variante.stockActual <= 0) {
        sinStock.push(`${item.nombreProductoSnapshot} (${variante.talle} · ${variante.color})`);
        continue;
      }

      const existente = await tx.itemCarrito.findUnique({
        where: {
          carritoId_varianteProductoId: {
            carritoId: carrito.id,
            varianteProductoId: variante.id,
          },
        },
      });

      const cantidadActual = existente?.cantidad ?? 0;
      const nuevaCantidad = Math.min(cantidadActual + item.cantidad, variante.stockActual);

      if (nuevaCantidad <= cantidadActual) {
        sinStock.push(`${item.nombreProductoSnapshot} (${variante.talle} · ${variante.color})`);
        continue;
      }

      await tx.itemCarrito.upsert({
        where: {
          carritoId_varianteProductoId: {
            carritoId: carrito.id,
            varianteProductoId: variante.id,
          },
        },
        update: {
          cantidad: nuevaCantidad,
          precioUnitario: variante.producto.precioVenta,
        },
        create: {
          carritoId: carrito.id,
          varianteProductoId: variante.id,
          cantidad: nuevaCantidad,
          precioUnitario: variante.producto.precioVenta,
        },
      });

      agregados += 1;
    }
  });

  if (agregados === 0) {
    throw new ErrorNegocioPedido(
      "SIN_DISPONIBILIDAD",
      "Ninguno de los artículos de ese pedido tiene stock disponible en este momento.",
    );
  }

  return { agregados, sinStock, numeroOrden: pedido.numeroOrden };
}

/**
 * Crea un pedido de ejemplo en la base si aun no hay pedidos registrados,
 * para poder probar de inmediato el panel administrativo y el seguimiento.
 */
export async function asegurarPedidosDemostracion() {
  const totalPedidos = await prisma.pedido.count();
  if (totalPedidos > 0) return;

  const cliente = await prisma.cliente.findFirst({
    where: { usuario: { correo: "cliente@sneaker.test" } },
    include: { direcciones: { where: { predeterminada: true }, take: 1 } },
  });
  const variantes = await prisma.varianteProducto.findMany({
    where: { stockActual: { gt: 2 } },
    take: 3,
    include: { producto: true },
  });

  if (!cliente || cliente.direcciones.length === 0 || variantes.length < 2) {
    return;
  }

  const dir = cliente.direcciones[0];
  const costoEnvio = calcularCostoEnvio(dir.ciudad, dir.provincia);

  const v1 = variantes[0];
  const v2 = variantes[1];

  const sub1 = Number(v1.producto.precioVenta);
  const sub2 = Number(v2.producto.precioVenta);

  await prisma.pedido.create({
    data: {
      numeroOrden: "SNK-20261117-1001",
      estado: EstadoPedido.CONFIRMADO,
      costoEnvio,
      montoSubtotal: sub1,
      descuentoTotal: 0,
      montoTotal: sub1 + costoEnvio,
      metodoPago: "simulado",
      pagoExternoId: "SIM-DEMO-1001",
      clienteId: cliente.usuarioId,
      direccionId: dir.id,
      datosEnvio: {
        destinatario: dir.destinatario,
        calle: dir.calle,
        numero: dir.numero,
        ciudad: dir.ciudad,
        provincia: dir.provincia,
        codigoPostal: dir.codigoPostal,
      },
      items: {
        create: [
          {
            cantidad: 1,
            precioUnitario: v1.producto.precioVenta,
            subtotal: sub1,
            nombreProductoSnapshot: v1.producto.nombre,
            skuSnapshot: v1.producto.sku,
            varianteProductoId: v1.id,
          },
        ],
      },
    },
  });

  await prisma.pedido.create({
    data: {
      numeroOrden: "SNK-20261117-1002",
      estado: EstadoPedido.EN_CAMINO,
      costoEnvio,
      montoSubtotal: sub2,
      descuentoTotal: 0,
      montoTotal: sub2 + costoEnvio,
      metodoPago: "mercadopago",
      pagoExternoId: "MP-88912031",
      clienteId: cliente.usuarioId,
      direccionId: dir.id,
      datosEnvio: {
        destinatario: dir.destinatario,
        calle: dir.calle,
        numero: dir.numero,
        ciudad: dir.ciudad,
        provincia: dir.provincia,
        codigoPostal: dir.codigoPostal,
      },
      items: {
        create: [
          {
            cantidad: 1,
            precioUnitario: v2.producto.precioVenta,
            subtotal: sub2,
            nombreProductoSnapshot: v2.producto.nombre,
            skuSnapshot: v2.producto.sku,
            varianteProductoId: v2.id,
          },
        ],
      },
    },
  });
}
