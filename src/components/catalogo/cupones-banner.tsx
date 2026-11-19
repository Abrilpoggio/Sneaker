"use client";

import { useState } from "react";

import type { CuponVigente } from "@/modules/catalogo/catalogo";

interface CuponesBannerProps {
  cupones: CuponVigente[];
}

/**
 * Muestra los cupones de descuento vigentes en la vista de Ofertas y Cupones
 * con copiado en un clic para usar en el checkout (RF-22 / RN-08).
 */
export function CuponesBanner({ cupones }: CuponesBannerProps) {
  const [copiado, setCopiado] = useState<string | null>(null);

  if (cupones.length === 0) return null;

  async function copiarCodigo(codigo: string) {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(codigo);
      setTimeout(() => {
        setCopiado((actual) => (actual === codigo ? null : actual));
      }, 2200);
    } catch {
      setCopiado(codigo);
    }
  }

  return (
    <section
      aria-label="Cupones vigentes"
      className="mb-6 rounded-xl border border-[#CF1A1F]/25 bg-gradient-to-r from-[#FFF5F5] via-white to-[#FFF5F5] p-5 shadow-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#CF1A1F]">
            Cupones disponibles
          </p>
          <h2 className="mt-0.5 text-lg font-bold text-[#2C2C2C]">
            Aplicá un cupón extra en el checkout
          </h2>
        </div>
        <span className="text-xs text-[#6B6B6B]">
          Se permite 1 cupón por compra (combinable con promociones)
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cupones.map((cupon) => {
          const fueCopiado = copiado === cupon.codigo;
          const vence = cupon.fechaVigenciaFin
            ? new Date(cupon.fechaVigenciaFin).toLocaleDateString("es-AR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })
            : null;

          return (
            <div
              key={cupon.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-[#CF1A1F]/50 bg-white px-4 py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#CF1A1F] px-2 py-0.5 text-xs font-bold text-white">
                    {cupon.porcentajeDescuento}% OFF
                  </span>
                  <code className="truncate text-sm font-extrabold tracking-wide text-[#2C2C2C]">
                    {cupon.codigo}
                  </code>
                </div>
                {cupon.descripcion && (
                  <p className="mt-1 line-clamp-1 text-xs text-[#6B6B6B]">
                    {cupon.descripcion}
                  </p>
                )}
                {vence && (
                  <p className="mt-0.5 text-[11px] text-[#9E9E9E]">
                    Válido hasta {vence}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => copiarCodigo(cupon.codigo)}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  fueCopiado
                    ? "bg-[#2E7D32] text-white"
                    : "bg-[#2C2C2C] text-white hover:bg-[#CF1A1F]"
                }`}
              >
                {fueCopiado ? "¡Copiado!" : "Copiar"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
