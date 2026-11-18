"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { formatoPrecio } from "@/modules/catalogo/productos";
import { ESTADO_INICIAL_CHECKOUT, type EstadoAccionCheckout } from "../schemas";

function BotonSubmitMP({
  children,
  className,
  pendienteTexto,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  pendienteTexto: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? pendienteTexto : children}
    </button>
  );
}

export interface ItemResumenMP {
  itemId: string;
  nombreProducto: string;
  tituloVariante: string;
  cantidad: number;
  subtotalLinea: number;
}

export function MercadoPagoPasarela({
  accionAprobar,
  accionRechazar,
  nombreComprador,
  correoComprador,
  items,
  subtotal,
  descuentoPromociones,
  descuentoCupon,
  codigoCupon,
  costoEnvio,
  destinoTexto,
  total,
  bloqueado,
}: {
  accionAprobar: (prev: EstadoAccionCheckout, formData: FormData) => Promise<EstadoAccionCheckout>;
  accionRechazar: (prev: EstadoAccionCheckout, formData: FormData) => Promise<EstadoAccionCheckout>;
  nombreComprador: string;
  correoComprador: string;
  items: ItemResumenMP[];
  subtotal: number;
  descuentoPromociones: number;
  descuentoCupon: number;
  codigoCupon: string | null;
  costoEnvio: number | null;
  destinoTexto: string | null;
  total: number;
  bloqueado: boolean;
}) {
  const [metodo, setMetodo] = useState<"tarjeta" | "cuenta" | "qr">("tarjeta");
  const [cuotas, setCuotas] = useState<1 | 3 | 6>(6);
  const [numeroTarjeta, setNumeroTarjeta] = useState("4509 9501 2480 3704");
  const [titular, setTitular] = useState(nombreComprador.toUpperCase());
  const [vencimiento, setVencimiento] = useState("12/29");
  const [cvv, setCvv] = useState("842");

  const [estadoAprobar, formAprobar] = useActionState(accionAprobar, ESTADO_INICIAL_CHECKOUT);
  const [estadoRechazar, formRechazar] = useActionState(accionRechazar, ESTADO_INICIAL_CHECKOUT);

  const valorCuota = Math.round(total / cuotas);

  return (
    <div className="min-h-[78vh] w-full bg-[#EDEDED] pb-14">
      {/* Barra oficial azul de Mercado Pago Checkout Pro */}
      <div className="w-full bg-[#009EE3] text-white shadow-sm">
        <div className="mx-auto flex max-w-[1060px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#009EE3] shadow-xs">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 8h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2v4l-4-4H9a1.994 1.994 0 0 1-1.414-.586m0 0L11 14h4a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2v4l.586-.586Z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight">mercado pago</span>
                <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                  Checkout Pro
                </span>
              </div>
              <p className="text-xs text-white/90">
                Pasarela de pago seguro · Comercio adherido: <strong>SNEAKER ARGENTINA</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#007EB5] px-3 py-1.5">
              🔒 Compra 100% protegida
            </span>
            <Link
              href="/carrito/checkout"
              className="underline decoration-white/80 underline-offset-4 hover:text-white/90"
            >
              ← Volver a Sneaker
            </Link>
          </div>
        </div>
      </div>

      {/* Cuerpo de dos columnas estilo Checkout Pro */}
      <div className="mx-auto mt-6 grid max-w-[1060px] grid-cols-1 gap-6 px-4 lg:grid-cols-12 sm:px-6">
        {/* Columna izquierda: selección de medio de pago */}
        <div className="flex flex-col gap-5 lg:col-span-7">
          <div className="rounded-xl bg-white p-5 shadow-xs sm:p-6">
            <h1 className="text-xl font-bold text-[#1A1A1A]">¿Cómo querés pagar?</h1>
            <p className="mt-1 text-xs text-[#666666]">
              Sesión iniciada como <strong>{correoComprador}</strong>
            </p>

            {/* Tabs de medio de pago */}
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setMetodo("tarjeta")}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
                  metodo === "tarjeta"
                    ? "border-2 border-[#009EE3] bg-[#F0F9FF]"
                    : "border-[#D9D9D9] bg-white hover:border-[#009EE3]/60"
                }`}
              >
                <span className="text-xs font-bold text-[#1A1A1A]">💳 Tarjeta de crédito / débito</span>
                <span className="text-[11px] font-semibold text-[#00A650]">
                  Hasta 6 cuotas sin interés
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMetodo("cuenta")}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
                  metodo === "cuenta"
                    ? "border-2 border-[#009EE3] bg-[#F0F9FF]"
                    : "border-[#D9D9D9] bg-white hover:border-[#009EE3]/60"
                }`}
              >
                <span className="text-xs font-bold text-[#1A1A1A]">💰 Dinero en Mercado Pago</span>
                <span className="text-[11px] text-[#666666]">Acreditación instantánea</span>
              </button>

              <button
                type="button"
                onClick={() => setMetodo("qr")}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-all ${
                  metodo === "qr"
                    ? "border-2 border-[#009EE3] bg-[#F0F9FF]"
                    : "border-[#D9D9D9] bg-white hover:border-[#009EE3]/60"
                }`}
              >
                <span className="text-xs font-bold text-[#1A1A1A]">📱 Código QR / DEBIN</span>
                <span className="text-[11px] text-[#666666]">Desde cualquier billetera</span>
              </button>
            </div>

            {/* Contenido según medio elegido */}
            {metodo === "tarjeta" && (
              <div className="mt-5 flex flex-col gap-4">
                {/* Tarjeta visual */}
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1B263B] via-[#0D1B2A] to-[#009EE3] p-5 text-white shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-white/80">
                      VISA · Mercado Pago Sandbox
                    </span>
                    <span className="rounded bg-white/20 px-2 py-0.5 text-[11px] font-bold">
                      CRÉDITO
                    </span>
                  </div>
                  <p className="mt-5 font-mono text-lg font-bold tracking-widest sm:text-xl">
                    {numeroTarjeta || "•••• •••• •••• ••••"}
                  </p>
                  <div className="mt-4 flex items-end justify-between text-xs">
                    <div>
                      <p className="text-[10px] uppercase text-white/70">Titular</p>
                      <p className="font-semibold tracking-wide">{titular || "NOMBRE Y APELLIDO"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-white/70">Vence</p>
                      <p className="font-semibold">{vencimiento || "MM/AA"}</p>
                    </div>
                  </div>
                </div>

                {/* Campos editables de tarjeta de prueba */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-[#333333]">
                      Número de tarjeta (precargada de prueba)
                    </label>
                    <input
                      type="text"
                      value={numeroTarjeta}
                      onChange={(e) => setNumeroTarjeta(e.target.value)}
                      className="mt-1 w-full rounded-md border border-[#CCCCCC] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#009EE3]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#333333]">
                      Nombre y apellido
                    </label>
                    <input
                      type="text"
                      value={titular}
                      onChange={(e) => setTitular(e.target.value)}
                      className="mt-1 w-full rounded-md border border-[#CCCCCC] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#009EE3]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-[#333333]">Vencimiento</label>
                      <input
                        type="text"
                        value={vencimiento}
                        onChange={(e) => setVencimiento(e.target.value)}
                        className="mt-1 w-full rounded-md border border-[#CCCCCC] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#009EE3]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#333333]">CVV</label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        className="mt-1 w-full rounded-md border border-[#CCCCCC] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#009EE3]"
                      />
                    </div>
                  </div>
                </div>

                {/* Selector de cuotas */}
                <div>
                  <label className="text-xs font-semibold text-[#333333]">Cuotas</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {([1, 3, 6] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCuotas(n)}
                        className={`rounded-md border px-3 py-2 text-xs font-semibold transition-all ${
                          cuotas === n
                            ? "border-[#009EE3] bg-[#009EE3]/10 text-[#007EB5]"
                            : "border-[#D9D9D9] text-[#333333] hover:border-[#009EE3]"
                        }`}
                      >
                        {n}x {formatoPrecio(Math.round(total / n))}
                        <span className="block text-[10px] font-bold text-[#00A650]">
                          Sin interés
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {metodo === "cuenta" && (
              <div className="mt-5 rounded-lg border border-[#B3E5FC] bg-[#F0F9FF] p-4">
                <p className="text-sm font-bold text-[#007EB5]">
                  Saldo disponible en cuenta Mercado Pago
                </p>
                <p className="mt-1 text-xs text-[#333333]">
                  Tenés saldo suficiente para cubrir el total de <strong>{formatoPrecio(total)}</strong>. El pago se acredita en el acto y recibirás el comprobante por correo en <strong>{correoComprador}</strong>.
                </p>
              </div>
            )}

            {metodo === "qr" && (
              <div className="mt-5 flex flex-col items-center gap-3 rounded-lg border border-[#D9D9D9] bg-[#FAFAFA] p-5 text-center">
                <div className="flex h-32 w-32 items-center justify-center rounded-lg border-2 border-dashed border-[#009EE3] bg-white font-mono text-xs font-bold text-[#009EE3]">
                  [ QR MERCADO PAGO ]
                </div>
                <p className="text-xs text-[#4E4E4E]">
                  Escaneá el QR o presioná <strong>Pagar {formatoPrecio(total)}</strong> abajo para confirmar la acreditación inmediata.
                </p>
              </div>
            )}

            {/* Botones de acción de pago */}
            <div className="mt-6 flex flex-col gap-3 border-t border-[#EEEEEE] pt-5">
              <form action={formAprobar} className="flex flex-col gap-2">
                <BotonSubmitMP
                  disabled={bloqueado}
                  pendienteTexto="Procesando pago en Mercado Pago y enviando comprobante..."
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#009EE3] px-6 text-base font-bold text-white shadow-sm transition-colors hover:bg-[#0082BD] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>
                    Pagar {formatoPrecio(total)}
                    {metodo === "tarjeta" && cuotas > 1
                      ? ` (${cuotas} cuotas de ${formatoPrecio(valorCuota)})`
                      : ""}
                  </span>
                </BotonSubmitMP>
                {!estadoAprobar.ok && estadoAprobar.error && (
                  <p role="alert" className="text-sm font-semibold text-[#CF1A1F]">
                    {estadoAprobar.error}
                  </p>
                )}
              </form>

              <form action={formRechazar} className="flex flex-col gap-1.5">
                <BotonSubmitMP
                  disabled={bloqueado}
                  pendienteTexto="Simulando rechazo de pago (RF-25)..."
                  className="flex h-10 w-full items-center justify-center rounded-lg border border-[#CCCCCC] bg-white px-4 text-xs font-semibold text-[#4E4E4E] transition-colors hover:border-[#CF1A1F] hover:text-[#CF1A1F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Simular pago rechazado por tarjeta sin fondos (RF-25)
                </BotonSubmitMP>
                {!estadoRechazar.ok && estadoRechazar.error && (
                  <p role="alert" className="text-xs font-semibold text-[#CF1A1F]">
                    {estadoRechazar.error}
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Columna derecha: Resumen de la compra en Sneaker */}
        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="rounded-xl bg-white p-5 shadow-xs sm:p-6">
            <div className="flex items-center justify-between border-b border-[#EEEEEE] pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#9E9E9E]">
                  Resumen de compra
                </p>
                <h2 className="text-base font-bold text-[#1A1A1A]">Sneaker Tienda Oficial</h2>
              </div>
              <span className="rounded bg-[#2C2C2C] px-2.5 py-1 text-xs font-bold text-white">
                ARS
              </span>
            </div>

            <ul className="mt-3 flex flex-col divide-y divide-[#F0F0F0]">
              {items.map((it) => (
                <li key={it.itemId} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <p className="font-semibold text-[#2C2C2C]">{it.nombreProducto}</p>
                    <p className="text-xs text-[#6B6B6B]">
                      {it.tituloVariante} · x{it.cantidad}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-[#2C2C2C]">
                    {formatoPrecio(it.subtotalLinea)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 flex flex-col gap-2 border-t border-[#EEEEEE] pt-3 text-sm">
              <div className="flex justify-between text-[#4E4E4E]">
                <span>Productos</span>
                <span className="tabular-nums">{formatoPrecio(subtotal)}</span>
              </div>
              {descuentoPromociones > 0 && (
                <div className="flex justify-between text-[#00A650]">
                  <span>Promociones aplicadas</span>
                  <span className="tabular-nums">-{formatoPrecio(descuentoPromociones)}</span>
                </div>
              )}
              {codigoCupon && descuentoCupon > 0 && (
                <div className="flex justify-between text-[#00A650]">
                  <span>Cupón ({codigoCupon})</span>
                  <span className="tabular-nums">-{formatoPrecio(descuentoCupon)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#4E4E4E]">
                <span>Envío{destinoTexto ? ` (${destinoTexto})` : ""}</span>
                <span className="tabular-nums">
                  {costoEnvio === null ? "A definir" : formatoPrecio(costoEnvio)}
                </span>
              </div>
              <div className="mt-2 flex items-baseline justify-between border-t border-[#D9D9D9] pt-3 text-lg font-extrabold text-[#1A1A1A]">
                <span>Total a pagar</span>
                <span className="tabular-nums text-[#009EE3]">{formatoPrecio(total)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-[#F5F9FF] p-3 text-xs text-[#333333]">
              <p className="font-semibold text-[#007EB5]">✉ Envío automático de comprobante</p>
              <p className="mt-0.5 text-[#555555]">
                Al confirmar el pago se enviará automáticamente el comprobante y el seguimiento a{" "}
                <strong>{correoComprador}</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
