import Image from "next/image";
import Link from "next/link";

import { formatoPrecio, type Producto } from "@/modules/catalogo/productos";

/**
 * Tarjeta de producto reconstruida desde el mockup de Figma.
 *
 * Fuente: `Frame 43` a `Frame 46`, 290 x 424 px, en `Vista 1: landing page`.
 *
 * Estructura:
 *   imagen   290 x 289   fondo #2C2C2C
 *   panel    290 x 151   fondo #444444, radio 11 px, solapa 16 px sobre la imagen
 *   texto    187 x 114   gap 6 entre lineas
 *
 * Tipografia del panel (dato del archivo):
 *   nombre      20px / 700  #FFFFFF
 *   marca       20px / 500  #FFFFFF
 *   categoria   20px / 300  #FFFFFF
 *   precio      20px / 500  #FFFFFF, o #CF1A1F si esta en oferta
 */

export function ProductoCard({ producto }: { producto: Producto }) {
  const { nombre, marca, categoria, precio, descuento, imagen, slug } = producto;

  return (
    <Link
      href={`/producto/${slug}`}
      className="group flex w-full max-w-[280px] shrink-0 flex-col"
    >
      {/* Imagen 280 x 260, cubre toda la mitad superior con bordes redondeados */}
      <div className="relative h-[260px] w-full overflow-hidden rounded-t-[11px] bg-[#333333]">
        <Image
          src={imagen}
          alt={`${nombre} ${marca}`}
          fill
          sizes="(max-width: 640px) 100vw, 280px"
          className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
        />
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
        <div className="mt-2.5 border-t border-white/10 pt-2">
          <p
            className={`text-[17px] font-bold leading-[22px] ${
              descuento ? "text-[#CF1A1F]" : "text-white"
            }`}
          >
            {formatoPrecio(precio)}
          </p>
        </div>
      </div>
    </Link>
  );
}