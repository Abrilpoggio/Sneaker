"use client";

import { useState } from "react";
import Link from "next/link";

import { EnlacesNav } from "./nav-links";

/**
 * Navegacion responsive (RNF-01).
 *
 * En mobile el menu se despliega con un boton; en desktop la misma lista
 * se muestra siempre. Se usa `hidden md:flex` en vez de duplicar los links,
 * para que no haya dos listas que mantener sincronizadas.
 */
export function Nav() {
  const [abierto, setAbierto] = useState(false);

  return (
    <nav aria-label="Navegacion principal" className="relative">
      {/* Escritorio */}
      <ul className="hidden items-center gap-6 md:flex">
        <li>
          <Link
            href="/catalogo"
            className="text-sm font-medium text-texto hover:text-acento transition-colors"
          >
            Catalogo
          </Link>
        </li>
      </ul>

      {/* Mobile */}
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls="menu-mobile"
        aria-label={abierto ? "Cerrar menu" : "Abrir menu"}
        onClick={() => setAbierto((v) => !v)}
        className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-md border border-borde"
      >
        <span aria-hidden className="flex flex-col gap-1">
          <span className="block h-0.5 w-4 bg-texto" />
          <span className="block h-0.5 w-4 bg-texto" />
          <span className="block h-0.5 w-4 bg-texto" />
        </span>
      </button>

      {abierto && (
        <div
          id="menu-mobile"
          className="md:hidden absolute left-0 right-0 top-full z-50 mt-2 rounded-card border border-borde bg-fondo p-4 shadow-lg"
        >
          <EnlacesNav className="flex flex-col gap-3" />
        </div>
      )}
    </nav>
  );
}
