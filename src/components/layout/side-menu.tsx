"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Panel deslizable reconstruido desde el mockup de Figma.
 *
 * Fuente: `Side Menu Visitante`, 513 x 917 px, en `Page 1 / Reutilizables`.
 * Medidas, colores y tipografia tomados del archivo, no aproximados.
 *
 * Estructura del archivo:
 *   contenedor        513 x 917
 *   bloque superior   457 x  90  #E53935, radio 20
 *     "Iniciar sesion"   24px / 500 / lh29  #FFFFFF
 *     "Registrarse"      24px / 500 / lh29  #FFFFFF
 *   bloque inferior   457 x 324  #E53935, radio 30
 *     "Mis Compras / Pedidos"  24px / 500 / lh29  #FFFFFF
 *     "Mis Favoritos"          24px / 500 / lh29  #FFFFFF
 *     "Mis Direcciones"        24px / 500 / lh29  #FFFFFF
 *     "Mi Perfil"              24px / 500 / lh29  #FFFFFF
 *
 * El disparador es el boton hamburguesa del header (42 x 42).
 */

const CUENTA = [
  { href: "/cuenta/pedidos", label: "Mis Compras / Pedidos" },
  { href: "/cuenta/favoritos", label: "Mis Favoritos" },
  { href: "/cuenta/direcciones", label: "Mis Direcciones" },
  { href: "/cuenta", label: "Mi Perfil" },
];

export function SideMenu() {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("keydown", alPulsar);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPulsar);
      document.body.style.overflow = "";
    };
  }, [abierto]);

  return (
    <>
      {/* Hamburguesa 42 x 42 */}
      <button
        type="button"
        aria-label="Abrir menu"
        aria-expanded={abierto}
        onClick={() => setAbierto(true)}
        className="flex h-[42px] w-[42px] flex-col items-center justify-center gap-[5px] rounded-md text-white transition-colors hover:bg-white/10"
      >
        <span aria-hidden className="block h-[2px] w-7 bg-current" />
        <span aria-hidden className="block h-[2px] w-7 bg-current" />
        <span aria-hidden className="block h-[2px] w-7 bg-current" />
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50">
          {/* Fondo oscuro */}
          <button
            type="button"
            aria-label="Cerrar menu"
            onClick={() => setAbierto(false)}
            className="absolute inset-0 bg-black/60 transition-opacity"
          />

          {/* Panel 513 x 917, se desliza desde la izquierda */}
          <aside
            role="dialog"
            aria-label="Menu"
            className="absolute left-0 top-0 flex h-full w-full max-w-[513px] flex-col gap-[55px] bg-[#2C2C2C] px-7 py-8 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl font-extrabold tracking-tight text-[#F5F5F5]">
                SNE<span className="text-[#CF1A1F]">A</span>KERS
              </span>
              <button
                type="button"
                aria-label="Cerrar menu"
                onClick={() => setAbierto(false)}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-md text-white transition-colors hover:bg-white/10"
              >
                <span aria-hidden className="text-3xl leading-none">×</span>
              </button>
            </div>

            {/* Bloque superior 457 x 90, #E53935, radio 20 */}
            <div className="flex w-full max-w-[457px] flex-col gap-4">
              <div className="flex h-[90px] w-full max-w-[457px] items-center justify-center gap-[10px] rounded-[20px] bg-[#E53935]">
                <Link
                  href="/login"
                  onClick={() => setAbierto(false)}
                  className="text-2xl font-medium leading-[29px] text-white transition-opacity hover:opacity-80"
                >
                  Iniciar sesión
                </Link>
                <span aria-hidden className="text-2xl text-white/40">
                  ·
                </span>
                <Link
                  href="/registro"
                  onClick={() => setAbierto(false)}
                  className="text-2xl font-medium leading-[29px] text-white transition-opacity hover:opacity-80"
                >
                  Registrarse
                </Link>
              </div>
            </div>

            {/* Bloque inferior 457 x 324, #E53935, radio 30 */}
            <nav
              aria-label="Cuenta"
              className="flex h-[324px] w-full max-w-[457px] flex-col justify-center gap-[16px] rounded-[30px] bg-[#E53935] px-10"
            >
              {CUENTA.map((enlace) => (
                <Link
                  key={enlace.href}
                  href={enlace.href}
                  onClick={() => setAbierto(false)}
                  className="text-2xl font-medium leading-[29px] text-white transition-opacity hover:opacity-80"
                >
                  {enlace.label}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}