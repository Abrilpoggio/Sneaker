"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SideMenu } from "./side-menu";
import { SessionButtons } from "./session-buttons";

/**
 * Header reconstruido 1:1 desde el mockup de Figma con los assets vectoriales
 * e imagenes exportados directamente del archivo (`UBA7sQnuni2Z0PtuhuMJZ8`).
 *
 * Variantes presentes en el archivo de Figma:
 * 1. `Header de Autenticacion` (`id: "226:1085"`, `226:1550`, `226:2033` en `Vista 5: Autenticacion`):
 *    - Barra unica de 183 px de alto, fondo #2C2C2C
 *    - Izquierda (`Frame 81`, gap 20px): flecha contorneada `/figma/arrow-volver.svg` (40x40) + "VOLVER" (Montserrat 700, 20px, #FFFFFF)
 *    - Derecha (`Frame 80`, gap 23px): wordmark `/figma/sneaker-wordmark.svg` (206 x 29) a la izquierda + logo circular `/figma/logo-circle.png` (104 x 104) a la derecha
 *
 * 2. `HEADER COMPLETO` (`Vista 2: Catalogo y busqueda` y `Header Visitante / Usuario` `226:3533`):
 *    - header1: 155 px, #2C2C2C (logo circular 104x104 + wordmark SNEAKER 206x29, buscador 325x41 #F5F5F5, iconos Carrito, Perfil, Favoritos y Menu Hamburguesa con gap 41px)
 *    - header3:  58 px, #7C0300 (avisos: OFERTAS, CUPONES)
 *    - header2:  52 px, #E53935 (categorias: Mujeres, Hombres, Niños, Urbanas, Deportivas, Medias, Accesorios)
 */

const CATEGORIAS = [
  "Mujeres",
  "Hombres",
  "Niños",
  "Urbanas",
  "Deportivas",
  "Medias",
  "Accesorios",
];
const AVISOS = ["OFERTAS", "CUPONES"];
const RUTAS_AUTH = new Set(["/login", "/registro", "/recuperar"]);

export function Header() {
  const pathname = usePathname();
  const esRutaAuth = Boolean(pathname && RUTAS_AUTH.has(pathname));

  if (esRutaAuth) {
    return (
      <header className="sticky top-0 z-40 w-full bg-[#2C2C2C]">
        <div className="flex h-[136px] w-full items-center justify-between px-6 sm:h-[156px] sm:px-[36px] xl:h-[183px]">
          {/* Frame 81 (226:1101): Flecha izquierda contorneada (40x40) + VOLVER (20px/700 blanco) */}
          <Link
            href="/"
            className="flex items-center gap-[20px] text-white transition-opacity hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/arrow-volver.svg"
              alt=""
              aria-hidden
              className="h-[34px] w-[34px] shrink-0 sm:h-[40px] sm:w-[40px]"
            />
            <span className="text-[18px] font-bold leading-[24px] uppercase text-white sm:text-[20px]">
              VOLVER
            </span>
          </Link>

          {/* Frame 80 (226:1087): Wordmark SNEAKER (206x29) a la izquierda + Logo circular (104x104) a la derecha */}
          <Link href="/" className="flex items-center gap-[18px] sm:gap-[23px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/sneaker-wordmark.svg"
              alt="SNEAKER"
              className="h-[22px] w-auto sm:h-[29px] sm:w-[206px]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/logo-circle.png"
              alt="Logo Sneaker"
              className="h-[76px] w-[76px] shrink-0 rounded-full object-contain sm:h-[92px] sm:w-[92px] xl:h-[104px] xl:w-[104px]"
            />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      {/* header1 - 155 px, #2C2C2C */}
      <div className="w-full bg-[#2C2C2C]">
        <div className="mx-auto flex h-[155px] w-full max-w-[1287px] items-center gap-6 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-[23px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/logo-circle.png"
              alt="Logo Sneaker"
              className="h-[80px] w-[80px] shrink-0 rounded-full object-contain sm:h-[104px] sm:w-[104px]"
            />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/sneaker-wordmark.svg"
              alt="SNEAKER"
              className="h-[24px] w-auto sm:h-[29px] sm:w-[206px]"
            />
          </Link>

          {/* Buscador: 325 x 41, fondo #F5F5F5, texto en cursiva a la izquierda y lupa oscura a la derecha */}
          <form
            action="/catalogo"
            role="search"
            className="mx-auto hidden h-[41px] w-[325px] items-center gap-2 rounded-[6px] bg-[#F5F5F5] px-4 lg:flex"
          >
            <input
              type="search"
              name="q"
              placeholder="Buscar productos"
              aria-label="Buscar productos"
              className="w-full bg-transparent text-[15px] font-normal text-[#2C2C2C] outline-none placeholder:italic placeholder:text-[#8A8A8A]"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="flex h-7 w-7 shrink-0 items-center justify-center text-[#1E1E1E] transition-opacity hover:opacity-75"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </form>

          {/* Visitante: "INGRESAR" + Hamburguesa | Autenticado: Carrito + Perfil + Favoritos + Hamburguesa */}
          <div className="ml-auto flex items-center gap-6 sm:gap-[34px]">
            <SessionButtons />
            <SideMenu />
          </div>
        </div>
      </div>

      {/* header3 - 58 px, #7C0300 */}
      <div className="w-full bg-[#7C0300]">
        <div className="mx-auto flex h-[58px] w-full max-w-[1287px] items-center gap-[47px] px-4 sm:px-8">
          {AVISOS.map((a) => (
            <Link
              key={a}
              href="/catalogo?ofertas=1"
              className="text-2xl font-bold text-white transition-opacity hover:opacity-80"
            >
              {a}
            </Link>
          ))}
        </div>
      </div>

      {/* header2 - 52 px, #E53935 */}
      <div className="w-full bg-[#E53935]">
        <nav
          aria-label="Categorías"
          className="mx-auto flex h-[52px] w-full max-w-[1287px] items-center gap-[47px] overflow-x-auto px-4 sm:px-8"
        >
          {CATEGORIAS.map((c) => (
            <Link
              key={c}
              href={`/catalogo?categoria=${encodeURIComponent(c.toLowerCase())}`}
              className="shrink-0 text-xl font-medium text-white transition-opacity hover:opacity-80"
            >
              {c}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
