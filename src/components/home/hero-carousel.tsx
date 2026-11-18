"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface SlideBanner {
  src: string;
  alt: string;
  href: string;
}

const SLIDES: SlideBanner[] = [
  {
    src: "/figma/banner-home-1.png",
    alt: "Nike Astrograbber - Calzado deportivo y urbano",
    href: "/catalogo?marca=nike",
  },
  {
    src: "/figma/banner-home-2.png",
    alt: "Descuentos exclusivos Tienda Oficial Adidas - 6 cuotas sin interés",
    href: "/catalogo?marca=adidas",
  },
  {
    src: "/figma/banner-home-3.png",
    alt: "On Cloudrunner 3 - Descubrilas en 6 cuotas sin interés",
    href: "/catalogo?marca=on-running",
  },
];

export function HeroCarousel() {
  const [indice, setIndice] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    if (pausado) return;
    const timer = window.setInterval(() => {
      setIndice((prev) => (prev + 1) % SLIDES.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [pausado]);

  const irAnterior = () => {
    setIndice((prev) => (prev - 1 + SLIDES.length) % SLIDES.length);
  };

  const irSiguiente = () => {
    setIndice((prev) => (prev + 1) % SLIDES.length);
  };

  return (
    <section
      aria-label="Banner principal"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      className="group relative h-[260px] w-full overflow-hidden bg-[#1E1E1E] sm:h-[360px] lg:h-[410px]"
    >
      {/* Tira deslizable horizontal */}
      <div
        className="flex h-full w-full transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${indice * 100}%)` }}
      >
        {SLIDES.map((slide, idx) => (
          <Link
            key={slide.src}
            href={slide.href}
            aria-label={slide.alt}
            className="relative h-full w-full shrink-0"
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="100vw"
              priority={idx === 0}
              className="object-cover object-center"
            />
          </Link>
        ))}
      </div>

      {/* Flechas laterales de navegación */}
      <button
        type="button"
        aria-label="Banner anterior"
        onClick={irAnterior}
        className="absolute left-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-black/70 group-hover:opacity-100 sm:left-5 sm:h-10 sm:w-10"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          className="h-5 w-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6" />
        </svg>
      </button>

      <button
        type="button"
        aria-label="Banner siguiente"
        onClick={irSiguiente}
        className="absolute right-3 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition-all hover:bg-black/70 group-hover:opacity-100 sm:right-5 sm:h-10 sm:w-10"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          className="h-5 w-5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
        </svg>
      </button>

      {/* Puntos indicadores del carrusel abajo al centro */}
      <div
        role="tablist"
        aria-label="Seleccionar banner"
        className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-black/35 px-3.5 py-1.5 backdrop-blur-xs"
      >
        {SLIDES.map((slide, idx) => {
          const activo = idx === indice;
          return (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-selected={activo}
              aria-label={`Ir al banner ${idx + 1}`}
              onClick={() => setIndice(idx)}
              className={`h-2.5 rounded-full transition-all ${
                activo ? "w-6 bg-[#E53935]" : "w-2.5 bg-white/75 hover:bg-white"
              }`}
            />
          );
        })}
      </div>

      {/* Botón newsletter superpuesto abajo a la derecha como en el mockup de Figma */}
      <div className="absolute bottom-4 right-4 z-10 sm:bottom-5 sm:right-8">
        <Link
          href="/newsletter"
          className="flex h-[38px] items-center justify-center gap-2 rounded-lg bg-white px-4 py-1.5 shadow-md transition-transform hover:scale-[1.02] sm:h-[42px] sm:px-5"
        >
          <span className="text-xs font-semibold leading-[16px] text-black sm:text-sm">
            ★ Suscríbete a NewsLetter
          </span>
        </Link>
      </div>
    </section>
  );
}
