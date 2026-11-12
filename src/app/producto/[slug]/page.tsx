import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CATEGORIAS_NAV } from "./categorias";
import {
  obtenerProductoDetalle,
  calcularEstadoStock,
  type ProductoDetalle,
} from "@/modules/catalogo/catalogo";
import { buscarProducto, formatoPrecio } from "@/modules/catalogo/productos";

/**
 * Detalle de producto reconstruido desde el mockup de Figma.
 *
 * Fuente: `Vista 4: Detalle de producto`, 1280 x 1917 px.
 *
 * Medidas y tipografia tomadas del archivo, no aproximadas:
 *   enlaces de categoria   20px / 500 / lh24  #FFFFFF
 *   "Volver"               20px / 700 / lh24  #000000
 *   "Stock disponible"     22px / 600 / lh27  #E53935
 *   nombre                 34px / 700 / lh41  #000000
 *   marca / categoria      22px / 300 / lh27  #000000
 *   talles                 18px / 500 / lh16  #000000
 *   precio anterior        32px / 500 / lh39  #FF8F8F
 *   precio                 40px / 500 / lh49  #000000
 *   "45% OFF"              16px / 500 / lh16  #FFFFFF
 *   botones                20px / 500 / lh16  #FFFFFF
 *   titulos de seccion     32px / 500 / lh39  #000000
 *
 * Sprint 2 (Camila): si el slug coincide con un SKU de la base, la
 * vista se arma con datos reales y muestra el stock de cada variante
 * (RF-10) con el aviso de ultimas unidades (RF-11 / RN-09). Los
 * productos de muestra del Sprint 1 siguen resolviendo igual.
 */

interface VarianteVista {
  id: string;
  titulo: string;
  stock: number;
}

export default async function DetalleProductoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const registro = await obtenerProductoDetalle(slug);
  if (registro) {
    return renderDesdeBase(registro);
  }

  const producto = buscarProducto(slug);
  if (!producto) notFound();

  const { nombre, marca, categoria, precio, precioAnterior, descuento, stock, imagen, talles, etiquetas, descripcion, materiales } = producto;

  return (
    <div className="flex flex-col gap-8">
      {/* Enlaces de categoria 20px / 500 / lh24 */}
      <nav aria-label="Categorias" className="flex flex-wrap gap-[47px]">
        {CATEGORIAS_NAV.map((c) => (
          <Link
            key={c}
            href={`/catalogo?categoria=${c.toLowerCase()}`}
            className="text-xl font-medium leading-[24px] text-[#2C2C2C] transition-opacity hover:opacity-70"
          >
            {c}
          </Link>
        ))}
      </nav>

      {/* Volver 20px / 700 / lh24, #000000 */}
      <Link
        href="/catalogo"
        className="text-xl font-bold leading-[24px] text-black transition-opacity hover:opacity-70"
      >
        Volver
      </Link>

      <div className="flex flex-col gap-10 lg:flex-row">
        {/* Imagen 593 x 532, fondo #2C2C2C, dentro de un marco 611 x 668 radio 4 */}
        <div className="w-full max-w-[611px] rounded-[4px] p-2">
          <div className="relative h-[532px] w-full overflow-hidden rounded-[4px] bg-[#2C2C2C]">
            <Image
              src={imagen}
              alt={`${nombre} ${marca}`}
              fill
              sizes="(max-width: 1024px) 100vw, 593px"
              className="object-cover"
            />
          </div>
        </div>

        {/* Panel de informacion */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Stock disponible 22px / 600 / lh27, #E53935 */}
          <p className="text-lg font-semibold leading-[27px] text-[#E53935]">
            Stock disponible
          </p>

          {/* Nombre 34px / 700 / lh41 */}
          <h1 className="text-[34px] font-bold leading-[41px] text-black">
            {nombre}
          </h1>

          {/* Marca y categoria 22px / 300 / lh27 */}
          <p className="text-lg font-light leading-[27px] text-black">
            Marca: {marca}
          </p>
          <p className="text-lg font-light leading-[27px] text-black">
            Categoría: {categoria}
          </p>

          {/* Talles 22px / 300 */}
          <p className="text-lg font-light leading-[27px] text-black">Talles:</p>
          <div className="flex flex-wrap gap-2">
            {talles.map((t) => (
              <button
                key={t}
                type="button"
                className="min-w-[44px] rounded-md border border-[#D9D9D9] px-3 py-2 text-base font-medium leading-[16px] text-black transition-colors hover:border-[#CF1A1F]"
              >
                {t}
              </button>
            ))}
          </div>

          {/* Precios */}
          <div className="flex items-baseline gap-4">
            {precioAnterior && (
              <span className="text-[32px] font-medium leading-[39px] text-[#FF8F8F] line-through">
                {formatoPrecio(precioAnterior)}
              </span>
            )}
            <span className="text-[40px] font-medium leading-[49px] text-black">
              {formatoPrecio(precio)}
            </span>
            {descuento && (
              <span className="rounded bg-[#CF1A1F] px-2 py-1 text-base font-medium leading-[16px] text-white">
                {descuento}% OFF
              </span>
            )}
          </div>

          {/* Cantidad */}
          <p className="text-lg font-light leading-[27px] text-black">
            Cantidad: 1 u.
          </p>

          {/* Medios de pago y direccion */}
          <div className="flex flex-col gap-2">
            <p className="text-xl font-light leading-[24px] text-black">
              Medios de pago:
            </p>
            <p className="text-xl font-light leading-[24px] text-black">
              Dirección:
            </p>
            <p className="text-base font-light leading-[22px] text-black">
              Av. Costanera 1, Colón
            </p>
            <Link
              href="/catalogo?envio=1"
              className="text-sm font-medium leading-[17px] text-[#E53935] transition-opacity hover:opacity-70"
            >
              Ver detalles de envío
            </Link>
          </div>

          {/* Etiquetas */}
          <div className="flex flex-col gap-2">
            <p className="text-base font-medium leading-[16px] text-black">
              Etiquetas
            </p>
            <div className="flex flex-wrap gap-2">
              {etiquetas.map((e) => (
                <span
                  key={e}
                  className="rounded bg-[#F5F5F5] px-3 py-1 text-base font-medium leading-[16px] text-black"
                >
                  {e}
                </span>
              ))}
            </div>
          </div>

          {/* Botones 20px / 500 / lh16 */}
          <div className="mt-2 flex flex-wrap gap-4">
            <button
              type="button"
              className="rounded-md bg-[#CF1A1F] px-6 py-3 text-xl font-medium leading-[16px] text-white transition-opacity hover:opacity-90"
            >
              Agregar al carrito
            </button>
            <button
              type="button"
              className="rounded-md bg-[#2C2C2C] px-6 py-3 text-xl font-medium leading-[16px] text-white transition-opacity hover:opacity-90"
            >
              Comprar ahora
            </button>
          </div>

          <p className="text-sm text-[#9E9E9E]">Stock: {stock} unidades</p>
        </div>
      </div>

      {/* Etiquetas de uso 18px / 500 / lh16 */}
      <section aria-label="Etiquetas de uso" className="flex flex-wrap gap-4">
        {etiquetas.map((e) => (
          <span key={e} className="text-base font-medium leading-[16px] text-black">
            {e}
          </span>
        ))}
      </section>

      {/* Descripcion y Caracteristicas 32px / 500 / lh39 */}
      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-label="Descripcion">
          <h2 className="text-[32px] font-medium leading-[39px] text-black">
            Descripción
          </h2>
          <p className="mt-4 text-xl font-light leading-[24px] text-black">
            {descripcion}
          </p>
        </section>

        <section aria-label="Caracteristicas del producto">
          <h2 className="text-[32px] font-medium leading-[39px] text-black">
            Características del producto
          </h2>
          <dl className="mt-4 flex flex-col gap-4">
            <div>
              <dt className="text-xl font-semibold leading-[24px] text-black">
                Marca
              </dt>
              <dd className="text-xl font-normal leading-[24px] text-black">
                {marca}
              </dd>
            </div>
            <div>
              <dt className="text-xl font-semibold leading-[24px] text-black">
                Materiales
              </dt>
              <dd className="text-xl font-normal leading-[24px] text-black">
                {materiales}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

/**
 * Vista con datos de la base. Cada variante declara su propio stock
 * (RF-10); una variante con 1..10 unidades avisa "ultimas unidades"
 * y una con 0 se muestra deshabilitada (RN-09).
 */
function renderDesdeBase({
  nombre,
  marca,
  categoria,
  precio,
  imagen,
  garantia,
  etiquetas,
  descripcion,
  stockTotal,
  variantes,
  componentesKit,
  sku,
}: ProductoDetalle) {
  const { sinStock, ultimasUnidades } = calcularEstadoStock(stockTotal);
  const variantesVista: VarianteVista[] = variantes.map((v) => ({
    id: v.id,
    titulo: [v.talle, v.color, v.material].filter(Boolean).join(" · ") || "Variante única",
    stock: v.stock,
  }));
  const materiales = [...new Set(variantes.map((v) => v.material).filter(Boolean))].join(", ");
  const esKit = variantesVista.length === 0 && componentesKit.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Enlaces de categoria 20px / 500 / lh24 */}
      <nav aria-label="Categorias" className="flex flex-wrap gap-[47px]">
        {CATEGORIAS_NAV.map((c) => (
          <Link
            key={c}
            href={`/catalogo?categoria=${c.toLowerCase()}`}
            className="text-xl font-medium leading-[24px] text-[#2C2C2C] transition-opacity hover:opacity-70"
          >
            {c}
          </Link>
        ))}
      </nav>

      <Link
        href="/catalogo"
        className="text-xl font-bold leading-[24px] text-black transition-opacity hover:opacity-70"
      >
        Volver
      </Link>

      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="w-full max-w-[611px] rounded-[4px] p-2">
          <div className="relative h-[532px] w-full overflow-hidden rounded-[4px] bg-[#2C2C2C]">
            {imagen ? (
              <Image
                src={imagen}
                alt={`${nombre} ${marca}`}
                fill
                sizes="(max-width: 1024px) 100vw, 593px"
                className={`object-cover ${sinStock ? "grayscale" : ""}`}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-10 text-center">
                <span className="text-[34px] font-bold leading-[41px] text-white/40">
                  {nombre}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <p
            className={`text-lg font-semibold leading-[27px] ${
              sinStock ? "text-[#9E9E9E]" : "text-[#E53935]"
            }`}
          >
            {sinStock ? "Sin stock disponible" : "Stock disponible"}
          </p>
          {ultimasUnidades && (
            <p className="inline-block w-fit rounded bg-[#CF1A1F] px-3 py-2 text-base font-medium leading-[16px] text-white">
              ¡Últimas {stockTotal} unidades!
            </p>
          )}

          <h1 className="text-[34px] font-bold leading-[41px] text-black">{nombre}</h1>

          <p className="text-lg font-light leading-[27px] text-black">Marca: {marca}</p>
          <p className="text-lg font-light leading-[27px] text-black">
            Categoría: {categoria}
          </p>
          <p className="text-sm text-[#9E9E9E]">SKU: {sku}</p>

          {/* RF-10: stock explicito por variante. RN-06: si es kit,
              se listan los componentes que determinan su stock. */}
          <p className="text-lg font-light leading-[27px] text-black">
            {variantesVista.length > 0 ? "Variantes:" : "Componentes del kit:"}
          </p>
          <ul className="flex flex-col gap-2">
            {variantesVista.length > 0
              ? variantesVista.map((v) => {
                  const estadoVariante = calcularEstadoStock(v.stock);
                  return (
                    <li
                      key={v.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-4 py-3 ${
                        estadoVariante.sinStock
                          ? "border-[#D9D9D9] bg-[#F5F5F5] text-[#9E9E9E]"
                          : "border-[#D9D9D9] bg-white text-[#2C2C2C]"
                      }`}
                    >
                      <span className="text-lg font-light leading-[27px]">{v.titulo}</span>
                      {estadoVariante.sinStock ? (
                        <span className="rounded bg-[#9E9E9E] px-2 py-1 text-base font-medium leading-[16px] text-white">
                          Sin stock
                        </span>
                      ) : estadoVariante.ultimasUnidades ? (
                        <span className="rounded bg-[#CF1A1F] px-2 py-1 text-base font-medium leading-[16px] text-white">
                          ¡Últimas {v.stock} unidades! — {v.stock} u.
                        </span>
                      ) : (
                        <span className="text-base font-medium leading-[16px] text-[#4E4E4E]">
                          {v.stock} u. disponibles
                        </span>
                      )}
                    </li>
                  );
                })
              : componentesKit.map((componente) => {
                  const estadoVariante = calcularEstadoStock(componente.stockComponente);
                  return (
                    <li
                      key={componente.titulo}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#D9D9D9] bg-white px-4 py-3 text-[#2C2C2C]"
                    >
                      <span className="text-lg font-light leading-[27px]">
                        {componente.cantidad} x {componente.titulo}
                      </span>
                      {estadoVariante.sinStock ? (
                        <span className="rounded bg-[#9E9E9E] px-2 py-1 text-base font-medium leading-[16px] text-white">
                          Sin stock
                        </span>
                      ) : estadoVariante.ultimasUnidades ? (
                        <span className="rounded bg-[#CF1A1F] px-2 py-1 text-base font-medium leading-[16px] text-white">
                          ¡Últimas {componente.stockComponente} unidades!
                        </span>
                      ) : (
                        <span className="text-base font-medium leading-[16px] text-[#4E4E4E]">
                          {componente.stockComponente} u. disponibles
                        </span>
                      )}
                    </li>
                  );
                })}
          </ul>

          <div className="flex items-baseline gap-4">
            <span className="text-[40px] font-medium leading-[49px] text-black">
              {formatoPrecio(precio)}
            </span>
          </div>

          <p className="text-lg font-light leading-[27px] text-black">
            Cantidad: 1 u.
          </p>

          <div className="flex flex-col gap-2">
            <p className="text-xl font-light leading-[24px] text-black">Medios de pago:</p>
            <p className="text-base font-light leading-[22px] text-black">
              {garantia ? `Garantía: ${garantia}` : "Sin garantía registrada"}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-base font-medium leading-[16px] text-black">Etiquetas</p>
            <div className="flex flex-wrap gap-2">
              {etiquetas.length ? (
                etiquetas.map((e) => (
                  <span
                    key={e}
                    className="rounded bg-[#F5F5F5] px-3 py-1 text-base font-medium leading-[16px] text-black"
                  >
                    {e}
                  </span>
                ))
              ) : (
                <span className="text-base font-light leading-[16px] text-[#9E9E9E]">
                  Sin etiquetas asignadas
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-4">
            <button
              type="button"
              disabled={sinStock}
              className="rounded-md bg-[#CF1A1F] px-6 py-3 text-xl font-medium leading-[16px] text-white transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Agregar al carrito
            </button>
            <button
              type="button"
              disabled={sinStock}
              className="rounded-md bg-[#2C2C2C] px-6 py-3 text-xl font-medium leading-[16px] text-white transition-opacity enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Comprar ahora
            </button>
          </div>

          <p className="text-sm text-[#9E9E9E]">
            {esKit
              ? `Stock del kit: ${stockTotal} unidades (RN-06: lo limita el componente con menor stock)`
              : `Stock total: ${stockTotal} unidades en ${variantesVista.length} ${
                  variantesVista.length === 1 ? "variante" : "variantes"
                }`}
          </p>
        </div>
      </div>

      <section aria-label="Etiquetas de uso" className="flex flex-wrap gap-4">
        {etiquetas.map((e) => (
          <span key={e} className="text-base font-medium leading-[16px] text-black">
            {e}
          </span>
        ))}
      </section>

      <div className="grid gap-10 lg:grid-cols-2">
        <section aria-label="Descripcion">
          <h2 className="text-[32px] font-medium leading-[39px] text-black">Descripción</h2>
          <p className="mt-4 text-xl font-light leading-[24px] text-black">{descripcion}</p>
        </section>

        <section aria-label="Caracteristicas del producto">
          <h2 className="text-[32px] font-medium leading-[39px] text-black">
            Características del producto
          </h2>
          <dl className="mt-4 flex flex-col gap-4">
            <div>
              <dt className="text-xl font-semibold leading-[24px] text-black">Marca</dt>
              <dd className="text-xl font-normal leading-[24px] text-black">{marca}</dd>
            </div>
            <div>
              <dt className="text-xl font-semibold leading-[24px] text-black">Materiales</dt>
              <dd className="text-xl font-normal leading-[24px] text-black">
                {materiales || "No especificado"}
              </dd>
            </div>
            <div>
              <dt className="text-xl font-semibold leading-[24px] text-black">Garantía</dt>
              <dd className="text-xl font-normal leading-[24px] text-black">
                {garantia || "No especificada"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
