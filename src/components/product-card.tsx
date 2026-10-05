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
      className="group flex w-[290px] shrink-0 flex-col"
    >
      {/* Imagen 290 x 289, fondo #2C2C2C */}
      <div className="relative h-[289px] w-[290px] overflow-hidden bg-[#2C2C2C]">
        <Image
          src={imagen}
          alt={`${nombre} ${marca}`}
          fill
          sizes="(max-width: 640px) 100vw, 290px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>

      {/* Panel 290 x 151, #444444, radio 11, solapa 16 px */}
      <div className="z-10 -mt-4 h-[151px] w-[290px] rounded-[11px] bg-[#444444] px-4 py-3">
        <div className="flex h-[114px] flex-col gap-6">
          <h3 className="text-xl font-bold leading-[24px] text-white">{nombre}</h3>
          <p className="text-xl font-medium leading-[24px] text-white">{marca}</p>
          <p className="text-xl font-light leading-[24px] text-white">{categoria}</p>
          <p
            className={`text-xl font-medium leading-[24px] ${
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