import Image from "next/image";
import Link from "next/link";

import {
  calcularEstadoStock,
  type ProductoCatalogo,
} from "@/modules/catalogo/catalogo";
import { formatoPrecio } from "@/modules/catalogo/productos";

/**
 * Tarjeta del catalogo publico con datos de la base.
 *
 * Mantiene la geometria y tipografia de `ProductoCard` (Figma,
 * 290 x 424) y agrega los indicadores de stock del Sprint 2:
 *
 *   RF-09  sin stock -> tarjeta gris con etiqueta "Sin stock"
 *                        (el producto sigue visible, nunca se borra).
 *   RN-09  stock <= 10 -> etiqueta roja "Ultimas N unidades".
 */
export function ProductoCatalogoCard({ producto }: { producto: ProductoCatalogo }) {
  const { nombre, marca, categoria, precio, imagen, sku } = producto;
  const { sinStock, ultimasUnidades } = calcularEstadoStock(producto.stockTotal);

  return (
    <Link
      href={`/producto/${sku}`}
      className={`group flex w-full max-w-[280px] shrink-0 flex-col ${sinStock ? "opacity-60" : ""}`}
    >
      {/* Imagen 280 x 260, fondo #2C2C2C */}
      <div className="relative h-[260px] w-full overflow-hidden rounded-t-[11px] bg-[#2C2C2C]">
        {imagen ? (
          <Image
            src={imagen}
            alt={`${nombre} ${marca}`}
            fill
            sizes="(max-width: 640px) 100vw, 280px"
            className={`object-contain p-4 transition-transform duration-300 group-hover:scale-105 ${
              sinStock ? "grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center">
            <span className="text-base font-semibold leading-[22px] text-white/45">
              {nombre}
            </span>
          </div>
        )}

        {/* Indicadores de stock sobre la imagen */}
        {sinStock && (
          <span className="absolute left-3 top-3 rounded bg-[#9E9E9E] px-2.5 py-1 text-xs font-semibold leading-[14px] text-white">
            Sin stock
          </span>
        )}
        {ultimasUnidades && (
          <span className="absolute left-3 top-3 rounded bg-[#CF1A1F] px-2.5 py-1 text-xs font-semibold leading-[14px] text-white">
            ¡Últimas {producto.stockTotal} unidades!
          </span>
        )}
      </div>

      {/* Panel inferior #444444, radio 11, solapa 12 px, texto proporcionado al rectangulo */}
      <div className="z-10 -mt-3 flex min-h-[148px] w-full flex-1 flex-col justify-between rounded-[11px] bg-[#444444] px-4 py-3.5 shadow-sm">
        <div className="flex flex-col gap-1">
          <h3 className="line-clamp-2 text-[15px] font-bold leading-[20px] text-white">
            {nombre}
          </h3>
          <p className="text-[13px] font-medium leading-[18px] text-white/90">{marca}</p>
          <p className="text-[12px] font-light leading-[16px] text-white/75">{categoria}</p>
        </div>

        <div className="mt-2.5 flex items-baseline justify-between gap-2 border-t border-white/10 pt-2">
          <p
            className={`text-[17px] font-bold leading-[22px] ${
              sinStock ? "text-[#9E9E9E]" : "text-white"
            }`}
          >
            {formatoPrecio(precio)}
          </p>
          {ultimasUnidades && (
            <p className="text-[12px] font-semibold leading-[16px] text-[#FF8F8F]">
              ¡Últimas {producto.stockTotal} unidades!
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
