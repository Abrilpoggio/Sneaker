import Link from "next/link";

import { ProductoCard } from "@/components/product-card";
import { PRODUCTOS } from "@/modules/catalogo/productos";

/**
 * Catalogo reconstruido desde el mockup de Figma.
 *
 * Fuente: `Vista 2: Catalogo y busqueda`, 1281 x 5354 px.
 *
 *   1. BANNER          1283 x 289
 *        "CATALOGO COMPLETO"       56px / 800 / lh68  #FFFFFF
 *        "TODOS NUESTROS PRODUCTOS" 24px / 500 / lh29  #FFFFFF
 *        boton "Volver"             20px / 700 / lh24  #FFFFFF
 *   2. "Todos nuestros Productos"  18px / 600 / lh22  #000000
 *   3. filas de tarjetas           1220 x 424, gap 20
 *
 * Las medidas y la tipografia salen del archivo, no son aproximadas.
 */

export default function CatalogoPage() {
  return (
    <div className="flex flex-col">
      {/* BANNER 1283 x 289, radio 2 */}
      <section
        aria-label="Banner del catalogo"
        className="relative h-[289px] w-full overflow-hidden rounded-sm bg-[#2C2C2C]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#CF1A1F] via-[#7C0300] to-[#2C2C2C]" />
        <div className="relative mx-auto flex h-full w-full max-w-[1287px] flex-col justify-center gap-8 px-4">
          <h1 className="text-[56px] font-extrabold leading-[68px] text-white">
            CATÁLOGO COMPLETO
          </h1>
          <p className="text-2xl font-medium leading-[29px] text-white">
            TODOS NUESTROS PRODUCTOS
          </p>
        </div>
        <Link
          href="/"
          className="absolute left-4 top-4 text-xl font-bold leading-[24px] text-white transition-opacity hover:opacity-80"
        >
          Volver
        </Link>
      </section>

      {/* "Todos nuestros Productos" 18px / 600 / lh22, #000000 */}
      <section aria-label="Productos" className="mx-auto w-full max-w-[1287px] px-4 py-10">
        <h2 className="text-lg font-semibold leading-[22px] text-black">
          Todos nuestros Productos
        </h2>

        {/* Filas de tarjetas 1220 x 424, gap 20 */}
        <div className="mt-6 flex flex-wrap gap-5">
          {PRODUCTOS.map((p) => (
            <ProductoCard key={p.slug} producto={p} />
          ))}
        </div>

        {PRODUCTOS.length === 0 && (
          <p className="py-16 text-center text-xl text-[#9E9E9E]">
            No hay productos para mostrar todavía.
          </p>
        )}
      </section>
    </div>
  );
}