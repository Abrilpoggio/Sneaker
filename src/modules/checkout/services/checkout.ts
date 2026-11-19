import { cookies } from "next/headers";

import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { calcularCostoEnvio } from "@/modules/envios/tarifas";
import { obtenerEstadoCarrito, type EstadoCarrito } from "@/modules/carrito/services/carrito";
import { aplicarCuponSchema } from "../schemas";

/**
 * Motor de checkout (Sprint 3 - Camila Viegas).
 *
 * RF-22: cupon aplicado durante la compra y combinado con promociones
 *   vigentes (RN-08).
 * RN-08: una promocion + un cupon por compra. El alcance exacto de
 *   "un unico cupon por usuario" sigue pendiente de precision del
 *   cliente; el motor limita a un cupon por pedido y lo conserva en
 *   una cookie del checkout.
 * RF-23 / RF-26 / RN-05: la confirmacion del pedido descuenta stock
 *   dentro de una transaccion con guardas atomicas: si otra compra se
 *   llevo unidades, el pedido se rechaza y nada queda a medias.
 * RF-37 / RN-07: cada venta escribe su MovimientoStock con responsable
 *   y pedido de origen.
 *
 * Notas de alcance: costoEnvio queda en 0 hasta la calculadora de
 * envios (RF-45, Tadeo) y la direccion se toma de la predeterminada;
 * la seleccion durante la compra (RF-18) es tarea separada.
 */

const COOKIE_CUPON = "sneaker_cupon";

export class ErrorNegocioCheckout extends Error {
  constructor(
    public codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorNegocioCheckout";
  }
}

export interface PromocionAplicada {
  id: string;
  nombre: string;
  porcentaje: number;
  montoDescontado: number;
}

export interface LineaCheckout {
  itemId: string;
  nombreProducto: string;
  sku: string;
  imagen: string | null;
  tituloVariante: string;
  cantidad: number;
  precioUnitario: number;
  /** RN-08: la mejor promocion vigente que cubre el producto. */
  promocion: PromocionAplicada | null;
  subtotalLinea: number;
}

export interface CuponAplicado {
  id: string;
  codigo: string;
  porcentaje: number;
  montoDescontado: number;
}

export interface ResumenCheckout {
  items: LineaCheckout[];
  subtotal: number;
  descuentoPromociones: number;
  descuentoCupon: number;
  cupon: CuponAplicado | null;
  total: number;
  /** RF-45: tarifa del destino de la direccion predeterminada. */
  costoEnvio: number | null;
  destinoEnvio: { ciudad: string; provincia: string } | null;
  /** Total a cobrar: productos con descuentos + envio. */
  totalConEnvio: number;
  reservaExpiracion: Date | null;
  reservaActiva: boolean;
}

/** Promociones activas dentro de su ventana de fechas (RF-41). */
async function promocionesVigentes(now: Date) {
  return prisma.promocion.findMany({
    where: { activa: true, fechaInicio: { lte: now }, fechaFin: { gte: now } },
    include: { productos: { select: { productoId: true } } },
  });
}

/**
 * Resuelve la mejor promocion para un producto: candidatas = globales
 * + las que lo listan explicitamente. Devuelve null si no hay.
 */
function resolverPromocionProducto(
  vigentes: Awaited<ReturnType<typeof promocionesVigentes>>,
  productoId: string,
): { id: string; nombre: string; porcentaje: number } | null {
  let mejor: { id: string; nombre: string; porcentaje: number } | null = null;
  for (const promocion of vigentes) {
    const esGlobal = promocion.productos.length === 0;
    const cubre = esGlobal || promocion.productos.some((p) => p.productoId === productoId);
    if (!cubre) continue;
    const porcentaje = Number(promocion.porcentajeDescuento);
    if (!mejor || porcentaje > mejor.porcentaje) {
      mejor = { id: promocion.id, nombre: promocion.nombre, porcentaje };
    }
  }
  return mejor;
}

/**
 * Lee el cupon guardado en la cookie del checkout, si sigue vigente.
 * Fuera del alcance de request (scripts de prueba, trabajos batch)
 * `cookies()` no existe: se devuelve null y la compra simplemente no
 * lleva cupon.
 */
export async function leerCuponGuardado(): Promise<string | null> {
  try {
    const almacen = await cookies();
    return almacen.get(COOKIE_CUPON)?.value ?? null;
  } catch {
    return null;
  }
}

export async function guardarCupon(codigo: string): Promise<void> {
  const almacen = await cookies();
  almacen.set(COOKIE_CUPON, codigo, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 6,
  });
}

export async function olvidarCupon(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(COOKIE_CUPON);
}

/**
 * RF-22 / RN-08: valida el cupon contra la base: existe, activo, dentro de
 * su ventana de vigencia y (si se informa usuarioId) que el cliente no lo
 * haya utilizado ya en un pedido previo no cancelado/rechazado.
 */
export async function validarCupon(codigoEntrada: unknown, usuarioId?: string) {
  const entradaNormalizada =
    typeof codigoEntrada === "string"
      ? { codigo: codigoEntrada }
      : codigoEntrada;
  const { codigo } = aplicarCuponSchema.parse(entradaNormalizada);
  const cupon = await prisma.cupon.findUnique({ where: { codigo } });
  if (!cupon || !cupon.activo) {
    throw new ErrorNegocioCheckout("CUPON_INEXISTENTE", "El cupón no existe o fue desactivado.");
  }
  const ahora = new Date();
  if (cupon.fechaVigencia > ahora) {
    throw new ErrorNegocioCheckout("CUPON_VENCIDO", `El cupón habilita desde el ${cupon.fechaVigencia.toLocaleDateString("es-AR")}.`);
  }
  if (cupon.fechaVigenciaFin && cupon.fechaVigenciaFin < ahora) {
    throw new ErrorNegocioCheckout("CUPON_VENCIDO", "El cupón ya expiró.");
  }
  if (usuarioId) {
    const yaUsado = await prisma.pedido.findFirst({
      where: {
        clienteId: usuarioId,
        cuponId: cupon.id,
        estado: { notIn: ["CANCELADO", "RECHAZADO"] },
      },
      select: { id: true },
    });
    if (yaUsado) {
      throw new ErrorNegocioCheckout(
        "CUPON_YA_UTILIZADO",
        "Ya utilizaste este cupón en una compra anterior.",
      );
    }
  }
  return cupon;
}

/** RF-45: destino para calcular la tarifa de envio. */
export interface DestinoEnvio {
  ciudad: string;
  provincia: string;
}

/**
 * Vista completa del checkout con promociones, cupon y envio
 * calculados. No persiste nada: los montos se recalculan en cada
 * lectura y se congelan recien al confirmar el pedido.
 *
 * `cuponCodigo` llega de la cookie del checkout (o de un script de
 * prueba); null = compra sin cupon. `destino` es la direccion de
 * entrega elegida; null = el cliente todavia no tiene direcciones y
 * el envio no puede calcularse (el pedido igualmente se rechazaria
 * con SIN_DIRECCION).
 */
export async function resumenCheckout(
  carrito: EstadoCarrito,
  cuponCodigo: string | null,
  destino?: DestinoEnvio | null,
): Promise<ResumenCheckout> {
  const ahora = new Date();
  const vigentes = await promocionesVigentes(ahora);

  // Necesito el productoId de cada linea: el estado de carrito trae
  // datos para pintar; el motor de promos consulta por producto. En
  // los kits el propio kitProductoId ya es el id del producto.
  const variantesIds = carrito.items
    .map((item) => item.varianteProductoId)
    .filter((id): id is string => Boolean(id));
  const variantes = await prisma.varianteProducto.findMany({
    where: { id: { in: variantesIds } },
    select: { id: true, productoId: true },
  });
  const productoPorVariante = new Map(variantes.map((v) => [v.id, v.productoId]));

  const lineas: LineaCheckout[] = [];
  const descuentosPorPromocion = new Map<string, PromocionAplicada>();

  for (const item of carrito.items) {
    const productoId = item.kitProductoId
      ? item.kitProductoId
      : item.varianteProductoId
        ? productoPorVariante.get(item.varianteProductoId)
        : undefined;
    const promoData = productoId ? resolverPromocionProducto(vigentes, productoId) : null;
    let promocion: PromocionAplicada | null = null;
    if (promoData) {
      const montoDescontado = Math.round(
        (item.precioUnitario * item.cantidad * promoData.porcentaje) / 100,
      );
      promocion = { ...promoData, montoDescontado };
      const acumulado = descuentosPorPromocion.get(promoData.id);
      if (acumulado) {
        acumulado.montoDescontado += montoDescontado;
      } else {
        descuentosPorPromocion.set(promoData.id, { ...promocion });
      }
    }
    lineas.push({
      itemId: item.id,
      nombreProducto: item.nombreProducto,
      sku: item.sku,
      imagen: item.imagen,
      tituloVariante: item.tituloVariante,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      promocion,
      subtotalLinea: item.precioUnitario * item.cantidad - (promocion?.montoDescontado ?? 0),
    });
  }

  const subtotal = lineas.reduce((total, linea) => total + linea.precioUnitario * linea.cantidad, 0);
  const descuentoPromociones = [...descuentosPorPromocion.values()].reduce(
    (total, promo) => total + promo.montoDescontado,
    0,
  );

  let cupon: CuponAplicado | null = null;
  const codigoCupon = cuponCodigo;
  if (codigoCupon) {
    const registro = await prisma.cupon.findUnique({ where: { codigo: codigoCupon } });
    if (registro && registro.activo && registro.fechaVigencia <= ahora && (!registro.fechaVigenciaFin || registro.fechaVigenciaFin >= ahora)) {
      const base = subtotal - descuentoPromociones;
      const montoDescontado = Math.round((base * Number(registro.porcentajeDescuento)) / 100);
      cupon = {
        id: registro.id,
        codigo: registro.codigo,
        porcentaje: Number(registro.porcentajeDescuento),
        montoDescontado,
      };
    }
  }

  const costoEnvio = destino ? calcularCostoEnvio(destino.ciudad, destino.provincia) : null;

  return {
    items: lineas,
    subtotal,
    descuentoPromociones,
    descuentoCupon: cupon?.montoDescontado ?? 0,
    cupon,
    total: subtotal - descuentoPromociones - (cupon?.montoDescontado ?? 0),
    costoEnvio,
    destinoEnvio: destino ?? null,
    totalConEnvio: subtotal - descuentoPromociones - (cupon?.montoDescontado ?? 0) + (costoEnvio ?? 0),
    reservaExpiracion: carrito.reservaExpiracion,
    reservaActiva: carrito.reservaActiva,
  };
}

/**
 * SNK-YYYYMMDD-XXXX: se verifica la unicidad contra la base para no
 * chocar con un pedido del mismo dia (colision improbable pero
 * posible).
 */
async function generarNumeroOrden(
  tx: Prisma.TransactionClient | typeof prisma,
): Promise<string> {
  for (let intento = 0; intento < 5; intento++) {
    const fecha = new Date();
    const sello = [
      fecha.getFullYear(),
      String(fecha.getMonth() + 1).padStart(2, "0"),
      String(fecha.getDate()).padStart(2, "0"),
    ].join("");
    const aleatorio = Math.random().toString(36).slice(2, 6).toUpperCase();
    const candidato = `SNK-${sello}-${aleatorio}`;
    const existente = await tx.pedido.findUnique({
      where: { numeroOrden: candidato },
      select: { id: true },
    });
    if (!existente) {
      return candidato;
    }
  }
  throw new ErrorNegocioCheckout(
    "ORDEN_DUPLICADA",
    "No se pudo generar el número de orden. Probá de nuevo.",
  );
}

/**
 * RF-23 / RF-26: fase 1 del pedido. Crea el Pedido en estado PENDIENTE
 * con todos los montos, items y descuentos congelados, sin tocar
 * stock ni carrito. La aprobacion del pago (webhook de MP o simulado)
 * ejecuta la fase 2 en `aprobarPedidoPendiente`.
 */
export async function crearPedidoPendiente(
  usuarioId: string,
  opciones: { cuponCodigo?: string | null } = {},
): Promise<{ id: string; numeroOrden: string; total: number }> {
  const carrito = await obtenerEstadoCarrito(usuarioId);
  if (carrito.items.length === 0) {
    throw new ErrorNegocioCheckout("CARRITO_VACIO", "Tu carrito está vacío.");
  }
  if (!carrito.reservaActiva) {
    throw new ErrorNegocioCheckout(
      "RESERVA_EXPIRADA",
      "La reserva de tu carrito expiró. Volvé al carrito e iniciá la compra nuevamente.",
    );
  }
  if (carrito.items.some((item) => item.faltante > 0 || !item.productoActivo)) {
    throw new ErrorNegocioCheckout(
      "STOCK_INSUFICIENTE",
      "Hay items sin stock suficiente o desactivados: volvé al carrito y ajustá las cantidades.",
    );
  }

  return prisma.$transaction(async (tx) => {
    const direccion = await tx.direccion.findFirst({
      where: { clienteId: usuarioId },
      orderBy: [{ predeterminada: "desc" }, { creadoEn: "asc" }],
    });
    if (!direccion) {
      throw new ErrorNegocioCheckout(
        "SIN_DIRECCION",
        "Agregá una dirección de envío para continuar.",
      );
    }

    const cuponCodigo =
      opciones.cuponCodigo !== undefined ? opciones.cuponCodigo : await leerCuponGuardado();
    if (cuponCodigo) {
      await validarCupon(cuponCodigo, usuarioId);
    }

    const resumen = await resumenCheckout(
      carrito,
      cuponCodigo,
      { ciudad: direccion.ciudad, provincia: direccion.provincia },
    );

    // Items congelados desde el carrito (precio ya congelado al
    // agregar la linea, decision 8 del modelado). Un kit conserva la
    // referencia al kit y no una variante (RF-38).
    const items = await tx.itemCarrito.findMany({
      where: { carritoId: carrito.carritoId },
      select: {
        cantidad: true,
        precioUnitario: true,
        varianteProductoId: true,
        kitProductoId: true,
        varianteProducto: {
          select: { producto: { select: { nombre: true, sku: true } } },
        },
        kit: {
          select: {
            producto: { select: { nombre: true, sku: true } },
            componentes: {
              select: {
                varianteId: true,
                cantidad: true,
                variante: { select: { producto: { select: { nombre: true } } } },
              },
            },
          },
        },
      },
    });

    const numeroOrden = await generarNumeroOrden(tx);
    // RF-45: la tarifa se calcula desde la direccion congelada en el
    // snapshot, asi el costo y el destino del pedido siempre coinciden.
    const costoEnvio = calcularCostoEnvio(direccion.ciudad, direccion.provincia);

    // Acumular montoDescontado por promocionId cuando multiples items comparten la misma promo
    const promocionesAgrupadas = new Map<string, number>();
    for (const linea of resumen.items) {
      if (!linea.promocion) continue;
      promocionesAgrupadas.set(
        linea.promocion.id,
        Math.round(
          ((promocionesAgrupadas.get(linea.promocion.id) ?? 0) +
            linea.promocion.montoDescontado) *
            100,
        ) / 100,
      );
    }

    const pedido = await tx.pedido.create({
      data: {
        numeroOrden,
        estado: "PENDIENTE",
        costoEnvio,
        montoSubtotal: resumen.subtotal,
        descuentoTotal: resumen.descuentoPromociones + resumen.descuentoCupon,
        montoTotal: resumen.total + costoEnvio,
        datosEnvio: {
          destinatario: direccion.destinatario,
          calle: direccion.calle,
          numero: direccion.numero,
          ciudad: direccion.ciudad,
          provincia: direccion.provincia,
          codigoPostal: direccion.codigoPostal,
        },
        direccionId: direccion.id,
        clienteId: usuarioId,
        cuponId: resumen.cupon?.id ?? null,
        items: {
          create: items.map((item) => {
            const producto = item.kit?.producto ?? item.varianteProducto?.producto;
            return {
              cantidad: item.cantidad,
              precioUnitario: item.precioUnitario,
              subtotal: Number(item.precioUnitario) * item.cantidad,
              nombreProductoSnapshot: producto?.nombre ?? "Producto",
              skuSnapshot: producto?.sku ?? "",
              varianteProductoId: item.varianteProductoId,
              kitProductoId: item.kitProductoId,
              ...(item.kit
                ? {
                    componentesKit: item.kit.componentes.map((componente) => ({
                      varianteId: componente.varianteId,
                      cantidad: componente.cantidad,
                      nombre: componente.variante.producto.nombre,
                    })),
                  }
                : {}),
            };
          }),
        },
        promociones: {
          create: [...promocionesAgrupadas.entries()].map(
            ([promocionId, montoDescontado]) => ({
              promocionId,
              montoDescontado,
            }),
          ),
        },
      },
      select: { id: true, numeroOrden: true, montoTotal: true },
    });

    return { ...pedido, total: Number(pedido.montoTotal) };
  });
}

/**
 * RF-38: el pedido congela la composicion del kit para que una edicion
 * posterior del ABM no cambie el stock que se descuenta al aprobar el
 * pago. Los pedidos viejos sin snapshot usan la composicion actual.
 */
type ComponenteKitSnapshot = { varianteId: string; cantidad: number; nombre?: string };

function leerComponentesKitSnapshot(value: unknown): ComponenteKitSnapshot[] | null {
  if (!Array.isArray(value)) return null;
  const componentes: ComponenteKitSnapshot[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as { varianteId?: unknown }).varianteId === "string" &&
      typeof (item as { cantidad?: unknown }).cantidad === "number"
    ) {
      componentes.push({
        varianteId: (item as { varianteId: string }).varianteId,
        cantidad: (item as { cantidad: number }).cantidad,
        nombre:
          typeof (item as { nombre?: unknown }).nombre === "string"
            ? (item as { nombre: string }).nombre
            : undefined,
      });
    }
  }
  return componentes.length > 0 ? componentes : null;
}

/**
 * RF-23 / RF-26 / RN-05: fase 2 de la confirmacion. Todo en una
 * transaccion:
 *   1. el pedido debe seguir PENDIENTE (idempotencia ante webhooks
 *      repetidos);
 *   2. descuenta stock con guardas atomicas: si otra compra se llevo
 *      unidades, se rechaza sin dejar estados a medias;
 *   3. escribe MovimientoStock tipo VENTA con responsable y pedido;
 *   4. confirma el pedido y vacia el carrito (RN-04).
 */
export async function aprobarPedidoPendiente(
  numeroOrden: string,
  opciones: {
    metodoPago: string;
    pagoExternoId?: string | null;
    preferenciaId?: string | null;
  },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const pedido = await tx.pedido.findUnique({
      where: { numeroOrden },
      select: { id: true, clienteId: true, estado: true },
    });
    if (!pedido) {
      throw new ErrorNegocioCheckout("PEDIDO_INEXISTENTE", "El pedido no existe.");
    }

    // 1. Idempotencia: la guarda updateMany solo aplica si sigue
    // PENDIENTE; un webhook repetido no vuelve a descontar stock.
    const confirmado = await tx.pedido.updateMany({
      where: { id: pedido.id, estado: "PENDIENTE" },
      data: {
        estado: "CONFIRMADO",
        metodoPago: opciones.metodoPago,
        pagoExternoId: opciones.pagoExternoId ?? null,
        preferenciaId: opciones.preferenciaId ?? null,
      },
    });
    if (confirmado.count === 0) {
      return;
    }

    // 2. Descuento de stock con guardas atomicas (RN-05) a partir de
    // los items congelados del pedido. RN-06 / RF-38: vender un kit
    // descuenta individualmente cada variante componente.
    const items = await tx.itemPedido.findMany({
      where: { pedidoId: pedido.id },
      select: {
        cantidad: true,
        varianteProductoId: true,
        kitProductoId: true,
        componentesKit: true,
        varianteProducto: {
          select: { producto: { select: { nombre: true } } },
        },
        kit: {
          select: {
            producto: { select: { nombre: true } },
            componentes: {
              select: {
                varianteId: true,
                cantidad: true,
                variante: { select: { producto: { select: { nombre: true } } } },
              },
            },
          },
        },
      },
    });

    // Componentes compartidos por varias lineas se agrupan en un solo
    // descuento para no competir contra si mismos.
    const requerimientos = new Map<
      string,
      { cantidad: number; nombre: string; justificacion: string }
    >();
    for (const item of items) {
      if (item.varianteProductoId) {
        const actual = requerimientos.get(item.varianteProductoId);
        requerimientos.set(item.varianteProductoId, {
          cantidad: (actual?.cantidad ?? 0) + item.cantidad,
          nombre: item.varianteProducto?.producto.nombre ?? "una variante",
          justificacion: `Venta del pedido ${numeroOrden}`,
        });
      }
      const componentes =
        leerComponentesKitSnapshot(item.componentesKit) ??
        item.kit?.componentes.map((componente) => ({
          varianteId: componente.varianteId,
          cantidad: componente.cantidad,
          nombre: componente.variante.producto.nombre,
        })) ??
        [];

      for (const componente of componentes) {
        const unidades = item.cantidad * componente.cantidad;
        const actual = requerimientos.get(componente.varianteId);
        requerimientos.set(componente.varianteId, {
          cantidad: (actual?.cantidad ?? 0) + unidades,
          nombre: componente.nombre ?? actual?.nombre ?? "un componente del kit",
          justificacion: `Venta del pedido ${numeroOrden} (kit ${
            item.kit?.producto.nombre ?? ""
          })`,
        });
      }
    }

    for (const [varianteId, requerimiento] of requerimientos) {
      const actualizado = await tx.varianteProducto.updateMany({
        where: { id: varianteId, stockActual: { gte: requerimiento.cantidad } },
        data: { stockActual: { decrement: requerimiento.cantidad } },
      });
      if (actualizado.count === 0) {
        throw new ErrorNegocioCheckout(
          "STOCK_INSUFICIENTE",
          `Alguien compró las últimas unidades de "${requerimiento.nombre}" mientras se cobraba (RN-05).`,
        );
      }
    }

    // 3. Movimientos de stock tipo VENTA (RF-35 / RN-07): uno por
    // variante descontada, con el detalle del kit cuando corresponde.
    const variantesAfectadas = [...requerimientos.keys()];
    const stockPostVenta = await tx.varianteProducto.findMany({
      where: { id: { in: variantesAfectadas } },
      select: { id: true, stockActual: true },
    });
    const stockPorVariante = new Map(stockPostVenta.map((v) => [v.id, v.stockActual]));

    await tx.movimientoStock.createMany({
      data: [...requerimientos].map(([varianteId, requerimiento]) => ({
        tipo: "VENTA" as const,
        cantidad: requerimiento.cantidad,
        justificacion: requerimiento.justificacion,
        stockResultante: stockPorVariante.get(varianteId) ?? null,
        varianteProductoId: varianteId,
        responsableId: pedido.clienteId,
        pedidoId: pedido.id,
      })),
    });

    // 4. Vacia el carrito y libera la reserva (RN-04).
    await tx.itemCarrito.deleteMany({
      where: { carrito: { clienteId: pedido.clienteId } },
    });
    await tx.carrito.updateMany({
      where: { clienteId: pedido.clienteId },
      data: { reservaExpiracion: null },
    });
  });
}

/**
 * RF-25: registra el rechazo del pago sobre el pedido pendiente. El
 * carrito queda intacto para permitir el reintento.
 */
export async function rechazarPedidoPendiente(
  numeroOrden: string,
  opciones: { metodoPago: string; pagoExternoId?: string | null } = { metodoPago: "mercadopago" },
): Promise<void> {
  await prisma.pedido.updateMany({
    where: { numeroOrden, estado: "PENDIENTE" },
    data: {
      estado: "RECHAZADO",
      metodoPago: opciones.metodoPago,
      pagoExternoId: opciones.pagoExternoId ?? null,
    },
  });
}

/** Registro del pedido para la pantalla de confirmacion (RF-27). */
export async function obtenerPedidoConfirmado(usuarioId: string, numeroOrden: string) {
  const pedido = await prisma.pedido.findUnique({
    where: { numeroOrden },
    select: {
      id: true,
      numeroOrden: true,
      fechaCreacion: true,
      estado: true,
      montoSubtotal: true,
      descuentoTotal: true,
      montoTotal: true,
      costoEnvio: true,
      metodoPago: true,
      pagoExternoId: true,
      datosEnvio: true,
      clienteId: true,
      cupon: { select: { codigo: true, porcentajeDescuento: true } },
      promociones: { select: { montoDescontado: true, promocion: { select: { nombre: true } } } },
      items: {
        select: {
          id: true,
          cantidad: true,
          precioUnitario: true,
          subtotal: true,
          nombreProductoSnapshot: true,
          skuSnapshot: true,
          varianteProducto: {
            select: { talle: true, color: true, material: true },
          },
          kitProductoId: true,
        },
      },
    },
  });

  if (!pedido || pedido.clienteId !== usuarioId) {
    return null;
  }
  const { clienteId, ...resto } = pedido;
  void clienteId;
  return resto;
}
