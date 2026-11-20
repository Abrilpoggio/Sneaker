import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { mercadoPagoHabilitado } from "@/lib/env";
import { requireCliente } from "@/lib/permissions";
import { enlacesReclamoPedido } from "@/lib/soporte";
import { resolverComprador } from "@/modules/carrito/services/carrito";
import { obtenerPedidoConfirmado } from "@/modules/checkout/services/checkout";
import { procesarWebhookPago } from "@/modules/checkout/services/pagos";
import {
  construirCorreoActualizacionEstado,
  obtenerPedidoParaCorreo,
} from "@/modules/emails/services/correo";
import { formatoPrecio } from "@/modules/catalogo/productos";
import {
  BarraProgresoPedido,
  BotonRepetirCompra,
  PanelComprobanteYCorreoPedido,
} from "@/modules/pedidos/components/pedidos-ui";

type Props = {
  params: Promise<{ numeroOrden: string }>;
  searchParams: Promise<{ payment_id?: string; collection_id?: string }>;
};

export const metadata: Metadata = { title: "Pedido · Sneaker" };

const ETIQUETAS_ESTADO: Record<string, { titulo: string; detalle: string; clase: string }> = {
  CONFIRMADO: {
    titulo: "¡Pedido confirmado!",
    detalle: "Tu pago fue aprobado. Ya estamos preparando tu envío: te enviamos el comprobante por correo.",
    clase: "border-green-700 bg-[#F0FFF4] text-green-700",
  },
  PREPARANDO: {
    titulo: "Preparando tu pedido",
    detalle: "Nuestro depósito ya está armando y embalando tu orden para despacharla. Te enviamos un correo con esta actualización.",
    clase: "border-blue-700 bg-blue-50 text-blue-800",
  },
  EN_CAMINO: {
    titulo: "¡Tu pedido está en camino!",
    detalle: "El paquete ya salió hacia la dirección de entrega indicada. Te enviamos un correo con el aviso de despacho.",
    clase: "border-indigo-700 bg-indigo-50 text-indigo-800",
  },
  RECIBIDO: {
    titulo: "Pedido recibido",
    detalle: "El envío fue entregado en el domicilio de destino. ¡Gracias por elegir Sneaker!",
    clase: "border-green-800 bg-green-100 text-green-900",
  },
  PENDIENTE: {
    titulo: "Pago en curso",
    detalle:
      "El pedido quedó registrado y esperamos la confirmación de Mercado Pago. Esta página se actualiza al confirmarse el pago.",
    clase: "border-[#D9A800] bg-[#FFFBE6] text-[#8A6D00]",
  },
  RECHAZADO: {
    titulo: "Pago rechazado",
    detalle:
      "El pago no pudo procesarse. Tu carrito quedó intacto: podés reintentar el pago cuando quieras.",
    clase: "border-[#CF1A1F] bg-[#FFCDD2] text-[#7C0300]",
  },
  CANCELADO: {
    titulo: "Pedido cancelado",
    detalle: "El pedido fue cancelado y te enviamos la constancia por correo. Si tenés alguna duda, escribinos.",
    clase: "border-[#9E9E9E] bg-[#F5F5F5] text-[#4E4E4E]",
  },
};

/**
 * Confirmacion y seguimiento del pedido (Sprint 3 - Camila Viegas.
 * RF-27, RF-25).
 *
 * El pedido es visible unicamente para su comprador (control de
 * propiedad en el servicio). El estado RECHAZADO conserva el carrito:
 * se reingresa al checkout para reintentar el pago.
 */
export default async function PedidoPage({ params, searchParams }: Props) {
  const [{ numeroOrden }, query] = await Promise.all([params, searchParams]);
  const sesion = await requireCliente();
  const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);

  // Si el comprador vuelve desde Mercado Pago real con payment_id/collection_id,
  // verificamos el pago contra la API de MP de inmediato (idempotente) sin esperar al webhook.
  const pagoIdRetorno = query.payment_id ?? query.collection_id;
  if (pagoIdRetorno && pagoIdRetorno !== "null" && mercadoPagoHabilitado()) {
    try {
      await procesarWebhookPago(pagoIdRetorno);
    } catch (error) {
      console.error(
        `[mercadopago] No se pudo verificar el retorno del pago ${pagoIdRetorno}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  const [pedido, pedidoCorreo] = await Promise.all([
    obtenerPedidoConfirmado(usuarioId, numeroOrden),
    obtenerPedidoParaCorreo(numeroOrden),
  ]);

  if (!pedido) {
    notFound();
  }

  const infoCorreo = pedidoCorreo ? construirCorreoActualizacionEstado(pedidoCorreo) : null;
  const correoCliente =
    pedidoCorreo?.cliente.usuario.correo ?? sesion.user.email ?? "cliente@sneaker.test";

  const etiqueta = ETIQUETAS_ESTADO[pedido.estado] ?? {
    titulo: `Pedido ${pedido.estado.toLowerCase()}`,
    detalle: "",
    clase: "border-[#D9D9D9] bg-[#FAFAFA] text-[#2C2C2C]",
  };

  const envio = pedido.datosEnvio as {
    destinatario?: string;
    calle?: string;
    numero?: string | number;
    ciudad?: string;
    provincia?: string;
    codigoPostal?: string;
  };
  const canalesReclamo = enlacesReclamoPedido(
    pedido.numeroOrden,
    formatoPrecio(Number(pedido.montoTotal)),
  );

  return (
    <div className="mx-auto flex w-full max-w-[1287px] flex-col gap-6 px-4 py-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">Mi cuenta</p>
        <h1 className="mt-1 text-3xl font-bold text-[#2C2C2C]">
          Pedido {pedido.numeroOrden}
        </h1>
        <p className="mt-1 text-base text-[#6B6B6B]">
          Realizado el {new Date(pedido.fechaCreacion).toLocaleDateString("es-AR")}
        </p>
      </header>

      <div className={`rounded-md border px-4 py-3 ${etiqueta.clase}`}>
        <p className="text-lg font-bold leading-[24px]">{etiqueta.titulo}</p>
        <p className="mt-1 text-base font-medium leading-[16px]">{etiqueta.detalle}</p>
        {pedido.estado === "PENDIENTE" &&
          (mercadoPagoHabilitado() && pedido.preferenciaId ? (
            <a
              href={`https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=${encodeURIComponent(pedido.preferenciaId)}`}
              className="mt-3 inline-flex h-10 items-center rounded-[5px] bg-[#009EE3] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0082BD]"
            >
              Completar pago en Mercado Pago →
            </a>
          ) : (
            <Link
              href="/carrito/checkout"
              className="mt-3 inline-flex h-10 items-center rounded-[5px] bg-[#009EE3] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0082BD]"
            >
              Completar pago en Mercado Pago →
            </Link>
          ))}
        {pedido.estado === "RECHAZADO" && (
          <Link
            href={mercadoPagoHabilitado() ? "/carrito/checkout" : "/carrito/checkout/mercadopago"}
            className="mt-2 inline-block text-base font-semibold text-[#CF1A1F] underline"
          >
            Reintentar el pago en Mercado Pago
          </Link>
        )}
      </div>

      <BarraProgresoPedido estado={pedido.estado} />

      {infoCorreo && (
        <PanelComprobanteYCorreoPedido
          correoDestinatario={correoCliente}
          asuntoCorreo={infoCorreo.asunto}
          htmlCorreo={infoCorreo.html}
          estado={pedido.estado}
        />
      )}

      <ul className="flex flex-col gap-3">
        {pedido.items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-4 rounded-md border border-[#D9D9D9] bg-white p-4"
          >
            <div className="min-w-[200px] flex-1">
              <p className="text-lg font-semibold leading-[24px] text-[#2C2C2C]">
                {item.nombreProductoSnapshot}
              </p>
              <p className="text-sm text-[#6B6B6B]">
                {item.varianteProducto
                  ? [item.varianteProducto.talle, item.varianteProducto.color, item.varianteProducto.material]
                      .filter(Boolean)
                      .join(" · ") || "Variante única"
                  : "Kit (descuenta el stock de sus componentes)"}{" "}
                · x{item.cantidad}
              </p>
            </div>
            <p className="text-lg font-semibold tabular-nums text-[#2C2C2C]">
              {formatoPrecio(Number(item.subtotal))}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3 rounded-md border border-[#D9D9D9] bg-[#FAFAFA] p-4">
        <div className="flex justify-between text-base text-[#4E4E4E]">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatoPrecio(Number(pedido.montoSubtotal))}</span>
        </div>
        {pedido.promociones.length > 0 && (
          <div className="flex justify-between text-base text-green-700">
            <span>
              Promociones (
              {[...new Set(pedido.promociones.map((p) => p.promocion.nombre))].join(", ")})
            </span>
            <span className="tabular-nums">
              -
              {formatoPrecio(
                pedido.promociones.reduce((total, p) => total + Number(p.montoDescontado), 0),
              )}
            </span>
          </div>
        )}
        {pedido.cupon && (
          <div className="flex justify-between text-base text-green-700">
            <span>
              Cupón {pedido.cupon.codigo} (-{Number(pedido.cupon.porcentajeDescuento)}%)
            </span>
            <span className="tabular-nums">
              -{formatoPrecio(
                Math.max(
                  Number(pedido.descuentoTotal) -
                    pedido.promociones.reduce((total, p) => total + Number(p.montoDescontado), 0),
                  0,
                ),
              )}
            </span>
          </div>
        )}
        <div className="flex justify-between text-base text-[#4E4E4E]">
          <span>Costo de envío</span>
          <span className="tabular-nums">{formatoPrecio(Number(pedido.costoEnvio))}</span>
        </div>
        <div className="flex justify-between border-t border-[#D9D9D9] pt-3 text-2xl font-bold text-[#2C2C2C]">
          <span>Total</span>
          <span className="tabular-nums">{formatoPrecio(Number(pedido.montoTotal))}</span>
        </div>
      </div>

      <div className="rounded-md border border-[#D9D9D9] bg-white p-4">
        <p className="text-lg font-semibold text-[#2C2C2C]">Envío</p>
        <p className="mt-1 text-base text-[#4E4E4E]">
          {envio.destinatario} · {envio.calle} {envio.numero}, {envio.ciudad} ({envio.provincia})
          {envio.codigoPostal ? ` · CP ${envio.codigoPostal}` : ""}
        </p>
        {pedido.metodoPago && (
          <p className="mt-1 text-sm text-[#9E9E9E]">
            Método de pago: {pedido.metodoPago}
            {pedido.pagoExternoId ? ` · pago ${pedido.pagoExternoId}` : ""}
          </p>
        )}
      </div>

      {/* RF-52 / RN-10: Canal externo para cancelaciones, reclamos o reembolsos */}
      <section
        aria-label="Cancelaciones, reclamos y reembolsos"
        className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-[#E5E5E5] bg-[#FAFAFA] p-4"
      >
        <div className="max-w-xl">
          <p className="text-sm font-bold text-[#2C2C2C]">
            ¿Necesitás cancelar, hacer un reclamo o solicitar un reembolso?
          </p>
          <p className="mt-0.5 text-xs text-[#6B6B6B]">
            Las cancelaciones post-compra, reclamos y devoluciones se gestionan
            directamente con nuestro equipo de atención al cliente indicando tu
            número de orden <strong>#{pedido.numeroOrden}</strong>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={canalesReclamo.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md bg-[#25D366] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            Contactar por WhatsApp
          </a>
          <a
            href={canalesReclamo.correo}
            className="inline-flex items-center justify-center rounded-md border border-[#2C2C2C] bg-white px-4 py-2 text-xs font-semibold text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5]"
          >
            Enviar correo de soporte
          </a>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/cuenta/pedidos" className="text-base font-semibold text-[#2C2C2C] underline">
            ← Mis pedidos
          </Link>
          <Link href="/catalogo" className="text-base font-semibold text-[#CF1A1F] underline">
            Seguir comprando
          </Link>
        </div>
        <BotonRepetirCompra pedidoId={pedido.id} />
      </div>
    </div>
  );
}
