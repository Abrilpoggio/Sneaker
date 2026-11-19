"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

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
 *   Renderiza los iconos de Carrito (`/carrito`) con contador de unidades,
 *   Perfil (`/cuenta` o `/admin`) y Favoritos (`/cuenta/favoritos`).
 */
export function SessionButtons() {
  const { data: sesion, status } = useSesion();
  const { loginHref } = useRutasAuth();
  const pathname = usePathname();
  const [totalCarrito, setTotalCarrito] = useState(0);

  const autenticado =
    status === "authenticated" && Boolean(sesion?.user && !sesion.error);
  const esAdmin = sesion?.user?.rol === RolUsuario.ADMIN;

  useEffect(() => {
    if (!autenticado) return;
    let activo = true;
    const cargar = async () => {
      try {
        const res = await fetch("/api/carrito/resumen", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { totalItems?: number };
        if (activo && typeof data.totalItems === "number") {
          setTotalCarrito(data.totalItems);
        }
      } catch {
        // Silencioso si no hay red
      }
    };
    void cargar();
    const alActualizar = () => {
      void cargar();
    };
    window.addEventListener("sneaker:carrito-actualizado", alActualizar);
    return () => {
      activo = false;
      window.removeEventListener("sneaker:carrito-actualizado", alActualizar);
    };
  }, [autenticado, pathname]);

  if (!autenticado) {
    return (
      <Link
        href={loginHref}
        className="text-[13px] font-semibold tracking-[0.05em] uppercase text-white/95 transition-opacity hover:opacity-80 sm:text-[14px]"
      >
        INGRESAR
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      {/* 1. Carrito de compras + badge compacto */}
      <Link
        href="/carrito"
        aria-label={
          totalCarrito > 0
            ? `Carrito de compras (${totalCarrito} artículos)`
            : "Carrito de compras"
        }
        className="relative flex h-[38px] w-[38px] items-center justify-center rounded-md text-white transition-opacity hover:opacity-80"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          className="h-[23px] w-[23px] sm:h-[25px] sm:w-[25px]"
        >
          <circle cx="9" cy="21" r="1.5" />
          <circle cx="20" cy="21" r="1.5" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
          />
        </svg>
        {totalCarrito > 0 && (
          <span className="absolute right-0 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#CF1A1F] px-1 text-[10px] font-bold leading-none text-white shadow">
            {totalCarrito > 99 ? "99+" : totalCarrito}
          </span>
        )}
      </Link>

      {/* 2. Perfil / Panel Admin */}
      <Link
        href={esAdmin ? "/admin" : "/cuenta"}
        aria-label={esAdmin ? "Panel de administración" : "Mi perfil"}
        title={
          sesion?.user?.name ??
          sesion?.user?.usuario ??
          (esAdmin ? "Panel Admin" : "Mi Cuenta")
        }
        className="flex h-[38px] w-[38px] items-center justify-center rounded-md text-white transition-opacity hover:opacity-80"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          className="h-[23px] w-[23px] sm:h-[25px] sm:w-[25px]"
        >
          <circle cx="12" cy="12" r="9.5" />
          <circle cx="12" cy="9.5" r="3" />
          <path strokeLinecap="round" d="M6.5 18.5a6.5 6.5 0 0 1 11 0" />
        </svg>
      </Link>

      {/* 3. Favoritos */}
      <Link
        href="/cuenta/favoritos"
        aria-label="Mis favoritos"
        className="flex h-[38px] w-[38px] items-center justify-center rounded-md text-white transition-opacity hover:opacity-80"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          className="h-[23px] w-[23px] sm:h-[25px] sm:w-[25px]"
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
