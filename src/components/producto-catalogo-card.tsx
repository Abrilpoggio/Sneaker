import Image from "next/image";
import Link from "next/link";

import { BotonFavorito } from "@/components/boton-favorito";
import {
  calcularEstadoStock,
  type ProductoCatalogo,
} from "@/modules/catalogo/catalogo";
import { formatoPrecio } from "@/modules/catalogo/productos";

/**
 * Tarjeta del catalogo publico con datos de la base.
 *
 * Mantiene la geometria y tipografia de `ProductoCard` (Figma,
 * 290 x 424) y agrega los indicadores de stock del Sprint 2,
 * promociones vigentes (RF-41) y favoritos (RF-20):
 *
 *   RF-09  sin stock -> tarjeta gris con etiqueta "Sin stock"
 *                        (el producto sigue visible, nunca se borra).
 *   RN-09  stock <= 10 -> etiqueta roja "Ultimas N unidades".
 */
export function ProductoCatalogoCard({
  producto,
  esFavorito = false,
}: {
  producto: ProductoCatalogo;
  esFavorito?: boolean;
}) {
  const {
    id,
    nombre,
    marca,
    categoria,
    precio,
    porcentajeDescuento,
    precioConDescuento,
    imagen,
    sku,
  } = producto;
  const { sinStock, ultimasUnidades } = calcularEstadoStock(producto.stockTotal);
  const tieneDescuento =
    porcentajeDescuento !== null &&
    porcentajeDescuento > 0 &&
    precioConDescuento !== null;

  return (
    <div
      className={`group relative flex w-full max-w-[280px] shrink-0 flex-col ${sinStock ? "opacity-60" : ""}`}
    >
      {/* Boton de favoritos flotante (RF-20) fuera del Link para evitar navegacion */}
      <BotonFavorito
        productoId={id}
        inicialEsFavorito={esFavorito}
        variante="icono"
        className="absolute right-3 top-3 z-20"
      />

      <Link href={`/producto/${sku}`} className="flex flex-1 flex-col">
        {/* Imagen 280 x 260, cubre toda la mitad superior con bordes redondeados */}
        <div className="relative h-[260px] w-full overflow-hidden rounded-t-[11px] bg-[#333333]">
          {imagen ? (
            <Image
              src={imagen}
              alt={`${nombre} ${marca}`}
              fill
              sizes="(max-width: 640px) 100vw, 280px"
              className={`object-cover object-center transition-transform duration-300 group-hover:scale-105 ${
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

          {/* Indicadores de stock y descuento sobre la imagen */}
          <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {tieneDescuento && !sinStock && (
              <span className="rounded bg-[#CF1A1F] px-2.5 py-1 text-xs font-extrabold leading-[14px] text-white shadow-xs">
                -{porcentajeDescuento}% OFF
              </span>
            )}
            {sinStock && (
              <span className="rounded bg-[#9E9E9E] px-2.5 py-1 text-xs font-semibold leading-[14px] text-white">
                Sin stock
              </span>
            )}
            {ultimasUnidades && (
              <span className="rounded bg-[#2C2C2C]/90 px-2.5 py-1 text-xs font-semibold leading-[14px] text-white">
                ¡Últimas {producto.stockTotal} unidades!
              </span>
            )}
          </div>
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
            <div className="flex flex-wrap items-baseline gap-2">
              <p
                className={`text-[17px] font-bold leading-[22px] ${
                  sinStock ? "text-[#9E9E9E]" : "text-white"
                }`}
              >
                {formatoPrecio(tieneDescuento ? precioConDescuento : precio)}
              </p>
              {tieneDescuento && (
                <span className="text-xs font-normal text-white/60 line-through">
                  {formatoPrecio(precio)}
                </span>
              )}
            </div>
            {ultimasUnidades && (
              <p className="text-[12px] font-semibold leading-[16px] text-[#FF8F8F]">
                ¡Últimas {producto.stockTotal} u.!
              </p>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}
