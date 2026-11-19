import type { Metadata } from "next";
import Link from "next/link";
import { EstadoPedido } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/permissions";
import { formatoPrecio } from "@/modules/catalogo/productos";
import {
  FiltrosEstadisticas,
  obtenerEstadisticasCompletas,
} from "@/modules/reportes/services/estadisticas";

export const metadata: Metadata = {
  title: "Reportes y Estadísticas · Admin Sneaker",
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  desde?: string;
  hasta?: string;
  estado?: string;
}>;

const ESTADOS_DISPONIBLES: { valor: EstadoPedido | "TODOS"; etiqueta: string }[] = [
  { valor: "TODOS", etiqueta: "Todos los estados" },
  { valor: "RECIBIDO", etiqueta: "Recibidos (Completados)" },
  { valor: "EN_CAMINO", etiqueta: "En camino" },
  { valor: "PREPARANDO", etiqueta: "Preparando" },
  { valor: "CONFIRMADO", etiqueta: "Confirmados" },
  { valor: "CANCELADO", etiqueta: "Cancelados" },
  { valor: "RECHAZADO", etiqueta: "Rechazados" },
];

export default async function AdminReportesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();

  const params = await searchParams;
  const desdeStr = params.desde?.trim() || "";
  const hastaStr = params.hasta?.trim() || "";
  const estadoStr = params.estado?.trim() || "TODOS";

  let desde: Date | undefined = undefined;
  let hasta: Date | undefined = undefined;

  if (desdeStr) {
    const d = new Date(desdeStr);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      desde = d;
    }
  }

  if (hastaStr) {
    const h = new Date(hastaStr);
    if (!isNaN(h.getTime())) {
      h.setHours(23, 59, 59, 999);
      hasta = h;
    }
  }

  const estadoFiltro = ESTADOS_DISPONIBLES.some((e) => e.valor === estadoStr)
    ? (estadoStr as EstadoPedido | "TODOS")
    : "TODOS";

  const filtros: FiltrosEstadisticas = {
    desde,
    hasta,
    estado: estadoFiltro,
  };

  const stats = await obtenerEstadisticasCompletas(filtros);

  // Armar URL para descargar Excel con los mismos filtros
  const queryExcel = new URLSearchParams();
  if (desdeStr) queryExcel.set("desde", desdeStr);
  if (hastaStr) queryExcel.set("hasta", hastaStr);
  if (estadoFiltro !== "TODOS") queryExcel.set("estado", estadoFiltro);
  const enlaceExcel = `/api/admin/reportes/excel${queryExcel.toString() ? `?${queryExcel.toString()}` : ""}`;

  const tasaEfectividad =
    stats.kpis.totalPedidos > 0
      ? Math.round(
          ((stats.kpis.totalPedidos - stats.kpis.pedidosCancelados) /
            stats.kpis.totalPedidos) *
            100,
        )
      : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Encabezado y Acciones Principales */}
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E5E5E5] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#CF1A1F]" />
            <p className="text-xs font-semibold uppercase tracking-wider text-[#CF1A1F]">
              Administración · Inteligencia de Negocio
            </p>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-[#2C2C2C]">
            Reportes y Estadísticas de Ventas
          </h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            Métricas de comercialización, inventario, ranking de clientes y
            exportación administrativa (RF-47 / RF-48 / RNF-05).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={enlaceExcel}
            download
            className="flex items-center gap-2 rounded-md bg-[#1D6F42] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#155431]"
            title="Descargar libro con 5 hojas detalladas en formato .xlsx"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Exportar a Excel (.xlsx)
          </a>
        </div>
      </header>

      {/* Barra de Filtros */}
      <section
        aria-labelledby="titulo-filtros"
        className="rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-4"
      >
        <h2 id="titulo-filtros" className="sr-only">
          Filtros de consulta
        </h2>
        <form
          action="/admin/reportes"
          method="GET"
          className="flex flex-wrap items-end gap-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-desde" className="text-xs font-semibold text-[#4B5563]">
              Fecha Desde:
            </label>
            <input
              id="filtro-desde"
              type="date"
              name="desde"
              defaultValue={desdeStr}
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm text-[#111827] focus:border-[#CF1A1F] focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-hasta" className="text-xs font-semibold text-[#4B5563]">
              Fecha Hasta:
            </label>
            <input
              id="filtro-hasta"
              type="date"
              name="hasta"
              defaultValue={hastaStr}
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm text-[#111827] focus:border-[#CF1A1F] focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filtro-estado" className="text-xs font-semibold text-[#4B5563]">
              Estado del Pedido:
            </label>
            <select
              id="filtro-estado"
              name="estado"
              defaultValue={estadoFiltro}
              className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm text-[#111827] focus:border-[#CF1A1F] focus:outline-none"
            >
              {ESTADOS_DISPONIBLES.map((e) => (
                <option key={e.valor} value={e.valor}>
                  {e.etiqueta}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="rounded-md bg-[#CF1A1F] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#b0161a]"
            >
              Aplicar Filtros
            </button>
            {(desdeStr || hastaStr || estadoFiltro !== "TODOS") && (
              <Link
                href="/admin/reportes"
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-1.5 text-sm font-medium text-[#4B5563] transition hover:bg-gray-100"
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>
      </section>

      {/* Tarjetas de Indicadores Principales (KPIs) */}
      <section aria-labelledby="titulo-kpis" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <h2 id="titulo-kpis" className="sr-only">
          Indicadores clave
        </h2>

        {/* Facturacion Neta */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Recaudación Neta
            </span>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Ventas
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#111827]">
            {formatoPrecio(stats.kpis.facturacionNeta)}
          </p>
          <div className="mt-2 flex flex-col gap-0.5 text-xs text-[#6B6B6B]">
            <span>Bruto: {formatoPrecio(stats.kpis.facturacionBruta)}</span>
            <span>Descuentos: -{formatoPrecio(stats.kpis.totalDescuentos)}</span>
            <span>Envíos: +{formatoPrecio(stats.kpis.totalEnvios)}</span>
          </div>
        </div>

        {/* Volumen de Pedidos */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Pedidos y Efectividad
            </span>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              {tasaEfectividad}% efectividad
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#111827]">
            {stats.kpis.totalPedidos}{" "}
            <span className="text-sm font-normal text-[#6B6B6B]">órdenes</span>
          </p>
          <div className="mt-2 flex flex-col gap-0.5 text-xs text-[#6B6B6B]">
            <span>Recibidos: {stats.kpis.pedidosCompletados}</span>
            <span>Cancelados/Rechazados: {stats.kpis.pedidosCancelados}</span>
            <span>Unidades vendidas: {stats.kpis.unidadesVendidasTotales}</span>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Ticket Promedio
            </span>
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
              Por compra
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#111827]">
            {formatoPrecio(Math.round(stats.kpis.ticketPromedio))}
          </p>
          <div className="mt-2 text-xs text-[#6B6B6B]">
            <span>
              Promedio neto de gasto por cliente en órdenes válidas.
            </span>
          </div>
        </div>

        {/* Valuacion del Inventario */}
        <div className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#6B6B6B]">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Valuación Inventario
            </span>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
              Margen ~{Math.round(stats.inventario.margenPotencial)}%
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#111827]">
            {formatoPrecio(stats.inventario.valorizacionVenta)}
          </p>
          <div className="mt-2 flex flex-col gap-0.5 text-xs text-[#6B6B6B]">
            <span>Costo compra: {formatoPrecio(stats.inventario.valorizacionCosto)}</span>
            <span>Stock físico: {stats.inventario.unidadesEnStock} unidades</span>
            <span>Variantes críticas: {stats.inventario.variantesStockBajo} (RN-09)</span>
          </div>
        </div>
      </section>

      {/* Seccion 1: Top Productos Vendidos y Ventas por Categoria */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Productos (2 columnas) */}
        <section
          aria-labelledby="titulo-top-productos"
          className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs lg:col-span-2"
        >
          <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3">
            <div>
              <h2 id="titulo-top-productos" className="text-base font-bold text-[#2C2C2C]">
                Top Productos Más Vendidos
              </h2>
              <p className="text-xs text-[#6B6B6B]">
                Ranking según recaudación total y unidades despachadas (RF-47).
              </p>
            </div>
            <span className="text-xs font-semibold text-[#CF1A1F]">
              {stats.topProductos.length} productos con ventas
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E5E5] text-xs font-semibold uppercase text-[#6B6B6B]">
                <tr>
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-3">Producto</th>
                  <th className="py-2 pr-3">Categoría / Marca</th>
                  <th className="py-2 pr-3 text-right">Unidades</th>
                  <th className="py-2 text-right">Recaudación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {stats.topProductos.slice(0, 7).map((prod, idx) => (
                  <tr key={prod.sku} className="hover:bg-[#F9FAFB]">
                    <td className="py-2.5 pr-2 font-mono text-xs font-bold text-[#6B6B6B]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 pr-3">
                      <p className="font-semibold text-[#111827]">{prod.nombre}</p>
                      <p className="text-xs text-[#6B6B6B] font-mono">{prod.sku}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-[#4B5563]">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5">{prod.categoria}</span>{" "}
                      <span className="text-gray-400">·</span> {prod.marca}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-[#111827]">
                      {prod.unidadesVendidas}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-[#111827]">
                      {formatoPrecio(prod.facturacionTotal)}
                    </td>
                  </tr>
                ))}
                {stats.topProductos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-[#6B6B6B]">
                      No hay registros de ventas para el período seleccionado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Desglose por Categoria y Marca (1 columna) */}
        <section
          aria-labelledby="titulo-categorias"
          className="flex flex-col gap-6 rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs"
        >
          <div>
            <h2 id="titulo-categorias" className="text-base font-bold text-[#2C2C2C]">
              Ventas por Categoría
            </h2>
            <p className="text-xs text-[#6B6B6B]">
              Distribución de recaudación por rubro del catálogo.
            </p>

            <div className="mt-4 flex flex-col gap-3">
              {stats.ventasPorCategoria.slice(0, 5).map((cat) => (
                <div key={cat.categoria} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#2C2C2C]">{cat.categoria}</span>
                    <span className="font-semibold text-[#111827]">
                      {formatoPrecio(cat.facturacion)} ({Math.round(cat.porcentaje)}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#CF1A1F]"
                      style={{ width: `${Math.min(100, Math.max(5, cat.porcentaje))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#F0F0F0] pt-4">
            <h3 className="text-sm font-bold text-[#2C2C2C]">Top Marcas</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.ventasPorMarca.slice(0, 6).map((m) => (
                <span
                  key={m.marca}
                  className="inline-flex items-center gap-1 rounded-md border border-[#E5E5E5] bg-[#F9FAFB] px-2.5 py-1 text-xs text-[#4B5563]"
                >
                  <strong className="text-[#111827]">{m.marca}:</strong> {m.unidades} u. (
                  {formatoPrecio(m.facturacion)})
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Seccion 2: Ranking de Clientes y Distribucion Geografica */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ranking de Clientes */}
        <section
          aria-labelledby="titulo-ranking-clientes"
          className="rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs"
        >
          <div className="flex items-center justify-between border-b border-[#F0F0F0] pb-3">
            <div>
              <h2 id="titulo-ranking-clientes" className="text-base font-bold text-[#2C2C2C]">
                Ranking de Clientes (RF-47)
              </h2>
              <p className="text-xs text-[#6B6B6B]">
                Clientes más frecuentes ordenados por volumen total invertido.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#111827]">
              {stats.rankingClientes.length} compradores
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[#E5E5E5] text-xs font-semibold uppercase text-[#6B6B6B]">
                <tr>
                  <th className="py-2 pr-2">Cliente</th>
                  <th className="py-2 pr-2">Ubicación</th>
                  <th className="py-2 pr-2 text-center">Pedidos</th>
                  <th className="py-2 text-right">Gasto Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {stats.rankingClientes.slice(0, 6).map((c) => (
                  <tr key={c.clienteId} className="hover:bg-[#F9FAFB]">
                    <td className="py-2.5 pr-2">
                      <p className="font-semibold text-[#111827]">{c.nombreCompleto}</p>
                      <p className="text-xs text-[#6B6B6B]">{c.correo}</p>
                    </td>
                    <td className="py-2.5 pr-2 text-xs text-[#4B5563]">
                      {c.ciudad}, {c.provincia}
                    </td>
                    <td className="py-2.5 pr-2 text-center font-medium tabular-nums text-[#111827]">
                      {c.totalPedidos}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-[#111827]">
                      {formatoPrecio(c.totalGastado)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Distribucion Geografica y Estados */}
        <section
          aria-labelledby="titulo-logistica"
          className="flex flex-col gap-5 rounded-lg border border-[#E5E5E5] bg-white p-5 shadow-xs"
        >
          <div>
            <h2 id="titulo-logistica" className="text-base font-bold text-[#2C2C2C]">
              Envíos por Provincia (RF-45)
            </h2>
            <p className="text-xs text-[#6B6B6B]">
              Destinos con mayor volumen de órdenes y tarifas logísticas aplicadas.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {stats.ventasPorProvincia.slice(0, 6).map((prov) => (
                <div
                  key={prov.provincia}
                  className="flex items-center justify-between rounded-md border border-[#E5E5E5] bg-[#F9FAFB] p-2"
                >
                  <span className="font-medium text-[#2C2C2C] truncate max-w-[130px]">
                    {prov.provincia}
                  </span>
                  <span className="font-bold text-[#111827] tabular-nums">
                    {prov.pedidos} ped. ({formatoPrecio(prov.recaudacion)})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-[#F0F0F0] pt-4">
            <h3 className="text-sm font-bold text-[#2C2C2C]">Estados de Órdenes</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.distribucionEstados.map((est) => (
                <span
                  key={est.estado}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
                >
                  <span className="font-semibold">{est.estado}:</span> {est.cantidad} (
                  {formatoPrecio(est.monto)})
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Seccion 3: Alertas de Inventario */}
      <section
        aria-labelledby="titulo-alertas-inventario"
        className="rounded-lg border border-amber-200 bg-amber-50/50 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="titulo-alertas-inventario" className="text-sm font-bold text-amber-900">
              Monitoreo y Alertas de Inventario
            </h2>
            <p className="text-xs text-amber-700">
              Cumplimiento de reglas de negocio RN-09 (alerta de stock crítico ≤ 10 unidades) y RF-09 (productos agotados).
            </p>
          </div>
          <div className="flex gap-4">
            <div className="rounded-md bg-white px-3 py-1.5 border border-amber-300 shadow-xs">
              <span className="text-xs text-amber-800">Stock crítico: </span>
              <strong className="text-sm font-bold text-amber-900">
                {stats.inventario.variantesStockBajo} variantes
              </strong>
            </div>
            <div className="rounded-md bg-white px-3 py-1.5 border border-red-300 shadow-xs">
              <span className="text-xs text-red-800">Agotadas: </span>
              <strong className="text-sm font-bold text-red-900">
                {stats.inventario.variantesSinStock} variantes
              </strong>
            </div>
            <Link
              href="/admin/variantes"
              className="inline-flex items-center rounded-md bg-[#CF1A1F] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#b0161a]"
            >
              Gestionar Stock &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

