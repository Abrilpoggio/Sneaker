import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireCliente } from "@/lib/permissions";
import { mercadoPagoHabilitado } from "@/lib/env";
import { accionPagar, accionPagarRechazado } from "@/modules/checkout/actions";
import {
  BotonPagoRechazado,
  BotonPagar,
  FormularioCupon,
} from "@/modules/checkout/components/checkout-ui";
import {
  SelectorDireccionCheckout,
  type DireccionCheckoutItem,
} from "@/modules/checkout/components/selector-direccion-checkout";
import { resumenCheckout, leerCuponGuardado } from "@/modules/checkout/services/checkout";
import { accionAplicarCupon, accionQuitarCupon } from "@/modules/checkout/actions";
import { obtenerEstadoCarrito, resolverComprador } from "@/modules/carrito/services/carrito";
import { accionCancelarReserva } from "@/modules/carrito/actions";
import { BotonCancelarReserva } from "@/modules/carrito/components/controles";
import { CountdownReserva } from "@/modules/carrito/components/countdown";
import { formatoPrecio } from "@/modules/catalogo/productos";
import { listarDireccionesCliente } from "@/modules/clients/services/direcciones";

export const metadata: Metadata = { title: "Checkout · Sneaker" };

/**
 * Checkout (Sprint 3 - Camila Viegas / Tadeo Rochas. RF-18, RF-22, RF-24,
 * RF-25, RF-45, RN-08).
 *
 * Muestra el resumen con promociones por item (la mejor vigente por
 * producto, no acumulativas), el cupon aplicado (RN-08: uno por
 * compra), el selector/alta/edicion inline de direccion de envio
 * (RF-18) y el costo de envio por destino (RF-45: tarifa base en la
 * ciudad de la tienda y tarifa por provincia).
 */
export default async function CheckoutPage() {
  const sesion = await requireCliente();
  const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
  const carrito = await obtenerEstadoCarrito(usuarioId);

  if (carrito.items.length === 0) {
    redirect("/carrito");
  }

  // RF-18 / RF-45: las direcciones vienen ordenadas con la seleccionada
  // (predeterminada) primero; esa misma calcula el envio y se congela en el pedido.
  const direccionesRaw = await listarDireccionesCliente(usuarioId);
  const direccionesVista: DireccionCheckoutItem[] = direccionesRaw.map((d) => ({
    id: d.id,
    destinatario: d.destinatario,
    calle: d.calle,
    numero: d.numero,
    piso: d.piso,
    departamento: d.departamento,
    ciudad: d.ciudad,
    provincia: d.provincia,
    codigoPostal: d.codigoPostal,
    predeterminada: d.predeterminada,
  }));
  const direccion = direccionesVista[0] ?? null;
  const destino = direccion
    ? { ciudad: direccion.ciudad, provincia: direccion.provincia }
    : null;

  const resumen = await resumenCheckout(carrito, await leerCuponGuardado(), destino);
  const modoPago: "REAL" | "SIMULADO" = mercadoPagoHabilitado() ? "REAL" : "SIMULADO";

  const conReservaVigente = resumen.reservaActiva;
  const conBloqueos = carrito.items.some((item) => item.faltante > 0 || !item.productoActivo);
  const pagoDeshabilitado = !conReservaVigente || conBloqueos || !direccion;

  return (
    <div className="mx-auto flex w-full max-w-[1287px] flex-col gap-6 px-4 py-10">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">Checkout</p>
        <h1 className="mt-1 text-3xl font-bold text-[#2C2C2C]">Confirmar compra</h1>
      </header>

      {conReservaVigente ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#F5C6CB] bg-[#FFF5F5] px-4 py-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-base font-semibold leading-[16px] text-[#7C0300]">
              Tus productos quedaron reservados. Completá el pago antes de que expire la reserva.
            </p>
            {carrito.reservaExpiracion && (
              <div>
                <CountdownReserva expiracionISO={carrito.reservaExpiracion.toISOString()} />
              </div>
            )}
          </div>
          <BotonCancelarReserva
            accion={accionCancelarReserva}
            className="rounded border border-[#7C0300] bg-white px-4 py-2 text-sm font-semibold text-[#7C0300] transition-colors hover:bg-[#FFEBEE]"
          />
        </div>
      ) : (
        <div className="rounded-md border border-[#CF1A1F] bg-[#FFCDD2] px-4 py-3">
          <p className="text-base font-semibold leading-[16px] text-[#7C0300]">
            La reserva expiró o no está activa. Para pagar, volvé al carrito e iniciá la compra
            de nuevo.
          </p>
          <Link
            href="/carrito"
            className="mt-2 inline-block text-base font-semibold text-[#CF1A1F] underline"
          >
            Volver al carrito
          </Link>
        </div>
      )}

      {conBloqueos && conReservaVigente && (
        <div className="rounded-md border border-[#CF1A1F] bg-[#FFF5F5] px-4 py-3">
          <p className="text-base font-semibold text-[#7C0300]">
            Hay items sin stock suficiente o desactivados: ajustá el carrito antes de pagar.
          </p>
        </div>
      )}

      <SelectorDireccionCheckout direcciones={direccionesVista} />

      <ul className="flex flex-col gap-3">
        {resumen.items.map((linea) => (
          <li
            key={linea.itemId}
            className="flex flex-wrap items-center gap-4 rounded-md border border-[#D9D9D9] bg-white p-4"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-[#2C2C2C]">
              {linea.imagen && (
                <Image
                  src={linea.imagen}
                  alt={linea.nombreProducto}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="min-w-[200px] flex-1">
              <p className="text-lg font-semibold leading-[24px] text-[#2C2C2C]">
                {linea.nombreProducto}
              </p>
              <p className="text-sm text-[#6B6B6B]">
                {linea.tituloVariante} · x{linea.cantidad}
              </p>
              {linea.promocion && (
                <p className="mt-1 inline-block rounded bg-[#CF1A1F] px-2 py-1 text-sm font-semibold text-white">
                  Promo {linea.promocion.nombre}: -{linea.promocion.porcentaje}%
                </p>
              )}
            </div>
            <div className="text-right">
              {linea.promocion && (
                <p className="text-sm text-[#9E9E9E] line-through">
                  {formatoPrecio(linea.precioUnitario * linea.cantidad)}
                </p>
              )}
              <p className="text-lg font-semibold tabular-nums text-[#2C2C2C]">
                {formatoPrecio(linea.subtotalLinea)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <FormularioCupon
        accionAplicar={accionAplicarCupon}
        accionQuitar={accionQuitarCupon}
        cuponAplicado={
          resumen.cupon
            ? { codigo: resumen.cupon.codigo, porcentaje: resumen.cupon.porcentaje }
            : null
        }
      />

      <div className="flex flex-col gap-3 rounded-md border border-[#D9D9D9] bg-[#FAFAFA] p-4">
        <p className="text-lg font-semibold text-[#2C2C2C]">Resumen</p>
        <div className="flex justify-between text-base text-[#4E4E4E]">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatoPrecio(resumen.subtotal)}</span>
        </div>
        {resumen.descuentoPromociones > 0 && (
          <div className="flex justify-between text-base text-green-700">
            <span>Promociones</span>
            <span className="tabular-nums">-{formatoPrecio(resumen.descuentoPromociones)}</span>
          </div>
        )}
        {resumen.cupon && (
          <div className="flex justify-between text-base text-green-700">
            <span>Cupón {resumen.cupon.codigo} (-{resumen.cupon.porcentaje}%)</span>
            <span className="tabular-nums">-{formatoPrecio(resumen.descuentoCupon)}</span>
          </div>
        )}
        <div className="flex justify-between text-base text-[#4E4E4E]">
          <span>
            Costo de envío
            {resumen.destinoEnvio
              ? ` (${resumen.destinoEnvio.ciudad}, ${resumen.destinoEnvio.provincia})`
              : ""}
          </span>
          <span className="tabular-nums">
            {resumen.costoEnvio === null
              ? "A definir (sin dirección)"
              : formatoPrecio(resumen.costoEnvio)}
          </span>
        </div>
        <div className="flex justify-between border-t border-[#D9D9D9] pt-3 text-2xl font-bold text-[#2C2C2C]">
          <span>Total</span>
          <span className="tabular-nums">{formatoPrecio(resumen.totalConEnvio)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {modoPago === "REAL" ? (
          <>
            <BotonPagar accion={accionPagar} modo={modoPago} disabled={pagoDeshabilitado} />
            {!pagoDeshabilitado && (
              <Link
                href="/carrito/checkout/mercadopago"
                className="inline-flex h-12 items-center justify-center rounded-lg border border-[#009EE3] bg-white px-5 text-sm font-semibold text-[#0073A8] transition-colors hover:bg-[#EBF7FD]"
              >
                Pago de prueba rápido (simulador)
              </Link>
            )}
          </>
        ) : (
          <>
            {pagoDeshabilitado ? (
              <button
                type="button"
                disabled
                className="inline-flex h-12 cursor-not-allowed items-center justify-center gap-2.5 rounded-lg bg-[#009EE3] px-7 text-lg font-bold text-white opacity-50 shadow-sm"
              >
                <span>Pagar con Mercado Pago</span>
                <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  Checkout Pro
                </span>
              </button>
            ) : (
              <Link
                href="/carrito/checkout/mercadopago"
                className="inline-flex h-12 items-center justify-center gap-2.5 rounded-lg bg-[#009EE3] px-7 text-lg font-bold text-white shadow-sm transition-colors hover:bg-[#0082BD]"
              >
                <span>Pagar con Mercado Pago</span>
                <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-semibold">
                  Checkout Pro
                </span>
              </Link>
            )}
            <BotonPagoRechazado
              accion={accionPagarRechazado}
              disabled={pagoDeshabilitado}
            />
          </>
        )}
      </div>

      {!direccion && conReservaVigente && (
        <p className="text-sm font-semibold text-[#CF1A1F]">
          Cargá o seleccioná una dirección de envío arriba para habilitar el pago.
        </p>
      )}

      <p className="text-sm text-[#6B6B6B]">
        {modoPago === "REAL"
          ? "Serás redirigido a Mercado Pago para completar el pago. Tu pedido queda confirmado cuando el pago se aprueba."
          : "Al presionar «Pagar con Mercado Pago» serás redirigido a la pasarela Checkout Pro para elegir tu medio de pago (tarjeta en cuotas, dinero en cuenta o QR) y recibir tu comprobante por correo."}
      </p>
    </div>
  );
}
