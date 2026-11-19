import type { Metadata } from "next";
import Link from "next/link";

import { ProductoCatalogoCard } from "@/components/producto-catalogo-card";
import { requireCliente } from "@/lib/permissions";
import { resolverComprador } from "@/modules/carrito/services/carrito";
import { listarFavoritosCliente } from "@/modules/clients/services/favoritos";

export const metadata: Metadata = {
  title: "Mis Favoritos · Sneaker",
};

/**
 * Lista de productos favoritos del cliente autenticado (RF-20).
 */
export default async function PaginaFavoritos() {
  const sesion = await requireCliente();
  const clienteId = await resolverComprador(sesion.user.id, sesion.user.email);
  const favoritos = await listarFavoritosCliente(clienteId);

  return (
    <div className="mx-auto flex w-full max-w-[1170px] flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/cuenta"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6B6B6B] transition-colors hover:text-[#CF1A1F]"
          >
            ← Volver a Mi Perfil
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-[#2C2C2C]">
            Mis Favoritos
          </h1>
          <p className="mt-0.5 text-sm text-[#6B6B6B]">
            {favoritos.length === 0
              ? "Todavía no guardaste productos en tu lista."
              : favoritos.length === 1
                ? "Tenés 1 producto guardado para volver a verlo cuando quieras."
                : `Tenés ${favoritos.length} productos guardados para volver a verlos cuando quieras.`}
          </p>
        </div>

        <Link
          href="/catalogo"
          className="inline-flex items-center justify-center rounded-md bg-[#2C2C2C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#CF1A1F]"
        >
          Explorar catálogo
        </Link>
      </div>

      {favoritos.length === 0 ? (
        <section
          aria-label="Sin favoritos"
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] px-6 py-16 text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#CF1A1F] shadow-xs">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-8 w-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 20.5s-7.5-4.7-9.2-9C1.6 8.3 3.7 5 7 5c2 0 3.6 1.1 5 2.7C13.4 6.1 15 5 17 5c3.3 0 5.4 3.3 4.2 6.5-1.7 4.3-9.2 9-9.2 9Z"
              />
            </svg>
          </div>
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-[#2C2C2C]">
              Tu lista de favoritos está vacía
            </h2>
            <p className="mt-1 text-sm text-[#6B6B6B]">
              Tocá el ícono de corazón en cualquier producto del catálogo para
              guardarlo acá y seguir su precio o stock.
            </p>
          </div>
          <Link
            href="/catalogo"
            className="mt-2 inline-flex items-center justify-center rounded-md bg-[#CF1A1F] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7C0300]"
          >
            Ir al catálogo
          </Link>
        </section>
      ) : (
        <section
          aria-label="Productos favoritos"
          className="grid grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
        >
          {favoritos.map((producto) => (
            <ProductoCatalogoCard
              key={producto.id}
              producto={producto}
              esFavorito
            />
          ))}
        </section>
      )}
    </div>
  );
}
