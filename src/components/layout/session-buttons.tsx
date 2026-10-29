"use client";

import Link from "next/link";

import { useRutasAuth, useSesion } from "@/lib/auth-client";
import { RolUsuario } from "@/generated/prisma/enums";

/**
 * Acciones de sesion en el Header principal reconstruidas 1:1 desde Figma:
 *
 * - Visitante (sin sesion activa):
 *   Muestra unicamente el boton de texto "INGRESAR" que redirige a `/login`
 *   conservando la ventana actual en `callbackUrl`.
 *
 * - Usuario autenticado (`CLIENTE` o `ADMIN`):
 *   Renderiza los iconos de Carrito (`/carrito`), Perfil (`/cuenta` o `/admin`)
 *   y Favoritos (`/cuenta/favoritos`).
 */
export function SessionButtons() {
  const { data: sesion, status } = useSesion();
  const { loginHref } = useRutasAuth();

  const autenticado =
    status === "authenticated" && Boolean(sesion?.user && !sesion.error);
  const esAdmin = sesion?.user?.rol === RolUsuario.ADMIN;

  if (!autenticado) {
    return (
      <Link
        href={loginHref}
        className="text-[18px] font-bold tracking-[0.03em] uppercase text-white transition-opacity hover:opacity-80 sm:text-[20px]"
      >
        INGRESAR
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-6 sm:gap-[34px]">
      {/* 1. Shopping Cart (42 x 42) */}
      <Link
        href="/carrito"
        aria-label="Carrito de compras"
        className="flex h-[42px] w-[42px] items-center justify-center text-white transition-opacity hover:opacity-80"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-[36px] w-[36px]"
        >
          <circle cx="9" cy="21" r="1.5" />
          <circle cx="20" cy="21" r="1.5" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
          />
        </svg>
      </Link>

      {/* 2. Profile Circle (42 x 42) */}
      <Link
        href={esAdmin ? "/admin" : "/cuenta"}
        aria-label={esAdmin ? "Panel de administración" : "Mi perfil"}
        title={
          sesion?.user?.name ??
          sesion?.user?.usuario ??
          (esAdmin ? "Panel Admin" : "Mi Cuenta")
        }
        className="flex h-[42px] w-[42px] items-center justify-center text-white transition-opacity hover:opacity-80"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="h-[36px] w-[36px]"
        >
          <circle cx="12" cy="12" r="9.5" />
          <circle cx="12" cy="9.5" r="3" />
          <path strokeLinecap="round" d="M6.5 18.5a6.5 6.5 0 0 1 11 0" />
        </svg>
      </Link>

      {/* 3. Heart / Favoritos (42 x 42) */}
      <Link
        href="/cuenta/favoritos"
        aria-label="Mis favoritos"
        className="flex h-[42px] w-[42px] items-center justify-center text-white transition-opacity hover:opacity-80"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="h-[36px] w-[36px]"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
          />
        </svg>
      </Link>
    </div>
  );
}
