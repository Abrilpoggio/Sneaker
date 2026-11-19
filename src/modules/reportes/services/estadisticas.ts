import { Prisma } from "@/generated/prisma/client";
import { EstadoPedido } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

/**
 * RF-47: Servicio de Estadisticas de Ventas e Inventario (Sprint 4 - Tadeo Rochas).
 *
 * Provee agregaciones y metricas consolidadas sobre el historial de ventas:
 * - Ventas por producto y variantes.
 * - Ventas por periodo de tiempo (rango configurable con filtros `desde` y `hasta`).
 * - Ranking de clientes por volumen de compra y recurrencia.
 * - Distribucion por categorias, marcas y provincias de destino.
 * - Metricas ejecutivas (KPIs): facturacion bruta, neta, descuentos, envios y ticket promedio.
 * - Estado del inventario y valorizacion patrimonial.
 */

export interface FiltrosEstadisticas {
  desde?: Date;
  hasta?: Date;
  estado?: EstadoPedido | "TODOS";
}

export interface KpisVentas {
  totalPedidos: number;
  pedidosCompletados: number;
  pedidosCancelados: number;
  facturacionBruta: number; // Subtotal sin descuentos
  totalDescuentos: number;
  totalEnvios: number;
  facturacionNeta: number; // Monto efectivamente recaudado (excluyendo cancelados/rechazados)
  ticketPromedio: number;
  unidadesVendidasTotales: number;
}

export interface VentaPorPeriodo {
  fecha: string; // YYYY-MM-DD o YYYY-MM
  pedidos: number;
  recaudacion: number;
  unidades: number;
}

export interface TopProducto {
  sku: string;
  nombre: string;
  categoria: string;
  marca: string;
  unidadesVendidas: number;
  facturacionTotal: number;
  precioVenta: number;
}

export interface DesgloseCategoria {
  categoria: string;
  unidades: number;
  facturacion: number;
  porcentaje: number;
}

export interface DesgloseMarca {
  marca: string;
  unidades: number;
  facturacion: number;
  porcentaje: number;
}

export interface ClienteRanking {
  clienteId: string;
  nombreCompleto: string;
  correo: string;
  dni?: number | null;
  ciudad: string;
  provincia: string;
  totalPedidos: number;
  unidadesCompradas: number;
  totalGastado: number;
  ultimoPedido: Date;
}

export interface DistribucionEstado {
  estado: EstadoPedido;
  cantidad: number;
  monto: number;
  porcentaje: number;
}

export interface DistribucionMetodoPago {
  metodo: string;
  cantidad: number;
  monto: number;
}

export interface VentaPorProvincia {
  provincia: string;
  pedidos: number;
  recaudacion: number;
}

export interface ResumenInventario {
  totalProductos: number;
  totalVariantes: number;
  unidadesEnStock: number;
  valorizacionCosto: number;
  valorizacionVenta: number;
  margenPotencial: number;
  variantesStockBajo: number; // RN-09: stock <= 10
  variantesSinStock: number; // RF-09: stock == 0
}

export interface ReporteEstadisticasCompleto {
  periodo: {
    desde?: Date;
    hasta?: Date;
    totalDias: number;
  };
  kpis: KpisVentas;
  ventasPorPeriodo: VentaPorPeriodo[];
  topProductos: TopProducto[];
  ventasPorCategoria: DesgloseCategoria[];
  ventasPorMarca: DesgloseMarca[];
  rankingClientes: ClienteRanking[];
  distribucionEstados: DistribucionEstado[];
  distribucionMetodosPago: DistribucionMetodoPago[];
  ventasPorProvincia: VentaPorProvincia[];
  inventario: ResumenInventario;
}

export async function obtenerEstadisticasCompletas(
  filtros: FiltrosEstadisticas = {},
): Promise<ReporteEstadisticasCompleto> {
  const whereClausula: Prisma.PedidoWhereInput = {};

  if (filtros.desde || filtros.hasta) {
    whereClausula.fechaCreacion = {};
    if (filtros.desde) whereClausula.fechaCreacion.gte = filtros.desde;
    if (filtros.hasta) whereClausula.fechaCreacion.lte = filtros.hasta;
  }

  if (filtros.estado && filtros.estado !== "TODOS") {
    whereClausula.estado = filtros.estado;
  }

  // 1. Obtener todos los pedidos del rango con items y cliente
  const pedidos = await prisma.pedido.findMany({
    where: whereClausula,
    orderBy: { fechaCreacion: "asc" },
    include: {
      cliente: {
        include: {
          usuario: { select: { correo: true } },
        },
      },
      items: {
        include: {
          varianteProducto: {
            include: {
              producto: {
                include: {
                  categoria: true,
                  marca: true,
                },
              },
            },
          },
          kit: {
            include: {
              producto: {
                include: {
                  categoria: true,
                  marca: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // 2. Obtener inventario actual
  const [productosInventario, variantesInventario] = await Promise.all([
    prisma.producto.findMany({
      select: {
        id: true,
        costoCompra: true,
        precioVenta: true,
      },
    }),
    prisma.varianteProducto.findMany({
      select: {
        id: true,
        stockActual: true,
        producto: {
          select: {
            costoCompra: true,
            precioVenta: true,
          },
        },
      },
    }),
  ]);

  // Calcular metricas de inventario
  let unidadesEnStock = 0;
  let valorizacionCosto = 0;
  let valorizacionVenta = 0;
  let variantesStockBajo = 0;
  let variantesSinStock = 0;

  for (const v of variantesInventario) {
    unidadesEnStock += v.stockActual;
    const costo = Number(v.producto.costoCompra);
    const venta = Number(v.producto.precioVenta);
    valorizacionCosto += costo * v.stockActual;
    valorizacionVenta += venta * v.stockActual;

    if (v.stockActual === 0) {
      variantesSinStock++;
    } else if (v.stockActual <= 10) {
      variantesStockBajo++;
    }
  }

  const margenPotencial =
    valorizacionVenta > 0
      ? ((valorizacionVenta - valorizacionCosto) / valorizacionVenta) * 100
      : 0;

  const inventario: ResumenInventario = {
    totalProductos: productosInventario.length,
    totalVariantes: variantesInventario.length,
    unidadesEnStock,
    valorizacionCosto,
    valorizacionVenta,
    margenPotencial,
    variantesStockBajo,
    variantesSinStock,
  };

  // 3. Procesar KPIs y ventas
  let facturacionBruta = 0;
  let totalDescuentos = 0;
  let totalEnvios = 0;
  let facturacionNeta = 0;
  let pedidosCompletados = 0;
  let pedidosCancelados = 0;
  let unidadesVendidasTotales = 0;

  const pedidosPorFechaMap = new Map<string, { pedidos: number; recaudacion: number; unidades: number }>();
  const productosMap = new Map<string, TopProducto>();
  const categoriasMap = new Map<string, { unidades: number; facturacion: number }>();
  const marcasMap = new Map<string, { unidades: number; facturacion: number }>();
  const clientesMap = new Map<string, ClienteRanking>();
  const estadosMap = new Map<EstadoPedido, { cantidad: number; monto: number }>();
  const metodosPagoMap = new Map<string, { cantidad: number; monto: number }>();
  const provinciasMap = new Map<string, { pedidos: number; recaudacion: number }>();

  let pedidosValidosCount = 0;

  for (const p of pedidos) {
    const total = Number(p.montoTotal);
    const subtotal = Number(p.montoSubtotal);
    const descuento = Number(p.descuentoTotal);
    const envio = Number(p.costoEnvio);

    const esValido =
      p.estado !== EstadoPedido.CANCELADO &&
      p.estado !== EstadoPedido.RECHAZADO &&
      p.estado !== EstadoPedido.PENDIENTE;

    if (esValido) {
      pedidosValidosCount++;
      facturacionBruta += subtotal;
      totalDescuentos += descuento;
      totalEnvios += envio;
      facturacionNeta += total;
    }

    if (p.estado === EstadoPedido.RECIBIDO) pedidosCompletados++;
    if (p.estado === EstadoPedido.CANCELADO || p.estado === EstadoPedido.RECHAZADO) pedidosCancelados++;

    // Estados (siempre muestra todos para auditoria completa)
    const estadoActual = estadosMap.get(p.estado) ?? { cantidad: 0, monto: 0 };
    estadoActual.cantidad++;
    estadoActual.monto += total;
    estadosMap.set(p.estado, estadoActual);

    // Metodos de pago (solo ventas validas)
    if (esValido) {
      const metodo = p.metodoPago || "Sin especificar";
      const metodoActual = metodosPagoMap.get(metodo) ?? { cantidad: 0, monto: 0 };
      metodoActual.cantidad++;
      metodoActual.monto += total;
      metodosPagoMap.set(metodo, metodoActual);
    }

    // Provincias
    const datosEnvio = p.datosEnvio as { provincia?: string; ciudad?: string } | null;
    const provincia = datosEnvio?.provincia || "No informada";
    if (esValido) {
      const provActual = provinciasMap.get(provincia) ?? { pedidos: 0, recaudacion: 0 };
      provActual.pedidos++;
      provActual.recaudacion += total;
      provinciasMap.set(provincia, provActual);
    }

    // Ventas por periodo (diario - solo ventas validas)
    const fechaClave = p.fechaCreacion.toISOString().slice(0, 10);
    const diaActual = esValido
      ? (pedidosPorFechaMap.get(fechaClave) ?? { pedidos: 0, recaudacion: 0, unidades: 0 })
      : null;
    if (diaActual) {
      diaActual.pedidos++;
      diaActual.recaudacion += total;
    }

    // Items y clientes
    let unidadesEnEstePedido = 0;
    for (const item of p.items) {
      const cantidad = item.cantidad;
      const sub = Number(item.subtotal);
      unidadesEnEstePedido += cantidad;

      if (esValido) {
        unidadesVendidasTotales += cantidad;
        if (diaActual) diaActual.unidades += cantidad;

        // Top Productos
        const sku = item.skuSnapshot;
        const nombre = item.varianteProducto?.producto?.nombre || item.kit?.producto?.nombre || item.nombreProductoSnapshot;
        const categoria = item.varianteProducto?.producto?.categoria?.nombre || item.kit?.producto?.categoria?.nombre || "General";
        const marca = item.varianteProducto?.producto?.marca?.nombre || item.kit?.producto?.marca?.nombre || "Sneaker";
        const precioVenta = Number(item.precioUnitario);

        const prodActual = productosMap.get(sku) ?? {
          sku,
          nombre,
          categoria,
          marca,
          unidadesVendidas: 0,
          facturacionTotal: 0,
          precioVenta,
        };
        prodActual.unidadesVendidas += cantidad;
        prodActual.facturacionTotal += sub;
        productosMap.set(sku, prodActual);

        // Categorias
        const catActual = categoriasMap.get(categoria) ?? { unidades: 0, facturacion: 0 };
        catActual.unidades += cantidad;
        catActual.facturacion += sub;
        categoriasMap.set(categoria, catActual);

        // Marcas
        const marcaActual = marcasMap.get(marca) ?? { unidades: 0, facturacion: 0 };
        marcaActual.unidades += cantidad;
        marcaActual.facturacion += sub;
        marcasMap.set(marca, marcaActual);
      }
    }
    if (diaActual) {
      pedidosPorFechaMap.set(fechaClave, diaActual);
    }

    // Ranking de clientes (solo ventas validas)
    if (esValido) {
      const clienteKey = p.clienteId;
      const clActual = clientesMap.get(clienteKey) ?? {
        clienteId: clienteKey,
        nombreCompleto: `${p.cliente.nombre} ${p.cliente.apellido}`,
        correo: p.cliente.usuario.correo,
        dni: p.cliente.dni,
        ciudad: datosEnvio?.ciudad || "-",
        provincia: datosEnvio?.provincia || "-",
        totalPedidos: 0,
        unidadesCompradas: 0,
        totalGastado: 0,
        ultimoPedido: p.fechaCreacion,
      };
      clActual.totalPedidos++;
      clActual.unidadesCompradas += unidadesEnEstePedido;
      clActual.totalGastado += total;
      if (p.fechaCreacion > clActual.ultimoPedido) {
        clActual.ultimoPedido = p.fechaCreacion;
      }
      clientesMap.set(clienteKey, clActual);
    }
  }

  const ticketPromedio =
    pedidosValidosCount > 0 ? facturacionNeta / pedidosValidosCount : 0;

  const kpis: KpisVentas = {
    totalPedidos: pedidos.length,
    pedidosCompletados,
    pedidosCancelados,
    facturacionBruta,
    totalDescuentos,
    totalEnvios,
    facturacionNeta,
    ticketPromedio,
    unidadesVendidasTotales,
  };

  // Convertir mapas a listas ordenadas
  const ventasPorPeriodo: VentaPorPeriodo[] = Array.from(pedidosPorFechaMap.entries())
    .map(([fecha, datos]) => ({ fecha, ...datos }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const topProductos: TopProducto[] = Array.from(productosMap.values()).sort(
    (a, b) => b.facturacionTotal - a.facturacionTotal,
  );

  const ventasPorCategoria: DesgloseCategoria[] = Array.from(categoriasMap.entries())
    .map(([categoria, datos]) => ({
      categoria,
      unidades: datos.unidades,
      facturacion: datos.facturacion,
      porcentaje: facturacionBruta > 0 ? (datos.facturacion / facturacionBruta) * 100 : 0,
    }))
    .sort((a, b) => b.facturacion - a.facturacion);

  const ventasPorMarca: DesgloseMarca[] = Array.from(marcasMap.entries())
    .map(([marca, datos]) => ({
      marca,
      unidades: datos.unidades,
      facturacion: datos.facturacion,
      porcentaje: facturacionBruta > 0 ? (datos.facturacion / facturacionBruta) * 100 : 0,
    }))
    .sort((a, b) => b.facturacion - a.facturacion);

  const rankingClientes: ClienteRanking[] = Array.from(clientesMap.values()).sort(
    (a, b) => b.totalGastado - a.totalGastado,
  );

  const distribucionEstados: DistribucionEstado[] = Array.from(estadosMap.entries())
    .map(([estado, datos]) => ({
      estado,
      cantidad: datos.cantidad,
      monto: datos.monto,
      porcentaje: pedidos.length > 0 ? (datos.cantidad / pedidos.length) * 100 : 0,
    }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const distribucionMetodosPago: DistribucionMetodoPago[] = Array.from(metodosPagoMap.entries())
    .map(([metodo, datos]) => ({
      metodo,
      cantidad: datos.cantidad,
      monto: datos.monto,
    }))
    .sort((a, b) => b.monto - a.monto);

  const ventasPorProvincia: VentaPorProvincia[] = Array.from(provinciasMap.entries())
    .map(([provincia, datos]) => ({
      provincia,
      pedidos: datos.pedidos,
      recaudacion: datos.recaudacion,
    }))
    .sort((a, b) => b.recaudacion - a.recaudacion);

  const fechaMin = pedidos.length > 0 ? pedidos[0].fechaCreacion : undefined;
  const fechaMax = pedidos.length > 0 ? pedidos[pedidos.length - 1].fechaCreacion : undefined;
  const totalDias =
    fechaMin && fechaMax
      ? Math.max(1, Math.ceil((fechaMax.getTime() - fechaMin.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

  return {
    periodo: {
      desde: filtros.desde ?? fechaMin,
      hasta: filtros.hasta ?? fechaMax,
      totalDias,
    },
    kpis,
    ventasPorPeriodo,
    topProductos,
    ventasPorCategoria,
    ventasPorMarca,
    rankingClientes,
    distribucionEstados,
    distribucionMetodosPago,
    ventasPorProvincia,
    inventario,
  };
}

