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
      className={`group flex w-[290px] shrink-0 flex-col ${sinStock ? "opacity-60" : ""}`}
    >
      {/* Imagen 290 x 289, fondo #2C2C2C */}
      <div className="relative h-[289px] w-[290px] overflow-hidden bg-[#2C2C2C]">
        {imagen ? (
          <Image
            src={imagen}
            alt={`${nombre} ${marca}`}
            fill
            sizes="(max-width: 640px) 100vw, 290px"
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              sinStock ? "grayscale" : ""
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-6 text-center">
            <span className="text-2xl font-bold leading-[29px] text-white/40">
              {nombre}
            </span>
          </div>
        )}

        {/* Indicadores de stock sobre la imagen */}
        {sinStock && (
          <span className="absolute left-3 top-3 rounded bg-[#9E9E9E] px-2 py-1 text-base font-medium leading-[16px] text-white">
            Sin stock
          </span>
        )}
        {ultimasUnidades && (
          <span className="absolute left-3 top-3 rounded bg-[#CF1A1F] px-2 py-1 text-base font-medium leading-[16px] text-white">
            ¡Últimas {producto.stockTotal} unidades!
          </span>
        )}
      </div>

      {/* Panel 290 x 151, #444444, radio 11, solapa 16 px */}
      <div className="z-10 -mt-4 h-[151px] w-[290px] rounded-[11px] bg-[#444444] px-4 py-3">
        <div className="flex h-[114px] flex-col gap-2">
          <h3 className="text-xl font-bold leading-[24px] text-white">{nombre}</h3>
          <p className="text-xl font-medium leading-[24px] text-white">{marca}</p>
          <p className="text-xl font-light leading-[24px] text-white">{categoria}</p>
          <div className="mt-auto flex items-baseline justify-between gap-2">
            <p
              className={`text-xl font-medium leading-[24px] ${
                sinStock ? "text-[#9E9E9E]" : "text-white"
              }`}
            >
              {formatoPrecio(precio)}
            </p>
            <p
              className={`text-base font-light leading-[16px] ${
                sinStock ? "text-[#9E9E9E]" : "text-[#FF8F8F]"
              }`}
            >
              {producto.variantesTotales > 0
                ? `${producto.variantesDisponibles}/${producto.variantesTotales} variantes`
                : "Kit"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
