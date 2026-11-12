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
    <div className="flex flex-col">
      {/* BANNER 1283 x 289, radio 2 */}
      <section
        aria-label="Banner del catalogo"
        className="relative h-[289px] w-full overflow-hidden rounded-sm bg-[#2C2C2C]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#CF1A1F] via-[#7C0300] to-[#2C2C2C]" />
        <div className="relative mx-auto flex h-full w-full max-w-[1287px] flex-col justify-center gap-8 px-4">
          <h1 className="text-[56px] font-extrabold leading-[68px] text-white">
            CATÁLOGO COMPLETO
          </h1>
          <p className="text-2xl font-medium leading-[29px] text-white">
            TODOS NUESTROS PRODUCTOS
          </p>
        </div>
        <Link
          href="/"
          className="absolute left-4 top-4 text-xl font-bold leading-[24px] text-white transition-opacity hover:opacity-80"
        >
          Volver
        </Link>
      </section>

      <section aria-label="Filtros" className="mx-auto w-full max-w-[1287px] px-4 pt-8">
        {/* RF-07: busqueda y filtros combinados en un solo formulario */}
        <form
          method="get"
          className="grid gap-3 rounded-md border border-[#D9D9D9] bg-[#FAFAFA] p-4 md:grid-cols-3 lg:grid-cols-4"
        >
          <label className="sr-only" htmlFor="filtro-q">
            Buscar productos
          </label>
          <input
            id="filtro-q"
            name="q"
            defaultValue={filtros.q ?? ""}
            placeholder="Buscar por nombre, marca, SKU o deporte"
            className={`${inputClass} md:col-span-3 lg:col-span-2`}
          />

          <label className="sr-only" htmlFor="filtro-categoria">
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

          <label className="sr-only" htmlFor="filtro-marca">
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

          <label className="sr-only" htmlFor="filtro-etiqueta">
            Uso / deporte
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

          <label className="sr-only" htmlFor="filtro-talle">
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

          <label className="sr-only" htmlFor="filtro-color">
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

          <label className="sr-only" htmlFor="filtro-material">
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

          <label className="sr-only" htmlFor="filtro-disponibilidad">
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

          <label className="sr-only" htmlFor="filtro-orden">
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

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded bg-[#CF1A1F] px-5 py-2 text-base font-semibold text-white transition-colors hover:bg-[#7C0300]"
            >
              Filtrar
            </button>
            {hayFiltros && (
              <Link
                href="/catalogo"
                className="text-base text-[#4E4E4E] underline transition-opacity hover:opacity-70"
              >
                Limpiar
              </Link>
            )}
          </div>
        </form>
      </section>

      {/* "Todos nuestros Productos" 18px / 600 / lh22, #000000 */}
      <section aria-label="Productos" className="mx-auto w-full max-w-[1287px] px-4 py-10">
        <h2 className="text-lg font-semibold leading-[22px] text-black">
          {productos.length === 1
            ? "1 producto encontrado"
            : `${productos.length} productos encontrados`}
        </h2>

        {/* Filas de tarjetas 1220 x 424, gap 20 */}
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
  );
}
