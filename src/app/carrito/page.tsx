import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { requireCliente } from "@/lib/permissions";
import {
  accionActualizarCantidad,
  accionCancelarReserva,
  accionIniciarReserva,
  accionQuitarItem,
} from "@/modules/carrito/actions";
import {
  ControlesItemCarrito,
  BotonCancelarReserva,
  BotonIniciarReserva,
} from "@/modules/carrito/components/controles";
import { CountdownReserva } from "@/modules/carrito/components/countdown";
import { obtenerEstadoCarrito, resolverComprador } from "@/modules/carrito/services/carrito";
import { formatoPrecio } from "@/modules/catalogo/productos";

export const metadata: Metadata = { title: "Mi carrito" };

/**
 * Carrito de compras (Sprint 3 - Abril Poggio. RF-21, RN-01).
 *
 * Las cantidades se validan contra la disponibilidad real (stock
 * fisico menos reservas ajenas vigentes, RN-05). Si la reserva del
 * checkout esta activa, el carrito se muestra en modo lectura:
 * RN-04 congela la compra durante la ventana de reserva.
 */
export default async function CarritoPage() {
  const sesion = await requireCliente();
  const usuarioId = await resolverComprador(sesion.user.id, sesion.user.email);
  const carrito = await obtenerEstadoCarrito(usuarioId);

  const itemsBloqueados = carrito.items.filter(
    (item) => item.faltante > 0 || !item.productoActivo,
  ).length;

  return (
    <div className="mx-auto flex w-full max-w-[1287px] flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">Mi cuenta</p>
          <h1 className="mt-1 text-3xl font-bold text-[#2C2C2C]">Mi Carrito</h1>
        </div>
        <Link href="/catalogo" className="text-base font-semibold text-[#CF1A1F] underline">
          Seguir comprando
        </Link>
      </header>

      {carrito.reservaActiva && carrito.reservaExpiracion && (
        <div className="rounded-md border border-[#CF1A1F] bg-[#FFCDD2] px-4 py-3">
          <p className="text-base font-semibold leading-[16px] text-[#7C0300]">
            Tus productos quedaron reservados. Completá el pago antes de que expire la reserva o cancelala para modificar el carrito.
          </p>
          <div className="mt-2">
            <CountdownReserva expiracionISO={carrito.reservaExpiracion.toISOString()} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <Link
              href="/carrito/checkout"
              className="inline-block rounded bg-[#CF1A1F] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7C0300]"
            >
              Ir al resumen de compra
            </Link>
            <BotonCancelarReserva
              accion={accionCancelarReserva}
              className="rounded border border-[#7C0300] bg-white px-4 py-2 text-sm font-semibold text-[#7C0300] transition-colors hover:bg-[#FFF5F5]"
            />
          </div>
        </div>
      )}

      {carrito.items.length === 0 ? (
        <div className="rounded-md border border-[#D9D9D9] bg-[#FAFAFA] p-10 text-center">
          <p className="text-xl text-[#9E9E9E]">Tu carrito está vacío.</p>
          <Link
            href="/catalogo"
            className="mt-4 inline-block rounded bg-[#CF1A1F] px-5 py-3 text-base font-semibold text-white hover:bg-[#7C0300]"
          >
            Ver catálogo
          </Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {carrito.items.map((item) => (
              <li
                key={item.id}
                className={`flex flex-wrap items-start gap-4 rounded-md border p-4 ${
                  item.faltante > 0 || !item.productoActivo
                    ? "border-[#CF1A1F] bg-[#FFF5F5]"
                    : "border-[#D9D9D9] bg-white"
                }`}
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded bg-[#2C2C2C]">
                  {item.imagen && (
                    <Image
                      src={item.imagen}
                      alt={item.nombreProducto}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="min-w-[220px] flex-1">
                  <p className="text-lg font-semibold leading-[24px] text-[#2C2C2C]">
                    {item.nombreProducto}
                  </p>
                  <p className="text-sm text-[#6B6B6B]">{item.tituloVariante}</p>
                  <p className="mt-1 text-sm text-[#9E9E9E]">
                    {formatoPrecio(item.precioUnitario)} c/u · {item.stockDisponible} disponible(s)
                  </p>
                  {!item.productoActivo && (
                    <p className="mt-1 text-sm font-semibold text-[#CF1A1F]">
                      El producto fue desactivado: quitá la línea para continuar.
                    </p>
                  )}
                  {item.productoActivo && item.faltante > 0 && (
                    <p className="mt-1 text-sm font-semibold text-[#CF1A1F]">
                      Stock insuficiente: pediste {item.cantidad} y quedan {item.stockDisponible}{" "}
                      unidades. Actualizá la cantidad para continuar.
                    </p>
                  )}
                </div>

                <ControlesItemCarrito
                  accionActualizar={accionActualizarCantidad}
                  accionQuitar={accionQuitarItem}
                  itemId={item.id}
                  cantidad={item.cantidad}
                  maximo={item.stockDisponible}
                />

                <p className="ml-auto text-xl font-semibold tabular-nums text-[#2C2C2C]">
                  {formatoPrecio(item.subtotal)}
                </p>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-[#D9D9D9] bg-[#FAFAFA] p-4">
            <div>
              <p className="text-base text-[#6B6B6B]">
                {carrito.totalItems} artículo(s) · Subtotal (congelado al agregar cada línea)
              </p>
              <p className="text-2xl font-bold tabular-nums text-[#2C2C2C]">
                {formatoPrecio(carrito.subtotal)}
              </p>
            </div>
            <BotonIniciarReserva
              accion={accionIniciarReserva}
              disabled={itemsBloqueados > 0 || carrito.reservaActiva}
              textoDeshabilitado={
                carrito.reservaActiva
                  ? "Reserva activa (continuá en checkout)"
                  : "Resolvé los items sin stock"
              }
            />
          </div>

          <p className="text-sm text-[#9E9E9E]">
            Al iniciar la compra tus productos quedan reservados durante 1 a 2 minutos; si el
            pago no se concreta en ese plazo, se liberan automáticamente.
          </p>
        </>
      )}
    </div>
  );
}
