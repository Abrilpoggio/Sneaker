import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CATEGORIAS_NAV } from "./categorias";
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
 */

export default async function DetalleProductoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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