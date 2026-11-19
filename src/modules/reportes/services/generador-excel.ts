import ExcelJS from "exceljs";
import { EstadoPedido } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import {
  FiltrosEstadisticas,
  obtenerEstadisticasCompletas,
} from "./estadisticas";

/**
 * RF-48: Generador de Reportes en Excel (.xlsx) (Sprint 4 - Tadeo Rochas).
 *
 * Construye un libro de trabajo en formato OpenXML (.xlsx) altamente estructurado
 * y estilizado con la identidad visual de Sneaker:
 * - Color corporativo primario: #CF1A1F (Rojo Sneaker)
 * - Color corporativo secundario: #2C2C2C (Gris Oscuro / Carbon)
 * - Formateo nativo de celdas: Moneda ($#,##0.00), Porcentajes (0.0%), Fechas y Enteros.
 * - 5 Hojas de calculo tematicas:
 *   1. Resumen Ejecutivo (KPIs, estados, medios de pago, inventario)
 *   2. Ventas Detalladas (pedido a pedido con cliente, ubicacion, montos, cupones)
 *   3. Items Vendidos (desglose por variante, talle, color y kits)
 *   4. Top Productos y Marcas (rankings por volumen y facturacion)
 *   5. Inventario y Stock (existencias, alertas RN-09, RF-09 y valorizacion patrimonial)
 */

const COLOR_PRIMARIO = "FFCF1A1F"; // Rojo Sneaker
const COLOR_OSCURO = "FF2C2C2C"; // Gris Carbon
const COLOR_ZEBRA = "FFF9FAFB"; // Gris muy claro alternado
const COLOR_BORDE = "FFE5E7EB"; // Gris tenue
const COLOR_ALERTA_AMARILLA = "FFFEF3C7"; // Advertencia stock bajo (RN-09)
const COLOR_ALERTA_ROJA = "FFFEE2E2"; // Alerta sin stock (RF-09)

function aplicarBordes(celda: ExcelJS.Cell) {
  celda.border = {
    top: { style: "thin", color: { argb: COLOR_BORDE } },
    left: { style: "thin", color: { argb: COLOR_BORDE } },
    bottom: { style: "thin", color: { argb: COLOR_BORDE } },
    right: { style: "thin", color: { argb: COLOR_BORDE } },
  };
}

function estilizarEncabezado(fila: ExcelJS.Row, colorFondo = COLOR_PRIMARIO) {
  fila.height = 26;
  fila.eachCell((celda) => {
    celda.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    celda.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: colorFondo },
    };
    celda.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    aplicarBordes(celda);
  });
}

function ajustarAnchoColumnas(hoja: ExcelJS.Worksheet, minimo = 12, maximo = 45) {
  hoja.columns.forEach((columna) => {
    let largoMaximo = minimo;
    columna.eachCell?.({ includeEmpty: false }, (celda) => {
      const val = celda.value;
      const texto =
        val && typeof val === "object" && "formula" in val
          ? ""
          : val
            ? val.toString()
            : "";
      if (texto.length > largoMaximo) {
        largoMaximo = Math.min(texto.length + 3, maximo);
      }
    });
    columna.width = largoMaximo;
  });
}

export async function generarLibroExcelReportes(
  filtros: FiltrosEstadisticas = {},
): Promise<ExcelJS.Buffer> {
  const datos = await obtenerEstadisticasCompletas(filtros);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Sneaker E-commerce (UADER / FCyT)";
  workbook.lastModifiedBy = "Tadeo Rochas - Sprint 4";
  workbook.created = new Date();
  workbook.modified = new Date();

  // =========================================================================
  // HOJA 1: RESUMEN EJECUTIVO
  // =========================================================================
  const hojaResumen = workbook.addWorksheet("Resumen Ejecutivo", {
    views: [{ showGridLines: true }],
  });

  // Banner superior
  hojaResumen.mergeCells("A1:F1");
  const banner = hojaResumen.getCell("A1");
  banner.value = "SNEAKER E-COMMERCE · INFORME EJECUTIVO DE VENTAS";
  banner.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  banner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_PRIMARIO } };
  banner.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  hojaResumen.getRow(1).height = 36;

  // Subtitulo con metadatos
  hojaResumen.mergeCells("A2:F2");
  const subBanner = hojaResumen.getCell("A2");
  const desdeStr = datos.periodo.desde ? datos.periodo.desde.toISOString().slice(0, 10) : "Inicio";
  const hastaStr = datos.periodo.hasta ? datos.periodo.hasta.toISOString().slice(0, 10) : "Actualidad";
  subBanner.value = `Periodo auditado: ${desdeStr} al ${hastaStr} | Generado: ${new Date().toLocaleString("es-AR")}`;
  subBanner.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF555555" } };
  subBanner.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
  subBanner.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  hojaResumen.getRow(2).height = 20;

  // Seccion KPIs
  hojaResumen.getCell("A4").value = "INDICADORES CLAVE DE DESEMPEÑO (KPIs)";
  hojaResumen.getCell("A4").font = { name: "Segoe UI", size: 11, bold: true, color: { argb: COLOR_OSCURO } };

  const tablaKpis = [
    ["Facturacion Bruta (Subtotal productos)", datos.kpis.facturacionBruta, '"$"#,##0.00'],
    ["Descuentos Totales Otorgados", datos.kpis.totalDescuentos, '"$"#,##0.00'],
    ["Costos de Envio Cobrados (RF-45)", datos.kpis.totalEnvios, '"$"#,##0.00'],
    ["Facturacion Neta Recaudada", datos.kpis.facturacionNeta, '"$"#,##0.00'],
    ["Ticket Promedio por Pedido", datos.kpis.ticketPromedio, '"$"#,##0.00'],
    ["Cantidad Total de Pedidos", datos.kpis.totalPedidos, "#,##0"],
    ["Pedidos Recibidos / Completados", datos.kpis.pedidosCompletados, "#,##0"],
    ["Pedidos Cancelados / Rechazados", datos.kpis.pedidosCancelados, "#,##0"],
    ["Unidades Fisicas Vendidas", datos.kpis.unidadesVendidasTotales, "#,##0"],
  ];

  let filaActual = 5;
  for (const [concepto, valor, formato] of tablaKpis) {
    hojaResumen.getCell(`A${filaActual}`).value = concepto;
    hojaResumen.getCell(`A${filaActual}`).font = { name: "Segoe UI", size: 10 };
    aplicarBordes(hojaResumen.getCell(`A${filaActual}`));

    const cValor = hojaResumen.getCell(`B${filaActual}`);
    cValor.value = valor as number;
    cValor.numFmt = formato as string;
    cValor.font = { name: "Segoe UI", size: 10, bold: true };
    cValor.alignment = { horizontal: "right" };
    aplicarBordes(cValor);

    if (filaActual % 2 === 0) {
      hojaResumen.getCell(`A${filaActual}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA } };
      cValor.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA } };
    }
    filaActual++;
  }

  // Seccion Estados de Pedido
  filaActual += 2;
  hojaResumen.getCell(`A${filaActual}`).value = "DISTRIBUCION POR ESTADO DE PEDIDO";
  hojaResumen.getCell(`A${filaActual}`).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: COLOR_OSCURO } };
  filaActual++;

  const filaEncEstados = hojaResumen.getRow(filaActual);
  filaEncEstados.getCell(1).value = "Estado";
  filaEncEstados.getCell(2).value = "Cantidad";
  filaEncEstados.getCell(3).value = "Monto Total";
  filaEncEstados.getCell(4).value = "% del Total";
  estilizarEncabezado(filaEncEstados, COLOR_OSCURO);
  filaActual++;

  for (const est of datos.distribucionEstados) {
    const f = hojaResumen.getRow(filaActual);
    f.getCell(1).value = est.estado;
    f.getCell(2).value = est.cantidad;
    f.getCell(3).value = est.monto;
    f.getCell(3).numFmt = '"$"#,##0.00';
    f.getCell(4).value = est.porcentaje / 100;
    f.getCell(4).numFmt = "0.0%";

    [1, 2, 3, 4].forEach((col) => aplicarBordes(f.getCell(col)));
    filaActual++;
  }

  // Seccion Resumen Inventario
  filaActual += 2;
  hojaResumen.getCell(`A${filaActual}`).value = "VALORIZACION PATRIMONIAL DEL INVENTARIO";
  hojaResumen.getCell(`A${filaActual}`).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: COLOR_OSCURO } };
  filaActual++;

  const tablaInv = [
    ["Productos en Catalogo", datos.inventario.totalProductos, "#,##0"],
    ["Variantes Totales", datos.inventario.totalVariantes, "#,##0"],
    ["Unidades Fisicas en Stock", datos.inventario.unidadesEnStock, "#,##0"],
    ["Valorizacion Total a Costo de Compra", datos.inventario.valorizacionCosto, '"$"#,##0.00'],
    ["Valorizacion Total a Precio de Venta", datos.inventario.valorizacionVenta, '"$"#,##0.00'],
    ["Margen Bruto Estimado", datos.inventario.margenPotencial / 100, "0.0%"],
    ["Variantes con Stock Critico (RN-09: <= 10)", datos.inventario.variantesStockBajo, "#,##0"],
    ["Variantes sin Stock (RF-09)", datos.inventario.variantesSinStock, "#,##0"],
  ];

  for (const [concepto, valor, formato] of tablaInv) {
    hojaResumen.getCell(`A${filaActual}`).value = concepto;
    hojaResumen.getCell(`A${filaActual}`).font = { name: "Segoe UI", size: 10 };
    aplicarBordes(hojaResumen.getCell(`A${filaActual}`));

    const cValor = hojaResumen.getCell(`B${filaActual}`);
    cValor.value = valor as number;
    cValor.numFmt = formato as string;
    cValor.font = { name: "Segoe UI", size: 10, bold: true };
    cValor.alignment = { horizontal: "right" };
    aplicarBordes(cValor);

    if (concepto.toString().includes("Critico") && (valor as number) > 0) {
      cValor.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ALERTA_AMARILLA } };
    } else if (concepto.toString().includes("sin Stock") && (valor as number) > 0) {
      cValor.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ALERTA_ROJA } };
    } else if (filaActual % 2 === 0) {
      hojaResumen.getCell(`A${filaActual}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA } };
      cValor.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA } };
    }
    filaActual++;
  }

  ajustarAnchoColumnas(hojaResumen, 20, 50);

  // =========================================================================
  // HOJA 2: VENTAS DETALLADAS (PEDIDO A PEDIDO)
  // =========================================================================
  const hojaVentas = workbook.addWorksheet("Ventas Detalladas", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 1 }],
  });

  const filaEncVentas = hojaVentas.getRow(1);
  filaEncVentas.values = [
    "N° Orden",
    "Fecha y Hora",
    "Cliente",
    "DNI",
    "Email",
    "Ciudad",
    "Provincia",
    "Subtotal ($)",
    "Descuento ($)",
    "Costo Envio ($)",
    "Total Pagado ($)",
    "Estado",
    "Metodo de Pago",
    "Cupon Aplicado",
  ];
  estilizarEncabezado(filaEncVentas, COLOR_PRIMARIO);

  // Consultar pedidos con detalle
  const whereClausula: any = {};
  if (filtros.desde || filtros.hasta) {
    whereClausula.fechaCreacion = {};
    if (filtros.desde) whereClausula.fechaCreacion.gte = filtros.desde;
    if (filtros.hasta) whereClausula.fechaCreacion.lte = filtros.hasta;
  }
  if (filtros.estado && filtros.estado !== "TODOS") {
    whereClausula.estado = filtros.estado;
  }

  const pedidosDb = await prisma.pedido.findMany({
    where: whereClausula,
    orderBy: { fechaCreacion: "desc" },
    include: {
      cliente: {
        include: { usuario: { select: { correo: true } } },
      },
      cupon: { select: { codigo: true } },
    },
  });

  let numFilaVentas = 2;
  for (const p of pedidosDb) {
    const f = hojaVentas.getRow(numFilaVentas);
    const datosEnvio = p.datosEnvio as { ciudad?: string; provincia?: string } | null;

    f.getCell(1).value = p.numeroOrden;
    f.getCell(2).value = p.fechaCreacion;
    f.getCell(2).numFmt = "yyyy-mm-dd hh:mm";
    f.getCell(3).value = `${p.cliente.nombre} ${p.cliente.apellido}`;
    f.getCell(4).value = p.cliente.dni ?? "-";
    f.getCell(5).value = p.cliente.usuario.correo;
    f.getCell(6).value = datosEnvio?.ciudad || "-";
    f.getCell(7).value = datosEnvio?.provincia || "-";

    f.getCell(8).value = Number(p.montoSubtotal);
    f.getCell(8).numFmt = '"$"#,##0.00';

    f.getCell(9).value = Number(p.descuentoTotal);
    f.getCell(9).numFmt = '"$"#,##0.00';

    f.getCell(10).value = Number(p.costoEnvio);
    f.getCell(10).numFmt = '"$"#,##0.00';

    f.getCell(11).value = Number(p.montoTotal);
    f.getCell(11).numFmt = '"$"#,##0.00';
    f.getCell(11).font = { bold: true };

    f.getCell(12).value = p.estado;
    f.getCell(13).value = p.metodoPago || "-";
    f.getCell(14).value = p.cupon?.codigo || "-";

    // Zebra
    if (numFilaVentas % 2 === 0) {
      for (let col = 1; col <= 14; col++) {
        f.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA } };
      }
    }
    for (let col = 1; col <= 14; col++) {
      aplicarBordes(f.getCell(col));
    }
    numFilaVentas++;
  }

  // Fila de totales
  if (pedidosDb.length > 0) {
    const filaTotal = hojaVentas.getRow(numFilaVentas);
    filaTotal.getCell(1).value = "TOTALES";
    filaTotal.getCell(1).font = { bold: true };
    filaTotal.getCell(8).value = { formula: `SUM(H2:H${numFilaVentas - 1})` };
    filaTotal.getCell(8).numFmt = '"$"#,##0.00';
    filaTotal.getCell(9).value = { formula: `SUM(I2:I${numFilaVentas - 1})` };
    filaTotal.getCell(9).numFmt = '"$"#,##0.00';
    filaTotal.getCell(10).value = { formula: `SUM(J2:J${numFilaVentas - 1})` };
    filaTotal.getCell(10).numFmt = '"$"#,##0.00';
    filaTotal.getCell(11).value = { formula: `SUM(K2:K${numFilaVentas - 1})` };
    filaTotal.getCell(11).numFmt = '"$"#,##0.00';
    filaTotal.font = { bold: true };

    for (let col = 1; col <= 14; col++) {
      filaTotal.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
      aplicarBordes(filaTotal.getCell(col));
    }
  }

  ajustarAnchoColumnas(hojaVentas, 12, 40);

  // =========================================================================
  // HOJA 3: ITEMS VENDIDOS
  // =========================================================================
  const hojaItems = workbook.addWorksheet("Items Vendidos", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 1 }],
  });

  const filaEncItems = hojaItems.getRow(1);
  filaEncItems.values = [
    "N° Orden",
    "Fecha",
    "SKU",
    "Tipo",
    "Producto / Descripcion",
    "Variante (Talle - Color)",
    "Cantidad",
    "Precio Unitario ($)",
    "Subtotal ($)",
  ];
  estilizarEncabezado(filaEncItems, COLOR_PRIMARIO);

  const itemsDb = await prisma.itemPedido.findMany({
    where: {
      pedido: whereClausula,
    },
    orderBy: { pedido: { fechaCreacion: "desc" } },
    include: {
      pedido: { select: { numeroOrden: true, fechaCreacion: true } },
      varianteProducto: {
        include: { producto: true },
      },
      kit: {
        include: { producto: true },
      },
    },
  });

  let numFilaItems = 2;
  for (const it of itemsDb) {
    const f = hojaItems.getRow(numFilaItems);
    f.getCell(1).value = it.pedido.numeroOrden;
    f.getCell(2).value = it.pedido.fechaCreacion;
    f.getCell(2).numFmt = "yyyy-mm-dd";
    f.getCell(3).value = it.skuSnapshot;
    f.getCell(4).value = it.kitProductoId ? "KIT" : "INDIVIDUAL";
    f.getCell(5).value = it.nombreProductoSnapshot;
    f.getCell(6).value = it.varianteProducto ? `${it.varianteProducto.talle} - ${it.varianteProducto.color}` : "Kit Multiproducto";
    f.getCell(7).value = it.cantidad;
    f.getCell(7).numFmt = "#,##0";
    f.getCell(8).value = Number(it.precioUnitario);
    f.getCell(8).numFmt = '"$"#,##0.00';
    f.getCell(9).value = Number(it.subtotal);
    f.getCell(9).numFmt = '"$"#,##0.00';
    f.getCell(9).font = { bold: true };

    if (numFilaItems % 2 === 0) {
      for (let col = 1; col <= 9; col++) {
        f.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA } };
      }
    }
    for (let col = 1; col <= 9; col++) {
      aplicarBordes(f.getCell(col));
    }
    numFilaItems++;
  }

  if (itemsDb.length > 0) {
    const filaTotalItems = hojaItems.getRow(numFilaItems);
    filaTotalItems.getCell(1).value = "TOTALES";
    filaTotalItems.getCell(7).value = { formula: `SUM(G2:G${numFilaItems - 1})` };
    filaTotalItems.getCell(7).numFmt = "#,##0";
    filaTotalItems.getCell(9).value = { formula: `SUM(I2:I${numFilaItems - 1})` };
    filaTotalItems.getCell(9).numFmt = '"$"#,##0.00';
    filaTotalItems.font = { bold: true };
    for (let col = 1; col <= 9; col++) {
      filaTotalItems.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
      aplicarBordes(filaTotalItems.getCell(col));
    }
  }

  ajustarAnchoColumnas(hojaItems, 12, 45);

  // =========================================================================
  // HOJA 4: TOP PRODUCTOS Y MARCAS
  // =========================================================================
  const hojaTop = workbook.addWorksheet("Top Productos y Marcas", {
    views: [{ showGridLines: true }],
  });

  hojaTop.mergeCells("A1:G1");
  const titTop = hojaTop.getCell("A1");
  titTop.value = "RANKING DE PRODUCTOS MAS VENDIDOS (RF-47)";
  titTop.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  titTop.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_PRIMARIO } };
  titTop.alignment = { vertical: "middle", indent: 1 };
  hojaTop.getRow(1).height = 24;

  const filaEncTop = hojaTop.getRow(2);
  filaEncTop.values = [
    "Posicion",
    "SKU",
    "Producto",
    "Categoria",
    "Marca",
    "Unidades Vendidas",
    "Recaudacion Total ($)",
  ];
  estilizarEncabezado(filaEncTop, COLOR_OSCURO);

  let filaTop = 3;
  datos.topProductos.forEach((p, idx) => {
    const f = hojaTop.getRow(filaTop);
    f.getCell(1).value = idx + 1;
    f.getCell(2).value = p.sku;
    f.getCell(3).value = p.nombre;
    f.getCell(4).value = p.categoria;
    f.getCell(5).value = p.marca;
    f.getCell(6).value = p.unidadesVendidas;
    f.getCell(6).numFmt = "#,##0";
    f.getCell(7).value = p.facturacionTotal;
    f.getCell(7).numFmt = '"$"#,##0.00';
    f.getCell(7).font = { bold: true };

    if (filaTop % 2 === 0) {
      for (let col = 1; col <= 7; col++) {
        f.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA } };
      }
    }
    for (let col = 1; col <= 7; col++) aplicarBordes(f.getCell(col));
    filaTop++;
  });

  // Ranking de Clientes
  filaTop += 2;
  hojaTop.mergeCells(`A${filaTop}:G${filaTop}`);
  const titCli = hojaTop.getCell(`A${filaTop}`);
  titCli.value = "RANKING DE CLIENTES POR VOLUMEN Y FACTURACION (RF-47)";
  titCli.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  titCli.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_PRIMARIO } };
  titCli.alignment = { vertical: "middle", indent: 1 };
  hojaTop.getRow(filaTop).height = 24;
  filaTop++;

  const filaEncCli = hojaTop.getRow(filaTop);
  filaEncCli.values = [
    "Posicion",
    "Cliente",
    "Email",
    "Ciudad / Provincia",
    "Total Pedidos",
    "Unidades",
    "Total Gastado ($)",
  ];
  estilizarEncabezado(filaEncCli, COLOR_OSCURO);
  filaTop++;

  datos.rankingClientes.forEach((c, idx) => {
    const f = hojaTop.getRow(filaTop);
    f.getCell(1).value = idx + 1;
    f.getCell(2).value = c.nombreCompleto;
    f.getCell(3).value = c.correo;
    f.getCell(4).value = `${c.ciudad} (${c.provincia})`;
    f.getCell(5).value = c.totalPedidos;
    f.getCell(6).value = c.unidadesCompradas;
    f.getCell(7).value = c.totalGastado;
    f.getCell(7).numFmt = '"$"#,##0.00';
    f.getCell(7).font = { bold: true };

    if (filaTop % 2 === 0) {
      for (let col = 1; col <= 7; col++) {
        f.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA } };
      }
    }
    for (let col = 1; col <= 7; col++) aplicarBordes(f.getCell(col));
    filaTop++;
  });

  ajustarAnchoColumnas(hojaTop, 12, 45);

  // =========================================================================
  // HOJA 5: INVENTARIO Y STOCK ACTUAL
  // =========================================================================
  const hojaInv = workbook.addWorksheet("Inventario y Stock", {
    views: [{ showGridLines: true, state: "frozen", ySplit: 1 }],
  });

  const filaEncInv = hojaInv.getRow(1);
  filaEncInv.values = [
    "SKU Variante",
    "Producto",
    "Categoria",
    "Marca",
    "Talle",
    "Color",
    "Stock Actual",
    "Estado de Stock",
    "Costo Compra ($)",
    "Precio Venta ($)",
    "Margen Unitario ($)",
    "Margen (%)",
    "Valuacion Costo ($)",
    "Valuacion Venta ($)",
  ];
  estilizarEncabezado(filaEncInv, COLOR_PRIMARIO);

  const variantesCompletas = await prisma.varianteProducto.findMany({
    orderBy: [{ producto: { nombre: "asc" } }, { talle: "asc" }],
    include: {
      producto: {
        include: {
          categoria: true,
          marca: true,
        },
      },
    },
  });

  let numFilaInv = 2;
  for (const v of variantesCompletas) {
    const f = hojaInv.getRow(numFilaInv);
    const costo = Number(v.producto.costoCompra);
    const venta = Number(v.producto.precioVenta);
    const margen = venta - costo;
    const margenPct = venta > 0 ? margen / venta : 0;
    const valCosto = costo * v.stockActual;
    const valVenta = venta * v.stockActual;

    let estadoStock = "Normal";
    if (v.stockActual === 0) {
      estadoStock = "Sin Stock (RF-09)";
    } else if (v.stockActual <= 10) {
      estadoStock = "Stock Critico (RN-09)";
    }

    f.getCell(1).value = v.sku;
    f.getCell(2).value = v.producto.nombre;
    f.getCell(3).value = v.producto.categoria.nombre;
    f.getCell(4).value = v.producto.marca.nombre;
    f.getCell(5).value = v.talle;
    f.getCell(6).value = v.color;
    f.getCell(7).value = v.stockActual;
    f.getCell(7).numFmt = "#,##0";
    f.getCell(8).value = estadoStock;
    f.getCell(9).value = costo;
    f.getCell(9).numFmt = '"$"#,##0.00';
    f.getCell(10).value = venta;
    f.getCell(10).numFmt = '"$"#,##0.00';
    f.getCell(11).value = margen;
    f.getCell(11).numFmt = '"$"#,##0.00';
    f.getCell(12).value = margenPct;
    f.getCell(12).numFmt = "0.0%";
    f.getCell(13).value = valCosto;
    f.getCell(13).numFmt = '"$"#,##0.00';
    f.getCell(14).value = valVenta;
    f.getCell(14).numFmt = '"$"#,##0.00';

    if (v.stockActual === 0) {
      f.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ALERTA_ROJA } };
    } else if (v.stockActual <= 10) {
      f.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ALERTA_AMARILLA } };
    } else if (numFilaInv % 2 === 0) {
      for (let col = 1; col <= 14; col++) {
        f.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR_ZEBRA } };
      }
    }

    for (let col = 1; col <= 14; col++) aplicarBordes(f.getCell(col));
    numFilaInv++;
  }

  if (variantesCompletas.length > 0) {
    const fTotInv = hojaInv.getRow(numFilaInv);
    fTotInv.getCell(1).value = "TOTALES";
    fTotInv.getCell(7).value = { formula: `SUM(G2:G${numFilaInv - 1})` };
    fTotInv.getCell(7).numFmt = "#,##0";
    fTotInv.getCell(13).value = { formula: `SUM(M2:M${numFilaInv - 1})` };
    fTotInv.getCell(13).numFmt = '"$"#,##0.00';
    fTotInv.getCell(14).value = { formula: `SUM(N2:N${numFilaInv - 1})` };
    fTotInv.getCell(14).numFmt = '"$"#,##0.00';
    fTotInv.font = { bold: true };
    for (let col = 1; col <= 14; col++) {
      fTotInv.getCell(col).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };
      aplicarBordes(fTotInv.getCell(col));
    }
  }

  ajustarAnchoColumnas(hojaInv, 12, 45);

  return await workbook.xlsx.writeBuffer();
}

