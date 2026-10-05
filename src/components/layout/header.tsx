import Link from "next/link";

import { SideMenu } from "./side-menu";

/**
 * Header reconstruido desde el mockup de Figma.
 *
 * Fuente: `HEADER COMPLETO`, 1287 x 263 px, en `Vista 2: Catalogo y busqueda`.
 * Medidas, colores y tipografia tomadas del archivo, no aproximadas.
 *
 * Tres barras apiladas, cada una con su color:
 *   header1  155 px  #2C2C2C  logo + wordmark, buscador, INGRESAR
 *   header3   58 px  #7C0300  avisos: OFERTAS, CUPONES
 *   header2   52 px  #E53935  categorias: Mujeres, Hombres, ...
 *
 * El logo del archivo es un circulo blanco de 104 x 104 (imagen)
 * y, al lado, el wordmark SNEAKERS de 206 x 29, con la "A" en #CF1A1F.
 */

const CATEGORIAS = ["Mujeres", "Hombres", "Ninos", "Urbanas", "Deportivas", "Medias", "Accesorios"];
const AVISOS = ["OFERTAS", "CUPONES"];

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full">
      {/* header1 - 155 px, #2C2C2C */}
      <div className="w-full bg-[#2C2C2C]">
        <div className="mx-auto flex h-[155px] w-full max-w-[1287px] items-center gap-6 px-4">
          <div className="flex items-center gap-6">
            {/* Logo: circulo 104 x 104 (imagen del archivo) */}
            <span
              aria-hidden
              className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-full bg-white"
            >
              <span className="h-[80px] w-[80px] rounded-full bg-[#F5F5F5]" />
            </span>

            {/* Wordmark SNEAKERS, 206 x 29, "A" en #CF1A1F */}
            <span className="text-2xl font-extrabold tracking-tight text-[#F5F5F5]">
              SNE<span className="text-[#CF1A1F]">A</span>KERS
            </span>
          </div>

          {/* Buscador: 325 x 41, fondo #F5F5F5, placeholder #9E9E9E 16px/500 */}
          <form
            action="/catalogo"
            role="search"
            className="hidden h-[41px] w-[325px] items-center gap-3 rounded-md bg-[#F5F5F5] px-4 lg:flex"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9E9E9E"
              strokeWidth="1.5"
              className="h-6 w-6 shrink-0"
            >
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              name="q"
              placeholder="Buscar productos"
              aria-label="Buscar productos"
              className="w-full bg-transparent text-base font-medium text-[#2C2C2C] outline-none placeholder:text-[#9E9E9E]"
            />
          </form>

          <div className="ml-auto flex items-center gap-[25px]">
            <SideMenu />

            <Link
              href="/login"
              className="hidden text-2xl font-semibold text-white transition-opacity hover:opacity-80 sm:block"
            >
              INGRESAR
            </Link>
          </div>
        </div>
      </div>

      {/* header3 - 58 px, #7C0300 */}
      <div className="w-full bg-[#7C0300]">
        <div className="mx-auto flex h-[58px] w-full max-w-[1287px] items-center gap-[47px] px-4">
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
          aria-label="Categorias"
          className="mx-auto flex h-[52px] w-full max-w-[1287px] items-center gap-[47px] overflow-x-auto px-4"
        >
          {CATEGORIAS.map((c) => (
            <Link
              key={c}
              href={`/catalogo?categoria=${c.toLowerCase()}`}
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