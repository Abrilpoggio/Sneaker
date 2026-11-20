"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface OpcionSlug {
  nombre: string;
  slug: string;
}

interface AsistenteBusquedaProps {
  categorias: OpcionSlug[];
  etiquetas: OpcionSlug[];
  talles: string[];
  tallesPorCategoria?: Record<string, string[]>;
  variante?: "banner" | "boton";
}

/**
 * Asistente guiado de busqueda en 3 pasos (RF-08).
 *
 * Guia al cliente segun uso/deporte, categoria y talle, y redirige
 * al catalogo filtrado mostrando productos disponibles primero.
 */
export function AsistenteBusqueda({
  categorias,
  etiquetas,
  talles,
  tallesPorCategoria,
  variante = "banner",
}: AsistenteBusquedaProps) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [etiqueta, setEtiqueta] = useState("");
  const [categoria, setCategoria] = useState("");
  const [talle, setTalle] = useState("");

  // Solo talles numericos de calzado; niños (<= 34) solo para categoria Niños,
  // adultos (>= 35) para Hombre, Mujer, Deportivas, Urbanas o sin categoria.
  const tallesCalzado = talles.filter((t) => /^\d{2}$/.test(t));
  const tallesAdulto = tallesCalzado.filter((t) => Number(t) >= 35);
  const tallesNinos = tallesCalzado.filter((t) => Number(t) <= 34);

  const esCategoriaNinos =
    categoria.toLowerCase().includes("niñ") ||
    categoria.toLowerCase().includes("nin");

  const tallesVisibles: string[] = (() => {
    if (!categoria) {
      return tallesAdulto.length > 0 ? tallesAdulto : tallesCalzado;
    }
    if (tallesPorCategoria) {
      return tallesPorCategoria[categoria] ?? [];
    }
    return esCategoriaNinos ? tallesNinos : tallesAdulto;
  })();

  function seleccionarCategoria(slug: string) {
    setCategoria(slug);
    setTalle("");
  }

  function reiniciar() {
    setPaso(1);
    setEtiqueta("");
    setCategoria("");
    setTalle("");
  }

  function verResultados() {
    const params = new URLSearchParams();
    if (etiqueta) params.set("etiqueta", etiqueta);
    if (categoria) params.set("categoria", categoria);
    if (talle) params.set("talle", talle);
    params.set("disponibilidad", "con-stock");
    setAbierto(false);
    router.push(`/catalogo?${params.toString()}`);
  }

  return (
    <>
      {variante === "banner" ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E5E5E5] bg-gradient-to-r from-[#2C2C2C] via-[#3A3A3A] to-[#7C0300] px-6 py-5 text-white shadow-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#FF8F8F]">
              Asistente guiado
            </p>
            <h3 className="mt-0.5 text-lg font-bold sm:text-xl">
              ¿No sabés qué zapatilla elegir? Te ayudamos en 3 pasos
            </h3>
            <p className="mt-0.5 text-xs text-white/80 sm:text-sm">
              Elegí el uso, la categoría y tu talle para encontrar tu par ideal
              con stock disponible.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              reiniciar();
              setAbierto(true);
            }}
            className="shrink-0 rounded-md bg-white px-5 py-2.5 text-sm font-bold text-[#2C2C2C] transition-colors hover:bg-[#CF1A1F] hover:text-white"
          >
            Iniciar asistente →
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            reiniciar();
            setAbierto(true);
          }}
          className="inline-flex items-center gap-2 rounded-md border border-[#CF1A1F] bg-[#FFF5F5] px-3.5 py-2 text-sm font-semibold text-[#CF1A1F] transition-colors hover:bg-[#CF1A1F] hover:text-white"
        >
          <span>✨ Asistente de búsqueda</span>
        </button>
      )}

      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Asistente guiado de búsqueda"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
          onClick={() => setAbierto(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del modal */}
            <div className="flex items-start justify-between gap-4 border-b border-[#E5E5E5] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#CF1A1F]">
                  Paso {paso} de 3 · Asistente Sneaker
                </p>
                <h2 className="mt-1 text-xl font-bold text-[#2C2C2C]">
                  {paso === 1 && "¿Para qué actividad las buscás?"}
                  {paso === 2 && "¿Qué categoría preferís?"}
                  {paso === 3 && "¿Cuál es tu talle?"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar asistente"
                className="flex h-8 w-8 items-center justify-center rounded-full text-lg font-bold text-[#6B6B6B] hover:bg-[#F5F5F5] hover:text-[#2C2C2C]"
              >
                ×
              </button>
            </div>

            {/* Barra de progreso */}
            <div className="mt-4 flex gap-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    n <= paso ? "bg-[#CF1A1F]" : "bg-[#E5E5E5]"
                  }`}
                />
              ))}
            </div>

            {/* Contenido del paso */}
            <div className="mt-5">
              {paso === 1 && (
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEtiqueta("")}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      etiqueta === ""
                        ? "border-[#CF1A1F] bg-[#CF1A1F] text-white"
                        : "border-[#D9D9D9] bg-white text-[#2C2C2C] hover:border-[#2C2C2C]"
                    }`}
                  >
                    Cualquier uso
                  </button>
                  {etiquetas.map((e) => (
                    <button
                      key={e.slug}
                      type="button"
                      onClick={() => setEtiqueta(e.slug)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                        etiqueta === e.slug
                          ? "border-[#CF1A1F] bg-[#CF1A1F] text-white"
                          : "border-[#D9D9D9] bg-white text-[#2C2C2C] hover:border-[#2C2C2C]"
                      }`}
                    >
                      {e.nombre}
                    </button>
                  ))}
                </div>
              )}

              {paso === 2 && (
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => seleccionarCategoria("")}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                      categoria === ""
                        ? "border-[#CF1A1F] bg-[#CF1A1F] text-white"
                        : "border-[#D9D9D9] bg-white text-[#2C2C2C] hover:border-[#2C2C2C]"
                    }`}
                  >
                    Todas las categorías
                  </button>
                  {categorias.map((c) => (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => seleccionarCategoria(c.slug)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                        categoria === c.slug
                          ? "border-[#CF1A1F] bg-[#CF1A1F] text-white"
                          : "border-[#D9D9D9] bg-white text-[#2C2C2C] hover:border-[#2C2C2C]"
                      }`}
                    >
                      {c.nombre}
                    </button>
                  ))}
                </div>
              )}

              {paso === 3 && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setTalle("")}
                      className={`rounded-md border px-3.5 py-2 text-sm font-semibold transition-colors ${
                        talle === ""
                          ? "border-[#CF1A1F] bg-[#CF1A1F] text-white"
                          : "border-[#D9D9D9] bg-white text-[#2C2C2C] hover:border-[#2C2C2C]"
                      }`}
                    >
                      Todos los talles
                    </button>
                    {tallesVisibles.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTalle(t)}
                        className={`min-w-[48px] rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                          talle === t
                            ? "border-[#CF1A1F] bg-[#CF1A1F] text-white"
                            : "border-[#D9D9D9] bg-white text-[#2C2C2C] hover:border-[#2C2C2C]"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  {tallesVisibles.length === 0 && (
                    <p className="text-xs text-[#6B6B6B]">
                      Esta categoría no usa talles numéricos de calzado. Podés ver todas las opciones disponibles.
                    </p>
                  )}
                  {!categoria && tallesNinos.length > 0 && (
                    <p className="text-xs text-[#6B6B6B]">
                      ¿Buscás talle de niños (27–34)? Elegí la categoría Niños en el paso anterior.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Navegacion del modal */}
            <div className="mt-7 flex items-center justify-between gap-3 border-t border-[#E5E5E5] pt-4">
              {paso > 1 ? (
                <button
                  type="button"
                  onClick={() => setPaso((p) => (p === 3 ? 2 : 1))}
                  className="rounded-md border border-[#D9D9D9] px-4 py-2 text-sm font-semibold text-[#2C2C2C] hover:bg-[#F5F5F5]"
                >
                  ← Anterior
                </button>
              ) : (
                <span />
              )}

              {paso < 3 ? (
                <button
                  type="button"
                  onClick={() => setPaso((p) => (p === 1 ? 2 : 3))}
                  className="rounded-md bg-[#2C2C2C] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#CF1A1F]"
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={verResultados}
                  className="rounded-md bg-[#CF1A1F] px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-[#7C0300]"
                >
                  Ver mis recomendaciones
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
