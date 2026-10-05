import Image from "next/image";
import Link from "next/link";

import { ProductoCard } from "@/components/product-card";
import { PRODUCTOS } from "@/modules/catalogo/productos";

/**
 * Landing page reconstruida desde el mockup de Figma.
 *
 * Fuente: `Vista 1: landing page(Home)`, 1280 x 2145 px.
 * Orden de secciones, medidas y tipografia tomados del archivo.
 *
 *   1. banner               1282 x 410
 *   2. boton newsletter      308 x  50  blanco, radio 8
 *   3. puntos carrusel       121 x  50
 *   4. destacados          1282 x 654  #2C2C2C, 3 imagenes 296 x 457
 *   5. "Novedades"           136 x  24  #2C2C2C
 *   6. grilla de productos  1220 x 424  tarjetas 290 x 424, gap 20
 *
 * Las imagenes son las exportadas del propio Figma.
 */

const DESTACADOS = [
  { src: PRODUCTOS[0].imagen, alt: PRODUCTOS[0].nombre },
  { src: PRODUCTOS[1].imagen, alt: PRODUCTOS[1].nombre },
  { src: PRODUCTOS[0].imagen, alt: PRODUCTOS[0].nombre },
];

const SLIDES = [
  { src: PRODUCTOS[0].imagen, alt: PRODUCTOS[0].nombre },
  { src: PRODUCTOS[1].imagen, alt: PRODUCTOS[1].nombre },
];

export default function PaginaInicio() {
  return (
    <div className="flex flex-col">
      {/* Banner 1282 x 410 */}
      <section aria-label="Banner principal" className="relative h-[410px] w-full bg-[#F5F5F5]">
        <div className="absolute inset-0">
          <Image
            src={SLIDES[0].src}
            alt={SLIDES[0].alt}
            fill
            sizes="(max-width: 640px) 100vw, 1282px"
            className="object-cover"
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#2C2C2C]/70 via-[#2C2C2C]/20 to-transparent" />
        <div className="relative mx-auto flex h-full w-full max-w-[1287px] items-center px-4">
          <p className="max-w-[520px] text-4xl font-semibold leading-[39px] text-white">
            Calzado deportivo y urbano
          </p>
        </div>
      </section>

      {/* Boton newsletter 308 x 50, blanco, radio 8, padding 8/12 */}
      <div className="flex justify-center py-8">
        <Link
          href="/catalogo?newsletter=1"
          className="flex h-[50px] w-[308px] items-center justify-center gap-6 rounded-lg bg-white px-3 py-2 transition-opacity hover:opacity-90"
        >
          <span className="text-base font-medium leading-[16px] text-black">
            Suscríbete a NewsLetter
          </span>
        </Link>
      </div>

      {/* Puntos del carrusel 121 x 50, gap 4 */}
      <div
        aria-label="Paginas del banner"
        className="flex h-[50px] w-[121px] items-center justify-center gap-4 px-6 py-1.5"
      >
        {SLIDES.map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={`h-2 w-2 rounded-full ${i === 0 ? "bg-[#CF1A1F]" : "bg-[#D9D9D9]"}`}
          />
        ))}
      </div>

      {/* Destacados 1282 x 654, fondo #2C2C2C */}
      <section aria-label="Productos destacados" className="w-full bg-[#2C2C2C]">
        <div className="mx-auto flex h-[654px] w-full max-w-[1287px] flex-col items-center justify-center gap-[131px] px-4">
          <div className="flex items-center gap-[131px]">
            {DESTACADOS.map((s) => (
              <div
                key={s.alt}
                className="relative h-[457px] w-[296px] overflow-hidden rounded-lg bg-[#444444]"
              >
                <Image
                  src={s.src}
                  alt={s.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, 296px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
          <Link
            href="/catalogo"
            className="text-2xl font-semibold leading-[29px] text-white transition-opacity hover:opacity-80"
          >
            Ver Catálogo Completo
          </Link>
        </div>
      </section>

      {/* Novedades 136 x 24, #2C2C2C, 20px/700 */}
      <section aria-label="Novedades" className="mx-auto w-full max-w-[1287px] px-4 py-10">
        <h2 className="text-xl font-bold leading-[24px] text-[#2C2C2C]">Novedades</h2>

        {/* Grilla 1220 x 424: tarjetas 290 x 424, gap 20 */}
        <div className="mt-6 flex flex-wrap gap-5">
          {PRODUCTOS.map((p) => (
            <ProductoCard key={p.slug} producto={p} />
          ))}
        </div>
      </section>
    </div>
  );
}