import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireCliente } from "@/lib/permissions";
import { resolverComprador } from "@/modules/carrito/services/carrito";
import { obtenerPedidoConfirmado } from "@/modules/checkout/services/checkout";
import { formatoPrecio } from "@/modules/catalogo/productos";

type Props = {
  params: Promise<{ numeroOrden: string }>;
};

export const metadata: Metadata = { title: "Pedido · Sneaker" };

const ETIQUETAS_ESTADO: Record<string, { titulo: string; detalle: string; clase: string }> = {
  CONFIRMADO: {
    titulo: "¡Pedido confirmado!",
    detalle: "Tu pago fue aprobado. Ya estamos preparando tu envío: te avisaremos por correo.",
    clase: "border-green-700 bg-[#F0FFF4] text-green-700",
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
    detalle: "El pedido fue cancelado. Si tenés alguna duda, escribinos.",
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
export default async function PedidoPage({ params }: Props) {
  const { numeroOrden } = await params;
  const sesion = await requireCliente();
  const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
  const pedido = await obtenerPedidoConfirmado(usuarioId, numeroOrden);

  if (!pedido) {
    notFound();
  }

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
        {pedido.estado === "RECHAZADO" && (
          <Link
            href="/carrito/checkout"
            className="mt-2 inline-block text-base font-semibold text-[#CF1A1F] underline"
          >
            Reintentar el pago
          </Link>
        )}
      </div>

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

      <Link href="/catalogo" className="self-start text-base font-semibold text-[#CF1A1F] underline">
        Seguir comprando
      </Link>
    </div>
  );
}
