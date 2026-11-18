import Image from "next/image";
import Link from "next/link";

import { HeroCarousel } from "@/components/home/hero-carousel";
import { ProductoCard } from "@/components/product-card";
import { ProductoCatalogoCard } from "@/components/producto-catalogo-card";
import { listarCatalogo, type ProductoCatalogo } from "@/modules/catalogo/catalogo";
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
  {
    titulo: "HOMBRE",
    href: "/catalogo?categoria=hombres",
    src: "/figma/destacado-hombre.png",
    alt: "Colección Hombre",
  },
  {
    titulo: "MUJER",
    href: "/catalogo?categoria=mujeres",
    src: "/figma/destacado-mujer.png",
    alt: "Colección Mujer",
  },
  {
    titulo: "NIÑOS",
    href: "/catalogo?categoria=niños",
    src: "/figma/destacado-ninos.png",
    alt: "Colección Niños",
  },
];

export const dynamic = "force-dynamic";

export default async function PaginaInicio() {
  let productosBase: ProductoCatalogo[] = [];
  try {
    productosBase = await listarCatalogo({ disponibilidad: "todas", orden: "relevancia" });
  } catch {
    productosBase = [];
  }

  return (
    <div data-full-bleed className="flex w-full flex-col">
      {/* Carrusel deslizable automático con los 3 banners exportados de Figma */}
      <HeroCarousel />

      {/* Destacados a ancho completo, fondo #2C2C2C pegado al banner como en el mockup */}
      <section aria-label="Productos destacados" className="w-full bg-[#2C2C2C] py-12">
        <div className="mx-auto flex w-full max-w-[1287px] flex-col items-center justify-center gap-10 px-4 sm:px-8">
          <div className="grid w-full max-w-[1040px] grid-cols-1 justify-items-center gap-8 md:grid-cols-3 lg:gap-12">
            {DESTACADOS.map((s) => (
              <Link
                key={s.titulo}
                href={s.href}
                className="group relative h-[420px] w-full max-w-[296px] overflow-hidden rounded-lg bg-[#444444] shadow-lg transition-transform hover:-translate-y-1"
              >
                <Image
                  src={s.src}
                  alt={s.alt}
                  fill
                  sizes="296px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/45" />
                <span className="absolute left-0 right-0 top-5 text-center text-xl font-extrabold tracking-wider text-white drop-shadow">
                  {s.titulo}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/catalogo"
            className="text-xl font-semibold tracking-wide uppercase underline decoration-white/70 underline-offset-4 text-white transition-opacity hover:opacity-80"
          >
            Ver Catálogo Completo
          </Link>
        </div>
      </section>

      {/* Novedades: 4 tarjetas alineadas en una sola fila en escritorio */}
      <section aria-label="Novedades" className="mx-auto w-full max-w-[1287px] px-4 py-10 sm:px-8">
        <h2 className="text-xl font-bold leading-[24px] uppercase text-[#2C2C2C]">
          Novedades
        </h2>

        <div className="mt-6 grid grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {productosBase.length > 0
            ? productosBase.slice(0, 4).map((p) => (
                <ProductoCatalogoCard key={p.id} producto={p} />
              ))
            : PRODUCTOS.slice(0, 4).map((p) => <ProductoCard key={p.slug} producto={p} />)}
        </div>
      </section>
    </div>
  );
}