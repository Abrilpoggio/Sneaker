"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useRutasAuth } from "@/lib/auth-client";
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
  "Kits",
];
const RUTAS_AUTH = new Set([
  "/login",
  "/registro",
  "/recuperar",
  "/recuperar/restablecer",
]);
const ENLACES_CUENTA = [
  { href: "/cuenta/pedidos", label: "Mis Compras" },
  { href: "/cuenta/favoritos", label: "Mis Favoritos" },
  { href: "/cuenta/direcciones", label: "Mis Direcciones" },
  { href: "/cuenta", label: "Mi Perfil" },
];

export function Header() {
  const pathname = usePathname();
  const { volverHref } = useRutasAuth();
  const esRutaAuth = Boolean(pathname && RUTAS_AUTH.has(pathname));
  const esRutaCuenta = Boolean(
    pathname && (pathname === "/cuenta" || pathname.startsWith("/cuenta/")),
  );
  const esRutaAdmin = Boolean(
    pathname && (pathname === "/admin" || pathname.startsWith("/admin/")),
  );

  if (esRutaAuth) {
    return (
      <header className="sticky top-0 z-40 w-full bg-[#2C2C2C]">
        <div className="flex h-[84px] w-full items-center justify-between px-6 sm:h-[96px] sm:px-[36px]">
          <Link
            href={volverHref}
            className="flex items-center gap-3 text-white transition-opacity hover:opacity-80"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/arrow-volver.svg"
              alt=""
              aria-hidden
              className="h-[28px] w-[28px] shrink-0 sm:h-[32px] sm:w-[32px]"
            />
            <span className="text-[15px] font-bold leading-[20px] uppercase text-white sm:text-[17px]">
              VOLVER
            </span>
          </Link>

          <Link href="/" className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/sneaker-wordmark.svg"
              alt="SNEAKER"
              className="h-[20px] w-auto sm:h-[24px]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/logo-circle.png"
              alt="Logo Sneaker"
              className="h-[56px] w-[56px] shrink-0 rounded-full object-contain sm:h-[68px] sm:w-[68px]"
            />
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 w-full shadow-sm">
      {/* header1 - compacto y proporcionado al 100% de zoom */}
      <div className="w-full bg-[#2C2C2C]">
        <div className="flex h-[76px] w-full items-center justify-between gap-6 px-5 sm:h-[88px] sm:px-8 lg:px-12">
          <Link href="/" className="flex shrink-0 items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/logo-circle.png"
              alt="Logo Sneaker"
              className="h-[54px] w-[54px] shrink-0 rounded-full object-contain sm:h-[64px] sm:w-[64px]"
            />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/figma/sneaker-wordmark.svg"
              alt="SNEAKER"
              className="h-[19px] w-auto sm:h-[23px]"
            />
          </Link>

          {/* Buscador central */}
          <form
            action="/catalogo"
            role="search"
            className="mx-auto hidden h-[38px] w-full max-w-[400px] items-center gap-2 rounded-[6px] bg-[#F5F5F5] px-3.5 lg:flex xl:max-w-[460px]"
          >
            <input
              type="search"
              name="q"
              placeholder="Buscar productos"
              aria-label="Buscar productos"
              className="w-full bg-transparent text-[14px] font-normal text-[#2C2C2C] outline-none placeholder:italic placeholder:text-[#8A8A8A]"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="flex h-6 w-6 shrink-0 items-center justify-center text-[#1E1E1E] transition-opacity hover:opacity-75"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </form>

          {/* Visitante: "INGRESAR" + Hamburguesa | Autenticado: Carrito + Perfil + Favoritos + Hamburguesa */}
          <div className="ml-auto flex shrink-0 items-center gap-3.5 sm:gap-4">
            <SessionButtons />
            <SideMenu />
          </div>
        </div>

        {/* Buscador compacto en movil y tablet (RNF-01) */}
        <div className="mx-auto w-full max-w-[1440px] px-4 pb-2.5 lg:hidden">
          <form
            action="/catalogo"
            role="search"
            className="flex h-[36px] w-full items-center gap-2 rounded-[6px] bg-[#F5F5F5] px-3"
          >
            <input
              type="search"
              name="q"
              placeholder="Buscar zapatillas, marcas o talles..."
              aria-label="Buscar productos"
              className="w-full bg-transparent text-[14px] font-normal text-[#2C2C2C] outline-none placeholder:italic placeholder:text-[#8A8A8A]"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="flex h-6 w-6 shrink-0 items-center justify-center text-[#1E1E1E]"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m20 20-3.5-3.5" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {esRutaAdmin ? null : esRutaCuenta ? (
        /* header2 de Cuenta: compacto 38px, #E53935 */
        <div className="w-full bg-[#E53935]">
          <nav
            aria-label="Secciones de mi cuenta"
            className="mx-auto flex h-[38px] w-full max-w-[1440px] items-center justify-start gap-6 overflow-x-auto px-4 sm:justify-center sm:gap-9 lg:gap-11"
          >
            {ENLACES_CUENTA.map((enlace, idx) => {
              const activo =
                enlace.href === "/cuenta"
                  ? pathname === "/cuenta" ||
                    pathname === "/cuenta/perfil" ||
                    pathname === "/cuenta/seguridad"
                  : pathname === enlace.href ||
                    Boolean(pathname?.startsWith(`${enlace.href}/`));
              return (
                <div
                  key={enlace.href}
                  className="flex shrink-0 items-center gap-6 sm:gap-9 lg:gap-11"
                >
                  {idx > 0 && (
                    <span
                      aria-hidden
                      className="h-4 w-px bg-white/80"
                    />
                  )}
                  <Link
                    href={enlace.href}
                    aria-current={activo ? "page" : undefined}
                    className={`text-[14px] leading-[20px] text-white transition-opacity hover:opacity-80 sm:text-[15px] ${
                      activo
                        ? "font-semibold underline decoration-2 underline-offset-4"
                        : "font-medium"
                    }`}
                  >
                    {enlace.label}
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>
      ) : (
        <>
          {/* header3 - barra fina de OFERTAS y CUPONES (32px) */}
          <div className="w-full bg-[#7C0300]">
            <div className="mx-auto flex h-[32px] w-full max-w-[1440px] items-center justify-center gap-6 px-4 sm:h-[34px] sm:gap-10 sm:px-8">
              <Link
                href="/catalogo?ofertas=1"
                className="flex items-center gap-1.5 text-[13px] font-bold italic tracking-wide text-white transition-opacity hover:opacity-80 sm:text-[14px]"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 2 14.4 4.8 18 4.2l.6 3.6L21.4 10l-1.8 3.2.6 3.6-3.6-.6L14.2 19l-2.2-2.8L9.8 19l-2.4-2.8-3.6.6.6-3.6L2.6 10l2.8-2.2L6 4.2l3.6.6L12 2Z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 15 6-6" />
                  <circle cx="9.5" cy="9.5" r="1" fill="currentColor" />
                  <circle cx="14.5" cy="14.5" r="1" fill="currentColor" />
                </svg>
                <span>OFERTAS</span>
              </Link>

              <span aria-hidden className="h-3.5 w-px bg-white/70" />

              <Link
                href="/cupones"
                className="flex items-center gap-1.5 text-[13px] font-bold italic tracking-wide text-white transition-opacity hover:opacity-80 sm:text-[14px]"
              >
                <span>CUPONES</span>
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 5v2m0 10v2m0-8v2" />
                </svg>
              </Link>
            </div>
          </div>

          {/* header2 - barra fina de Categorías (36px) */}
          <div className="w-full bg-[#E53935]">
            <nav
              aria-label="Categorías"
              className="mx-auto flex h-[34px] w-full max-w-[1440px] items-center justify-between gap-2 overflow-x-auto px-4 sm:h-[36px] sm:px-8"
            >
              {CATEGORIAS.map((c, idx) => (
                <div key={c} className="flex flex-1 items-center justify-center">
                  {idx > 0 && (
                    <span
                      aria-hidden
                      className="mr-auto hidden h-3.5 w-px bg-white/70 md:block"
                    />
                  )}
                  <Link
                    href={`/catalogo?categoria=${encodeURIComponent(c.toLowerCase())}`}
                    className="mx-auto shrink-0 px-2 text-[14px] font-medium italic text-white transition-opacity hover:opacity-80 sm:text-[15px]"
                  >
                    {c}
                  </Link>
                </div>
              ))}
            </nav>
          </div>
        </>
      )}
    </header>
  );
}
