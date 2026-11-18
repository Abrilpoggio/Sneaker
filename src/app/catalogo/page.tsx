import Link from "next/link";

import { ProductoCatalogoCard } from "@/components/producto-catalogo-card";
import {
  listarCatalogo,
  obtenerFacetas,
  type DisponibilidadCatalogo,
  type FiltrosCatalogo,
  type OrdenCatalogo,
} from "@/modules/catalogo/catalogo";

/**
 * Catalogo publico con datos de la base. Sprint 2 - Camila Viegas.
 *
 * El banner y la grilla de tarjetas provienen del mockup de Figma
 * (`Vista 2: Catalogo y busqueda`, 1281 x 5354 px); la barra de
 * filtros implementa RF-07 (busqueda y filtros combinados) y el
 * ordenamiento por disponibilidad de RF-09.
 *
 * El formulario usa GET: los filtros viven en la URL, asi que un
 * resultado filtrado se puede compartir o recargar sin perderlo.
 */

interface ParametrosCatalogo {
  q?: string;
  categoria?: string;
  marca?: string;
  etiqueta?: string;
  talle?: string;
  color?: string;
  material?: string;
  disponibilidad?: string;
  orden?: string;
}

const inputClass =
  "w-full rounded border border-[#D9D9D9] bg-white px-3 py-2 text-base text-[#2C2C2C] outline-none focus:border-[#CF1A1F] focus:ring-1 focus:ring-[#CF1A1F]";

const ORDENES: { valor: OrdenCatalogo; etiqueta: string }[] = [
  { valor: "relevancia", etiqueta: "Disponibles primero" },
  { valor: "precio-asc", etiqueta: "Menor precio" },
  { valor: "precio-desc", etiqueta: "Mayor precio" },
  { valor: "nombre", etiqueta: "Nombre (A-Z)" },
];

export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<ParametrosCatalogo>;
}) {
  const parametros = await searchParams;
  const filtros: FiltrosCatalogo = {
    q: parametros.q,
    categoria: parametros.categoria,
    marca: parametros.marca,
    etiqueta: parametros.etiqueta,
    talle: parametros.talle,
    color: parametros.color,
    material: parametros.material,
    disponibilidad: (parametros.disponibilidad ?? "todas") as DisponibilidadCatalogo,
    orden: (parametros.orden ?? "relevancia") as OrdenCatalogo,
  };

  const [productos, facetas] = await Promise.all([listarCatalogo(filtros), obtenerFacetas()]);
  const hayFiltros = Object.values(parametros).some((valor) => Boolean(valor?.trim()));

  return (
    <div data-full-bleed className="flex w-full flex-col">
      {/* BANNER a ancho completo con foto oficial de Figma */}
      <section
        aria-label="Banner del catalogo"
        className="relative h-[250px] w-full overflow-hidden bg-[#2C2C2C] sm:h-[289px]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/figma/banner-catalogo.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#CF1A1F]/70 via-[#2C2C2C]/65 to-[#1E1E1E]/85" />
        <div className="relative mx-auto flex h-full w-full max-w-[1287px] flex-col items-center justify-center gap-3 px-6 text-center sm:px-10">
          <h1 className="text-3xl font-extrabold tracking-wide text-white drop-shadow sm:text-[52px] sm:leading-[62px]">
            CATÁLOGO COMPLETO
          </h1>
          <p className="text-lg font-medium italic tracking-wide text-white/95 drop-shadow sm:text-2xl">
            TODOS NUESTROS PRODUCTOS
          </p>
        </div>
        <Link
          href="/"
          className="absolute left-6 top-5 flex items-center gap-2.5 text-lg font-bold uppercase text-white transition-opacity hover:opacity-80 sm:left-10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/figma/arrow-volver.svg"
            alt=""
            aria-hidden
            className="h-7 w-7 shrink-0"
          />
          <span>VOLVER</span>
        </Link>
      </section>

      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-8 px-4 py-8 lg:flex-row lg:items-start lg:px-6">
        {/* Barra lateral izquierda de filtros (RF-07 / RF-09) pegada al margen izquierdo */}
        <aside
          aria-label="Filtros"
          className="w-full shrink-0 rounded-lg border border-[#D9D9D9] bg-[#FAFAFA] p-4 lg:sticky lg:top-6 lg:w-[250px]"
        >
          <div className="mb-4 flex items-center justify-between border-b border-[#E5E5E5] pb-3">
            <h2 className="text-lg font-bold text-[#2C2C2C]">Filtros</h2>
            {hayFiltros && (
              <Link
                href="/catalogo"
                className="text-sm font-medium text-[#CF1A1F] underline transition-opacity hover:opacity-75"
              >
                Limpiar todo
              </Link>
            )}
          </div>

          <form method="get" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filtro-q"
                className="text-sm font-semibold text-[#2C2C2C]"
              >
                Buscar
              </label>
              <input
                id="filtro-q"
                name="q"
                defaultValue={filtros.q ?? ""}
                placeholder="Nombre, marca, SKU..."
                className={inputClass}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filtro-orden"
                className="text-sm font-semibold text-[#2C2C2C]"
              >
                Ordenar por
              </label>
              <select
                id="filtro-orden"
                name="orden"
                defaultValue={filtros.orden}
                className={inputClass}
              >
                {ORDENES.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.etiqueta}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filtro-categoria"
                className="text-sm font-semibold text-[#2C2C2C]"
              >
                Categoría
              </label>
              <select
                id="filtro-categoria"
                name="categoria"
                defaultValue={filtros.categoria ?? ""}
                className={inputClass}
              >
                <option value="">Todas las categorías</option>
                {facetas.categorias.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filtro-marca"
                className="text-sm font-semibold text-[#2C2C2C]"
              >
                Marca
              </label>
              <select
                id="filtro-marca"
                name="marca"
                defaultValue={filtros.marca ?? ""}
                className={inputClass}
              >
                <option value="">Todas las marcas</option>
                {facetas.marcas.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filtro-etiqueta"
                className="text-sm font-semibold text-[#2C2C2C]"
              >
                Uso / Deporte
              </label>
              <select
                id="filtro-etiqueta"
                name="etiqueta"
                defaultValue={filtros.etiqueta ?? ""}
                className={inputClass}
              >
                <option value="">Todos los usos</option>
                {facetas.etiquetas.map((e) => (
                  <option key={e.slug} value={e.slug}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filtro-talle"
                className="text-sm font-semibold text-[#2C2C2C]"
              >
                Talle
              </label>
              <select
                id="filtro-talle"
                name="talle"
                defaultValue={filtros.talle ?? ""}
                className={inputClass}
              >
                <option value="">Todos los talles</option>
                {facetas.talles.map((t) => (
                  <option key={t} value={t}>
                    Talle {t}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filtro-color"
                className="text-sm font-semibold text-[#2C2C2C]"
              >
                Color
              </label>
              <select
                id="filtro-color"
                name="color"
                defaultValue={filtros.color ?? ""}
                className={inputClass}
              >
                <option value="">Todos los colores</option>
                {facetas.colores.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filtro-material"
                className="text-sm font-semibold text-[#2C2C2C]"
              >
                Material
              </label>
              <select
                id="filtro-material"
                name="material"
                defaultValue={filtros.material ?? ""}
                className={inputClass}
              >
                <option value="">Todos los materiales</option>
                {facetas.materiales.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="filtro-disponibilidad"
                className="text-sm font-semibold text-[#2C2C2C]"
              >
                Disponibilidad
              </label>
              <select
                id="filtro-disponibilidad"
                name="disponibilidad"
                defaultValue={filtros.disponibilidad}
                className={inputClass}
              >
                <option value="todas">Con o sin stock</option>
                <option value="con-stock">Solo con stock</option>
                <option value="sin-stock">Solo sin stock</option>
              </select>
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded bg-[#CF1A1F] px-5 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#7C0300]"
            >
              Aplicar filtros
            </button>
          </form>
        </aside>

        {/* Columna principal de productos */}
        <section aria-label="Productos" className="flex flex-1 flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E5E5] pb-4">
            <h2 className="text-lg font-semibold leading-[22px] text-black">
              {productos.length === 1
                ? "1 producto encontrado"
                : `${productos.length} productos encontrados`}
            </h2>
          </div>

          <div className="mt-6 flex flex-wrap gap-5">
            {productos.map((producto) => (
              <ProductoCatalogoCard key={producto.id} producto={producto} />
            ))}
          </div>

          {productos.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-xl text-[#9E9E9E]">
                No encontramos productos que coincidan con tu búsqueda.
              </p>
              {hayFiltros && (
                <Link
                  href="/catalogo"
                  className="mt-4 inline-block text-base font-semibold text-[#CF1A1F] underline"
                >
                  Ver todo el catálogo
                </Link>
              )}
            </div>
          )}

          <p className="mt-8 text-sm text-[#9E9E9E]">
            Los productos sin stock se muestran al final con su indicación, pero no se
            eliminan del catálogo.
          </p>
        </section>
      </div>
    </div>
  );
}
