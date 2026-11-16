import Image from "next/image";
import Link from "next/link";

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
    src: PRODUCTOS[0].imagen,
    alt: PRODUCTOS[0].nombre,
  },
  {
    titulo: "MUJER",
    href: "/catalogo?categoria=mujeres",
    src: PRODUCTOS[1].imagen,
    alt: PRODUCTOS[1].nombre,
  },
  {
    titulo: "NIÑOS",
    href: "/catalogo?categoria=niños",
    src: PRODUCTOS[0].imagen,
    alt: PRODUCTOS[0].nombre,
  },
];

export default async function PaginaInicio() {
  let productosBase: ProductoCatalogo[] = [];
  try {
    productosBase = await listarCatalogo({ disponibilidad: "todas", orden: "relevancia" });
  } catch {
    productosBase = [];
  }

  return (
    <div data-full-bleed className="flex w-full flex-col">
      {/* Banner principal a ancho 100% sin desborde de scrollbar ni margen blanco a la derecha */}
      <section
        aria-label="Banner principal"
        className="relative h-[380px] w-full overflow-hidden bg-gradient-to-r from-[#1F1F1F] via-[#2C2C2C] to-[#7C0300] sm:h-[410px]"
      >
        {/* Imagenes decorativas del banner contenidas sin pixelarse ni dejar franja blanca */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-full max-w-[760px] items-center justify-end pr-6 opacity-90 sm:pr-16">
          <div className="relative h-[320px] w-[420px] sm:h-[370px] sm:w-[520px]">
            <Image
              src={PRODUCTOS[0].imagen}
              alt={PRODUCTOS[0].nombre}
              fill
              sizes="(max-width: 768px) 80vw, 520px"
              className="object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)]"
              priority
            />
          </div>
        </div>

        <div className="relative mx-auto flex h-full w-full max-w-[1287px] items-center px-6 sm:px-8">
          <div className="flex max-w-[540px] flex-col gap-3">
            <p className="text-3xl font-bold leading-tight text-white drop-shadow sm:text-4xl">
              Calzado deportivo y urbano
            </p>
            <p className="text-base font-light text-white/85 sm:text-lg">
              Encontrá tus próximos pares con reserva inmediata y envíos a todo el país.
            </p>
          </div>
        </div>

        {/* Boton newsletter superpuesto abajo a la derecha como en el mockup de Figma */}
        <div className="absolute bottom-5 right-6 z-10 sm:right-10">
          <Link
            href="/newsletter"
            className="flex h-[44px] items-center justify-center gap-2.5 rounded-lg bg-white px-5 py-2 shadow-md transition-opacity hover:opacity-90"
          >
            <span className="text-sm font-semibold leading-[16px] text-black sm:text-base">
              ★ Suscríbete a NewsLetter
            </span>
          </Link>
        </div>
      </section>

      {/* Destacados a ancho completo, fondo #2C2C2C pegado al banner como en el mockup */}
      <section aria-label="Productos destacados" className="w-full bg-[#2C2C2C] py-12">
        <div className="mx-auto flex w-full max-w-[1287px] flex-col items-center justify-center gap-10 px-4 sm:px-8">
          <div className="grid w-full max-w-[1040px] grid-cols-1 justify-items-center gap-8 md:grid-cols-3 lg:gap-12">
            {DESTACADOS.map((s) => (
              <Link
                key={s.titulo}
                href={s.href}
                className="group relative flex h-[380px] w-full max-w-[296px] flex-col items-center justify-between overflow-hidden rounded-lg bg-gradient-to-b from-[#3A3A3A] to-[#1E1E1E] p-6 shadow-lg transition-transform hover:-translate-y-1"
              >
                <span className="z-10 text-lg font-extrabold tracking-wider text-white">
                  {s.titulo}
                </span>
                <div className="relative my-auto h-[240px] w-full">
                  <Image
                    src={s.src}
                    alt={s.alt}
                    fill
                    sizes="280px"
                    className="object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <span className="text-sm font-medium text-white/80 underline-offset-4 group-hover:text-white group-hover:underline">
                  Ver colección
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