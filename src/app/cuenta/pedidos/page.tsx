import type { Metadata } from "next";
import Link from "next/link";
import { mercadoPagoHabilitado } from "@/lib/env";
import { requireCliente } from "@/lib/permissions";
import { resolverComprador } from "@/modules/carrito/services/carrito";
import { formatoPrecio } from "@/modules/catalogo/productos";
import {
  BarraProgresoPedido,
  BotonRepetirCompra,
} from "@/modules/pedidos/components/pedidos-ui";
import {
  ETIQUETA_ESTADO_PEDIDO,
  listarPedidosCliente,
} from "@/modules/pedidos/services/pedidos";

export const metadata: Metadata = {
  title: "Mis Pedidos · Sneaker",
};

/**
 * Historial de compras y seguimiento de estados del cliente
 * (Sprint 4 - Abril Poggio. RF-30, RF-32, RF-33, CU10, CU11).
 */
export default async function CuentaPedidosPage() {
  const sesion = await requireCliente();
  const clienteId = await resolverComprador(sesion.user.id, sesion.user.email);
  const pedidos = await listarPedidosCliente(clienteId);
  const mpActivo = mercadoPagoHabilitado();

  return (
    <div className="mx-auto flex w-full max-w-[1170px] flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/cuenta"
            className="text-xs font-semibold uppercase tracking-wide text-[#CF1A1F] hover:underline"
          >
            ← Volver a Mi Perfil
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-[#2C2C2C]">
            Mis Pedidos e Historial de Compras
          </h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">
            Consultá el estado de envío de tus pedidos o repetí una compra anterior.
          </p>
        </div>
      </header>

      {pedidos.length === 0 ? (
        <section className="flex flex-col items-center justify-center gap-3 rounded-[7px] bg-[#FAFAFA] p-12 text-center">
          <p className="text-base font-semibold text-[#2C2C2C]">
            Todavía no registrás compras en tu historial.
          </p>
          <p className="text-sm text-[#6B6B6B]">
            Explorá el catálogo para elegir tus próximas zapatillas.
          </p>
          <Link
            href="/catalogo"
            className="mt-2 inline-flex h-10 items-center rounded-[5px] bg-[#CF1A1F] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#A61217]"
          >
            Ir al catálogo
          </Link>
        </section>
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
            };
            const urlRetomarPago =
              pedido.estado === "PENDIENTE" && mpActivo && pedido.preferenciaId
                ? `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${encodeURIComponent(pedido.preferenciaId)}`
                : null;

            return (
              <article
                key={pedido.id}
                className="flex flex-col gap-4 rounded-[7px] border border-[#D9D9D9] bg-white p-5 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#EFEFEF] pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/pedido/${pedido.numeroOrden}`}
                        className="text-lg font-bold text-[#2C2C2C] hover:text-[#CF1A1F] hover:underline"
                      >
                        Pedido {pedido.numeroOrden}
                      </Link>
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${infoEstado.badgeClase}`}
                      >
                        {infoEstado.nombre}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#6B6B6B]">
                      Realizado el{" "}
                      {new Date(pedido.fechaCreacion).toLocaleDateString("es-AR", {
                        dateStyle: "long",
                      })}
                      {envio.ciudad ? ` · Destino: ${envio.ciudad} (${envio.provincia})` : ""}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-[#6B6B6B]">Total</p>
                    <p className="text-xl font-bold tabular-nums text-[#2C2C2C]">
                      {formatoPrecio(Number(pedido.montoTotal))}
                    </p>
                  </div>
                </div>

                {/* Progreso de despacho (Confirmado -> Preparando -> En camino -> Recibido) */}
                <BarraProgresoPedido estado={pedido.estado} />

                <ul className="flex flex-col gap-2 rounded-[5px] bg-[#FAFAFA] p-3">
                  {pedido.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <div>
                        <span className="font-semibold text-[#2C2C2C]">
                          {item.cantidad}x {item.nombreProductoSnapshot}
                        </span>
                        <span className="ml-2 text-xs text-[#6B6B6B]">
                          {item.varianteProducto
                            ? `Talle ${item.varianteProducto.talle} · ${item.varianteProducto.color}`
                            : "Kit"}
                        </span>
                      </div>
                      <span className="font-medium tabular-nums text-[#2C2C2C]">
                        {formatoPrecio(Number(item.subtotal))}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#EFEFEF] pt-3">
                  <Link
                    href={`/pedido/${pedido.numeroOrden}`}
                    className="text-sm font-semibold text-[#CF1A1F] hover:underline"
                  >
                    Ver comprobante completo →
                  </Link>

                  <div className="flex flex-wrap items-center gap-3">
                    {pedido.estado === "PENDIENTE" &&
                      (urlRetomarPago ? (
                        <a
                          href={urlRetomarPago}
                          className="inline-flex h-10 items-center rounded-[5px] bg-[#009EE3] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0082BD]"
                        >
                          Completar pago en Mercado Pago →
                        </a>
                      ) : (
                        <Link
                          href="/carrito/checkout"
                          className="inline-flex h-10 items-center rounded-[5px] bg-[#009EE3] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0082BD]"
                        >
                          Completar pago en Mercado Pago →
                        </Link>
                      ))}
                    <BotonRepetirCompra pedidoId={pedido.id} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
