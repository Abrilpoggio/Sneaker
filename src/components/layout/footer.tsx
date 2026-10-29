"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Footer reconstruido desde el mockup de Figma.
 *
 * Fuente: `Footer`, 1280 x 366 px, en `Page 1 / Reutilizables`.
 * En las pantallas de autenticacion (`/login`, `/registro`, `/recuperar`) no se
 * renderiza porque `Vista 5: Autenticacion` en Figma ocupa el alto completo sin pie.
 */

const CATEGORIAS = ["Urbanas", "Deportivas", "Medias", "Accesorios"];
const CONTACTOS = [
  { label: "Whatsapp", href: "https://wa.me/5490000000000" },
  { label: "Instagram", href: "https://instagram.com/" },
];
const RUTAS_SIN_FOOTER = new Set(["/login", "/registro", "/recuperar"]);

export function Footer() {
  const pathname = usePathname();
  if (pathname && RUTAS_SIN_FOOTER.has(pathname)) {
    return null;
  }

  return (
    <footer className="mt-auto w-full bg-[#2C2C2C]">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 py-12 md:flex-row md:items-start md:gap-16">
        {/* Logo: circulo 226 x 226 + wordmark 397 x 56 */}
        <div className="flex shrink-0 flex-col items-center gap-6 md:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/figma/logo-circle.png"
            alt="Logo Sneaker"
            className="h-[180px] w-[180px] rounded-full object-contain md:h-[226px] md:w-[226px]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/figma/sneaker-wordmark.svg"
            alt="SNEAKER"
            className="h-[42px] w-auto md:h-[56px] md:w-[397px]"
          />
        </div>

        {/* Categorias: titulo 32px/600, lista 24px/400, gap 30 */}
        <nav
          aria-label="Categorías del pie"
          className="flex flex-col gap-[30px]"
        >
          <h2 className="text-[32px] font-semibold leading-[39px] text-white">
            Categorias
          </h2>
          <ul className="flex flex-col gap-[2px]">
            {CATEGORIAS.map((c) => (
              <li key={c}>
                <Link
                  href={`/catalogo?categoria=${c.toLowerCase()}`}
                  className="block text-2xl font-normal leading-[29px] text-white transition-opacity hover:opacity-70"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contactanos: titulo 32px/600, lista 24px/400, gap 30 */}
        <div className="flex flex-col gap-[30px]">
          <h2 className="text-[32px] font-semibold leading-[39px] text-white">
            Contactanos
          </h2>
          <ul className="flex flex-col gap-[15px]">
            {CONTACTOS.map((c) => (
              <li key={c.label}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-2xl font-normal leading-[29px] text-white transition-opacity hover:opacity-70"
                >
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <p className="mx-auto w-full max-w-[1280px] px-4 py-4 text-sm text-white/60">
          © {new Date().getFullYear()} Sneaker · Proyecto académico, Taller de
          Integración (UADER / FCyT)
        </p>
      </div>
    </footer>
  );
}
