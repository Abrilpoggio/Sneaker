import type { Metadata } from "next";
import Link from "next/link";

import { CuponesBanner } from "@/components/catalogo/cupones-banner";
import { listarCuponesVigentes } from "@/modules/catalogo/catalogo";

export const metadata: Metadata = {
  title: "Cupones de descuento · Sneaker",
};

export const dynamic = "force-dynamic";

/**
 * Vista dedicada exclusivamente a cupones de descuento vigentes (RF-22 / RN-08).
 */
export default async function PaginaCupones() {
  const cupones = await listarCuponesVigentes();

  return (
    <div data-full-bleed className="flex w-full flex-col">
      {/* Banner superior */}
      <section
        aria-label="Banner de cupones"
        className="relative h-[220px] w-full overflow-hidden bg-[#2C2C2C] sm:h-[260px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/banner-catalogo.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C0300]/85 via-[#2C2C2C]/75 to-[#1E1E1E]/90" />
        <div className="relative mx-auto flex h-full w-full max-w-[1287px] flex-col items-center justify-center gap-3 px-6 text-center sm:px-10">
          <h1 className="text-3xl font-extrabold tracking-wide text-white drop-shadow sm:text-[52px] sm:leading-[62px]">
            CUPONES DE DESCUENTO
          </h1>
          <p className="text-base font-medium italic tracking-wide text-white/95 drop-shadow sm:text-xl">
            COPIÁ TU CÓDIGO Y AHORRÁ EN EL CHECKOUT
          </p>
        </div>
        <Link
          href="/"
          className="absolute left-6 top-5 flex items-center gap-2.5 text-lg font-bold uppercase text-white transition-opacity hover:opacity-80 sm:left-10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/figma/arrow-volver.svg"
            alt=""
            aria-hidden
            className="h-7 w-7 shrink-0"
          />
          <span>VOLVER</span>
        </Link>
      </section>

      <div className="mx-auto flex w-full max-w-[1170px] flex-col gap-8 px-4 py-10">
        {cupones.length > 0 ? (
          <CuponesBanner cupones={cupones} />
        ) : (
          <section
            aria-label="Sin cupones activos"
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-6 py-16 text-center"
          >
            <h2 className="text-xl font-bold text-[#2C2C2C]">
              Por el momento no hay cupones vigentes
            </h2>
            <p className="max-w-md text-sm text-[#6B6B6B]">
              Suscribite al newsletter para enterarte primero cuando lancemos nuevos
              códigos de descuento.
            </p>
            <Link
              href="/newsletter"
              className="mt-2 inline-flex items-center justify-center rounded-md bg-[#CF1A1F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7C0300]"
            >
              Suscribirme al newsletter
            </Link>
          </section>
        )}

        {/* Como usar tus cupones */}
        <section
          aria-label="Cómo usar los cupones"
          className="rounded-xl border border-[#E5E5E5] bg-white p-6 shadow-xs"
        >
          <h2 className="text-lg font-bold text-[#2C2C2C]">
            ¿Cómo aplicar un cupón en tu compra?
          </h2>
          <ol className="mt-3 grid gap-4 text-sm text-[#4E4E4E] sm:grid-cols-3">
            <li className="rounded-lg bg-[#FAFAFA] p-4">
              <span className="font-bold text-[#CF1A1F]">1. Copiá el código</span>
              <p className="mt-1">
                Hacé clic en <strong>Copiar</strong> en el cupón vigente que quieras usar.
              </p>
            </li>
            <li className="rounded-lg bg-[#FAFAFA] p-4">
              <span className="font-bold text-[#CF1A1F]">2. Armá tu carrito</span>
              <p className="mt-1">
                Elegí tus productos del catálogo y avanzá al paso de confirmar compra.
              </p>
            </li>
            <li className="rounded-lg bg-[#FAFAFA] p-4">
              <span className="font-bold text-[#CF1A1F]">3. Pegalo en el checkout</span>
              <p className="mt-1">
                Ingresalo en <strong>“¿Tenés un cupón de descuento?”</strong>. Podés usar 1
                cupón por compra y combinarlo con promociones activas.
              </p>
            </li>
          </ol>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/catalogo"
              className="inline-flex items-center justify-center rounded-md bg-[#2C2C2C] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#CF1A1F]"
            >
              Ir al catálogo
            </Link>
            <Link
              href="/catalogo?ofertas=1"
              className="inline-flex items-center justify-center rounded-md border border-[#CF1A1F] px-5 py-2.5 text-sm font-semibold text-[#CF1A1F] transition-colors hover:bg-[#FFF5F5]"
            >
              Ver productos en oferta
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
