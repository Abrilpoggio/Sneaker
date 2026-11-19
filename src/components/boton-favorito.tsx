"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import { accionAlternarFavorito } from "@/modules/clients/favoritos-actions";

interface BotonFavoritoProps {
  productoId: string;
  inicialEsFavorito: boolean;
  variante?: "icono" | "boton";
  className?: string;
}

/**
 * Boton interactivo de favoritos (RF-20).
 *
 * - `variante="icono"`: boton circular flotante pensado para las tarjetas
 *   del catalogo y la home (evita navegar al producto al hacer clic).
 * - `variante="boton"`: boton completo con etiqueta pensado para la vista
 *   de detalle del producto.
 */
export function BotonFavorito({
  productoId,
  inicialEsFavorito,
  variante = "icono",
  className = "",
}: BotonFavoritoProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [esFavorito, setEsFavorito] = useState(inicialEsFavorito);
  const [pendiente, startTransition] = useTransition();

  function manejarClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    const siguienteEstado = !esFavorito;
    setEsFavorito(siguienteEstado);

    startTransition(async () => {
      const resultado = await accionAlternarFavorito(productoId);
      if (resultado.requiereLogin) {
        setEsFavorito(inicialEsFavorito);
        const destino = pathname ? `?callbackUrl=${encodeURIComponent(pathname)}` : "";
        router.push(`/login${destino}`);
        return;
      }
      if (!resultado.ok) {
        setEsFavorito(!siguienteEstado);
        return;
      }
      if (typeof resultado.esFavorito === "boolean") {
        setEsFavorito(resultado.esFavorito);
      }
      router.refresh();
    });
  }

  const iconoCorazon = (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill={esFavorito ? "#CF1A1F" : "none"}
      stroke={esFavorito ? "#CF1A1F" : "currentColor"}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={variante === "icono" ? "h-5 w-5" : "h-5 w-5 shrink-0"}
    >
      <path d="M12 20.5s-7.5-4.7-9.2-9C1.6 8.3 3.7 5 7 5c2 0 3.6 1.1 5 2.7C13.4 6.1 15 5 17 5c3.3 0 5.4 3.3 4.2 6.5-1.7 4.3-9.2 9-9.2 9Z" />
    </svg>
  );

  if (variante === "boton") {
    return (
      <button
        type="button"
        onClick={manejarClick}
        disabled={pendiente}
        aria-pressed={esFavorito}
        aria-label={esFavorito ? "Quitar de favoritos" : "Guardar en favoritos"}
        className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
          esFavorito
            ? "border-[#CF1A1F] bg-[#FFF5F5] text-[#CF1A1F] hover:bg-[#FFEBEE]"
            : "border-[#D9D9D9] bg-white text-[#2C2C2C] hover:border-[#2C2C2C]"
        } ${className}`}
      >
        {iconoCorazon}
        <span>{esFavorito ? "En tus favoritos" : "Guardar en favoritos"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={manejarClick}
      disabled={pendiente}
      aria-pressed={esFavorito}
      aria-label={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
      title={esFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#2C2C2C] shadow-md backdrop-blur-xs transition-transform hover:scale-110 hover:bg-white disabled:opacity-60 ${className}`}
    >
      {iconoCorazon}
    </button>
  );
}
