import type { Metadata } from "next";
import Link from "next/link";
import type { EstadoPedido } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/permissions";
import { formatoPrecio } from "@/modules/catalogo/productos";
import {
  BarraProgresoPedido,
  SelectorEstadoPedidoAdmin,
} from "@/modules/pedidos/components/pedidos-ui";
import {
  asegurarPedidosDemostracion,
  ETIQUETA_ESTADO_PEDIDO,
  listarPedidosAdmin,
} from "@/modules/pedidos/services/pedidos";

export const metadata: Metadata = {
  title: "Gestión de Pedidos y Envíos · Admin Sneaker",
};

const FILTROS_ESTADO: { valor: EstadoPedido | "TODOS"; etiqueta: string }[] = [
  { valor: "TODOS", etiqueta: "Todos" },
  { valor: "CONFIRMADO", etiqueta: "Confirmado" },
  { valor: "PREPARANDO", etiqueta: "Preparando" },
  { valor: "EN_CAMINO", etiqueta: "En camino" },
  { valor: "RECIBIDO", etiqueta: "Recibido" },
  { valor: "PENDIENTE", etiqueta: "Pendientes" },
  { valor: "CANCELADO", etiqueta: "Cancelados" },
  { valor: "RECHAZADO", etiqueta: "Rechazados" },
];

type SearchParams = Promise<{
  estado?: string;
  q?: string;
}>;

/**
 * Panel administrativo de gestion de pedidos y actualizacion manual de estados
 * (Sprint 4 - Abril Poggio. RF-30, RF-31, RF-37, RF-46, CU12, RNF-08).
 */
export default async function AdminPedidosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  await asegurarPedidosDemostracion().catch(() => {});

  const params = await searchParams;
  const estadoSeleccionado = FILTROS_ESTADO.some((f) => f.valor === params.estado)
    ? (params.estado as EstadoPedido | "TODOS")
    : "TODOS";
  const busqueda = params.q?.trim() ?? "";

  const { pedidos, conteos } = await listarPedidosAdmin({
    estado: estadoSeleccionado,
    busqueda,
  });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E5E5E5] pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#CF1A1F]">
            Administración · Ventas y Despacho
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[#2C2C2C]">
            Gestión de Pedidos y Estados de Envío
          </h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            Consultá las órdenes de compra y actualizá manualmente el avance del envío
            (Confirmado, Preparando, En camino, Recibido).
          </p>
        </div>

        <form action="/admin/pedidos" method="GET" className="flex items-center gap-2">
          {estadoSeleccionado !== "TODOS" && (
            <input type="hidden" name="estado" value={estadoSeleccionado} />
          )}
          <input
            type="search"
            name="q"
            defaultValue={busqueda}
            placeholder="Buscar por N° orden o cliente..."
            className="h-10 w-64 rounded-[5px] border border-[#D9D9D9] bg-white px-3 text-sm text-[#2C2C2C] placeholder:text-[#9E9E9E] focus:border-[#CF1A1F] focus:outline-none"
          />
          <button
            type="submit"
            className="h-10 rounded-[5px] bg-[#2C2C2C] px-4 text-sm font-semibold text-white transition-colors hover:bg-black"
          >
            Buscar
          </button>
          {(busqueda || estadoSeleccionado !== "TODOS") && (
            <Link
              href="/admin/pedidos"
              className="text-xs font-semibold text-[#CF1A1F] underline"
            >
              Limpiar
            </Link>
          )}
        </form>
      </header>

      {/* Filtros rapidos por estado con contadores */}
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {FILTROS_ESTADO.map((filtro) => {
          const activo = estadoSeleccionado === filtro.valor;
          const cantidad = conteos[filtro.valor] ?? 0;
          const href =
            filtro.valor === "TODOS"
              ? busqueda
                ? `/admin/pedidos?q=${encodeURIComponent(busqueda)}`
                : "/admin/pedidos"
              : busqueda
                ? `/admin/pedidos?estado=${filtro.valor}&q=${encodeURIComponent(busqueda)}`
                : `/admin/pedidos?estado=${filtro.valor}`;

          return (
            <Link
              key={filtro.valor}
              href={href}
              className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activo
                  ? "border-[#CF1A1F] bg-[#CF1A1F] text-white"
                  : "border-[#D9D9D9] bg-white text-[#4E4E4E] hover:border-[#2C2C2C]"
              }`}
            >
              <span>{filtro.etiqueta}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] tabular-nums ${
                  activo ? "bg-white/20 text-white" : "bg-[#F2F2F2] text-[#4E4E4E]"
                }`}
              >
                {cantidad}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Listado de ordenes */}
      {pedidos.length === 0 ? (
        <div className="rounded-[7px] border border-[#E5E5E5] bg-[#FAFAFA] p-10 text-center">
          <p className="text-base font-semibold text-[#2C2C2C]">
            No se encontraron pedidos con los filtros seleccionados.
          </p>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            Cuando un cliente confirme una compra desde el checkout, aparecerá automáticamente acá.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pedidos.map((pedido) => {
            const infoEstado = ETIQUETA_ESTADO_PEDIDO[pedido.estado];
            const envio = (pedido.datosEnvio ?? {}) as {
              destinatario?: string;
              calle?: string;
              numero?: string | number;
              ciudad?: string;
              provincia?: string;
              codigoPostal?: string;
            };

            return (
              <article
                key={pedido.id}
                className="flex flex-col gap-4 rounded-[7px] border border-[#D9D9D9] bg-white p-5 shadow-xs"
              >
                {/* Cabecera de la orden */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EFEFEF] pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-bold text-[#2C2C2C]">
                        {pedido.numeroOrden}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${infoEstado.badgeClase}`}
                      >
                        {infoEstado.nombre}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6B6B6B]">
                      Fecha:{" "}
                      {new Date(pedido.fechaCreacion).toLocaleString("es-AR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}{" "}
                      · Cliente:{" "}
                      <span className="font-semibold text-[#2C2C2C]">
                        {pedido.cliente.nombre} {pedido.cliente.apellido}
                      </span>{" "}
                      ({pedido.cliente.usuario.correo})
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-[#6B6B6B]">
                      Total abonado
                    </p>
                    <p className="text-xl font-bold tabular-nums text-[#2C2C2C]">
                      {formatoPrecio(Number(pedido.montoTotal))}
                    </p>
                    <p className="text-xs text-[#6B6B6B]">
                      Subtotal {formatoPrecio(Number(pedido.montoSubtotal))}
                      {Number(pedido.descuentoTotal) > 0 &&
                        ` · Desc. -${formatoPrecio(Number(pedido.descuentoTotal))}`}{" "}
                      · Envío {formatoPrecio(Number(pedido.costoEnvio))}
                    </p>
                  </div>
                </div>

                {/* Barra visual de avance de despacho (RF-30) */}
                <BarraProgresoPedido estado={pedido.estado} />

                {/* Detalle de items y direccion de entrega */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[5px] bg-[#FAFAFA] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">
                      Artículos ({pedido.items.length})
                    </p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {pedido.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <div>
                            <span className="font-semibold text-[#2C2C2C]">
                              {item.cantidad}x {item.nombreProductoSnapshot}
                            </span>
                            <span className="ml-1.5 text-xs text-[#6B6B6B]">
                              (
                              {item.varianteProducto
                                ? `${item.varianteProducto.talle} · ${item.varianteProducto.color}`
                                : "Kit"}
                              )
                            </span>
                          </div>
                          <span className="font-medium tabular-nums text-[#2C2C2C]">
                            {formatoPrecio(Number(item.subtotal))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-[5px] bg-[#FAFAFA] p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">
                      Destino de envío y pago
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#2C2C2C]">
                      {envio.destinatario ?? `${pedido.cliente.nombre} ${pedido.cliente.apellido}`}
                    </p>
                    <p className="text-sm text-[#4E4E4E]">
                      {envio.calle} {envio.numero}, {envio.ciudad} ({envio.provincia})
                      {envio.codigoPostal ? ` · CP ${envio.codigoPostal}` : ""}
                    </p>
                    <p className="mt-1.5 text-xs text-[#6B6B6B]">
                      Medio de pago:{" "}
                      <span className="font-semibold text-[#2C2C2C]">
                        {pedido.metodoPago ?? "No especificado"}
                      </span>
                      {pedido.pagoExternoId ? ` (${pedido.pagoExternoId})` : ""}
                      {pedido.cupon ? ` · Cupón ${pedido.cupon.codigo}` : ""}
                    </p>
                  </div>
                </div>

                {/* Controles administrativos para cambiar estado */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#EFEFEF] pt-3">
                  <p className="text-xs text-[#6B6B6B]">{infoEstado.descripcion}</p>
                  <SelectorEstadoPedidoAdmin
                    pedidoId={pedido.id}
                    estadoActual={pedido.estado}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
