"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { ESTADO_INICIAL_CARRITO, type EstadoAccionCarrito } from "../schemas";

/**
 * Mapa de fotos reales por (sku -> color) para que al elegir un color
 * distinto en el detalle de producto cambie la foto mostrada.
 */
const IMAGENES_POR_SKU_COLOR: Record<string, Record<string, string>> = {
  "nike-air-force-1-07": {
    Blanco: "/productos/nike-air-force-1-07-1.png",
    Negro: "/productos/variantes/nike-air-force-1-07-negro.jpg",
  },
  "adidas-forum-low-cl": {
    "Blanco/Negro": "/productos/adidas-forum-low-cl-1.png",
    "Blanco/Verde": "/productos/variantes/adidas-forum-low-cl-blanco-verde.jpg",
  },
  "nike-dunk-low-panda": {
    "Blanco/Negro": "/productos/nike-dunk-low-panda.jpg",
    "Rojo/Blanco": "/productos/variantes/nike-dunk-low-panda-rojo-blanco.jpg",
  },
  "puma-suede-classic-roja": {
    "Rojo/Blanco": "/productos/puma-suede-roja.jpg",
    "Negro/Blanco": "/productos/variantes/puma-suede-classic-roja-negro-blanco.jpg",
  },
  "new-balance-550-verde": {
    "Blanco/Verde": "/productos/new-balance-550-verde.jpg",
    "Blanco/Azul": "/productos/variantes/new-balance-550-verde-blanco-azul.jpg",
  },
  "nike-air-max-90-negra": {
    Negro: "/productos/nike-air-max-90-negra.jpg",
    "Blanco/Gris": "/productos/variantes/nike-air-max-90-negra-blanco-gris.jpg",
  },
  "SNK-DEP-001": {
    "Gris/Naranja": "/productos/zapatilla-deportiva-cloud.png",
    "Gris/Azul": "/productos/variantes/snk-dep-001-gris-azul.jpg",
  },
  "SNK-KID-001": {
    "Blanco/Azul/Rojo": "/productos/zapatilla-ninos-velcro.jpg",
    "Rosa/Blanco": "/productos/variantes/snk-kid-001-rosa-blanco.jpg",
  },
  "vans-old-skool-negra": {
    "Negro/Blanco": "/productos/vans-old-skool-negra.jpg",
    "Bordo/Blanco": "/productos/variantes/vans-old-skool-negra-bordo-blanco.jpg",
  },
  "converse-chuck-taylor-high": {
    "Negro/Blanco": "/productos/converse-chuck-taylor-high.jpg",
    "Rojo/Blanco": "/productos/variantes/converse-chuck-taylor-high-rojo-blanco.jpg",
  },
  "asics-gel-nimbus-26": {
    "Azul/Celeste": "/productos/asics-gel-nimbus-azul.jpg",
    "Negro/Lima": "/productos/variantes/asics-gel-nimbus-26-negro-lima.jpg",
  },
  "reebok-club-c-85-vintage": {
    "Crema/Verde": "/productos/reebok-club-c-vintage.jpg",
    "Crema/Rosa": "/productos/variantes/reebok-club-c-85-vintage-crema-rosa.jpg",
  },
  "adidas-superstar-kids": {
    "Blanco/Negro": "/productos/adidas-superstar-ninos.jpg",
    "Blanco/Rosa": "/productos/variantes/adidas-superstar-kids-blanco-rosa.jpg",
    "Blanco/Azul": "/productos/variantes/adidas-superstar-kids-blanco-azul.jpg",
  },
  "puma-rsx-efekt-gris": {
    "Gris/Negro/Azul": "/productos/puma-rsx-gris-negro.jpg",
    "Gris/Rojo": "/productos/variantes/puma-rsx-efekt-gris-gris-rojo.jpg",
  },
  "salomon-xt6-trail": {
    "Oliva/Gris": "/productos/salomon-xt6-trail.jpg",
    "Negro/Plata": "/productos/variantes/salomon-xt6-trail-negro-plata.jpg",
  },
  "fila-disruptor-ii": {
    Blanco: "/productos/fila-disruptor-blanca.jpg",
    "Rosa Pastel": "/productos/variantes/fila-disruptor-ii-rosa-pastel.jpg",
  },
  "nike-pegasus-40-running": {
    "Azul Marino/Naranja": "/productos/nike-pegasus-40-running.jpg",
    "Verde/Lima": "/productos/variantes/nike-pegasus-40-running-verde-lima.jpg",
  },
  "adidas-samba-clasica": {
    "Negro/Blanco": "/productos/adidas-samba-clasica.jpg",
    "Blanco/Negro": "/productos/variantes/adidas-samba-clasica-blanco-negro.jpg",
  },
  "vans-authentic-roja": {
    "Rojo/Blanco": "/productos/vans-authentic-roja.jpg",
    "Negro/Blanco": "/productos/variantes/vans-authentic-roja-negro-blanco.jpg",
  },
  "new-balance-327": {
    "Beige/Verde Oliva": "/productos/new-balance-327.jpg",
    "Gris/Blanco": "/productos/variantes/new-balance-327-gris-blanco.jpg",
  },
  "olympikus-corre-3": {
    "Lima/Verde": "/productos/olympikus-corre-3.jpg",
    "Azul/Celeste": "/productos/variantes/olympikus-corre-3-azul-celeste.jpg",
  },
  "fila-teratach-basquet": {
    "Blanco/Rojo/Azul": "/productos/fila-teratach-basquet.jpg",
    "Blanco/Verde": "/productos/variantes/fila-teratach-basquet-blanco-verde.jpg",
  },
  "nike-jordan-1-low-bred": {
    "Rojo/Blanco/Negro": "/productos/jordan-1-low-bred-toe.jpg",
    "Azul/Blanco/Negro": "/productos/variantes/nike-jordan-1-low-bred-azul-blanco-negro.jpg",
  },
  "adidas-gazelle-indoor-rosa": {
    "Rosa/Blanco": "/productos/adidas-gazelle-rosa.jpg",
    "Verde/Blanco": "/productos/variantes/adidas-gazelle-indoor-rosa-verde-blanco.jpg",
  },
  "adidas-drop-step-low": {
    "Blanco/Azul/Rojo": "/productos/zapatilla-drop-step.png",
    "Blanco/Verde/Naranja": "/productos/variantes/adidas-drop-step-low-blanco-verde-naranja.jpg",
  },
  "adidas-adizero-sl-running": {
    "Blanco/Negro": "/productos/zapatilla-urbana-adizero.png",
    "Negro/Blanco": "/productos/variantes/adidas-adizero-sl-running-negro-blanco.jpg",
  },
  "puma-future-play-turf": {
    "Azul/Coral": "/productos/puma-future-turf.jpg",
    "Verde/Amarillo": "/productos/variantes/puma-future-play-turf-verde-amarillo.jpg",
  },
  "new-balance-574-kids": {
    "Azul Marino/Gris": "/productos/new-balance-574-kids.jpg",
    "Bordo/Gris": "/productos/variantes/new-balance-574-kids-bordo-gris.jpg",
  },
};

function obtenerSwatchesColor(nombreColor: string): string[] {
  const mapa: Record<string, string> = {
    blanco: "#FFFFFF",
    negro: "#1F1F1F",
    rojo: "#D32F2F",
    rosa: "#F48FB1",
    pastel: "#F8BBD0",
    azul: "#1976D2",
    marino: "#0D47A1",
    celeste: "#4FC3F7",
    verde: "#2E7D32",
    oliva: "#687042",
    lima: "#AEEA00",
    fluor: "#76FF03",
    naranja: "#FF6D00",
    coral: "#FF7043",
    amarillo: "#FDD835",
    gris: "#757575",
    plata: "#BDBDBD",
    crema: "#F5F0DC",
    beige: "#D7CCC8",
    arena: "#C2B280",
    bordo: "#7B1F2B",
    madera: "#8D6E63",
    incoloro: "#E0F7FA",
  };
  const partes = nombreColor.toLowerCase().split(/[\s/]+/);
  const encontrados: string[] = [];
  for (const p of partes) {
    if (mapa[p] && !encontrados.includes(mapa[p])) {
      encontrados.push(mapa[p]);
    }
  }
  return encontrados.length > 0 ? encontrados.slice(0, 2) : ["#9E9E9E"];
}

export function ImagenProductoConColor({
  sku,
  imagenBase,
  alt,
  nombre,
  sinStock,
}: {
  sku?: string;
  imagenBase: string | null;
  alt: string;
  nombre: string;
  sinStock: boolean;
}) {
  const [colorActivo, setColorActivo] = useState<string | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ sku?: string; color?: string | null }>;
      if (!sku || !custom.detail?.sku || custom.detail.sku === sku) {
        setColorActivo(custom.detail?.color ?? null);
      }
    };
    window.addEventListener("sneaker:cambio-color", handler);
    return () => window.removeEventListener("sneaker:cambio-color", handler);
  }, [sku]);

  const srcActual =
    (sku && colorActivo && IMAGENES_POR_SKU_COLOR[sku]?.[colorActivo]) || imagenBase;

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-[11px] bg-[#333333] sm:h-[460px]">
      {srcActual ? (
        <Image
          key={srcActual}
          src={srcActual}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 593px"
          className={`object-cover object-center transition-opacity duration-200 ${sinStock ? "grayscale" : ""}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center p-10 text-center">
          <span className="text-[34px] font-bold leading-[41px] text-white/40">{nombre}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Componentes cliente del carrito. Encapsulan `useActionState` para
 * dar feedback inmediato (stock insuficiente, reserva, etc.) sin
 * recargar la pagina.
 */

function BotonConEstado({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || disabled} className={className}>
      {pending ? "Procesando..." : children}
    </button>
  );
}

function MensajeEstado({ estado }: { estado: EstadoAccionCarrito }) {
  if (estado.ok && estado.mensaje) {
    return (
      <p role="status" className="text-base font-medium leading-[16px] text-green-700">
        {estado.mensaje}
      </p>
    );
  }
  if (!estado.ok && estado.error) {
    return (
      <p role="alert" className="text-base font-medium leading-[16px] text-[#CF1A1F]">
        {estado.error}
      </p>
    );
  }
  return null;
}

export interface OpcionVarianteCarrito {
  id: string;
  talle: string | null;
  color: string | null;
  material: string | null;
  titulo: string;
  stock: number;
}

/**
 * RF-10 / RF-11 / RN-09 / RF-21: Selector interactivo al estilo Mercado Libre:
 * 1) Primero se selecciona el Color (si un color no tiene stock en ningún talle,
 *    aparece en gris y deshabilitado).
 * 2) Luego se selecciona el Talle para ese color (si un talle no tiene stock en
 *    el color elegido, aparece en gris y no permite seleccionarlo).
 */
export function SelectorVarianteCarrito({
  accion,
  variantes,
  sku,
  umbralUltimasUnidades = 10,
}: {
  accion: (prev: EstadoAccionCarrito, formData: FormData) => Promise<EstadoAccionCarrito>;
  variantes: OpcionVarianteCarrito[];
  sku?: string;
  umbralUltimasUnidades?: number;
}) {
  const primeraDisponible = variantes.find((v) => v.stock > 0) ?? variantes[0];
  const [varianteId, setVarianteId] = useState<string>(primeraDisponible?.id ?? "");
  const [cantidad, setCantidad] = useState<number>(1);
  const [estado, formAction] = useActionState(accion, ESTADO_INICIAL_CARRITO);

  const seleccionada =
    variantes.find((v) => v.id === varianteId) ?? primeraDisponible ?? null;

  const colorSeleccionado = seleccionada?.color ?? "Único";

  useEffect(() => {
    if (typeof window !== "undefined" && seleccionada?.color) {
      window.dispatchEvent(
        new CustomEvent("sneaker:cambio-color", {
          detail: { sku, color: seleccionada.color },
        }),
      );
    }
  }, [sku, seleccionada?.color]);

  if (!seleccionada) {
    return null;
  }

  // Agrupamos colores únicos con su stock total acumulado en todos los talles
  const mapaColores = new Map<string, number>();
  for (const v of variantes) {
    const c = v.color ?? "Único";
    mapaColores.set(c, (mapaColores.get(c) ?? 0) + v.stock);
  }
  const coloresDisponibles = Array.from(mapaColores.entries()).map(([color, stockTotal]) => ({
    color,
    stockTotal,
  }));
  const hayAlgunColorConStock = coloresDisponibles.some((c) => c.stockTotal > 0);

  // Lista de talles únicos ordenados de menor a mayor
  const tallesUnicos = Array.from(new Set(variantes.map((v) => v.talle ?? "Único"))).sort(
    (a, b) => a.localeCompare(b, "es", { numeric: true }),
  );

  const sinStock = seleccionada.stock <= 0;
  const ultimasUnidades =
    seleccionada.stock > 0 && seleccionada.stock <= umbralUltimasUnidades;

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Selector de COLOR */}
      <div className="flex flex-col gap-2">
        <p className="text-base font-normal leading-[22px] text-[#4E4E4E]">
          Color:{" "}
          <span className="font-semibold text-black">{colorSeleccionado}</span>
        </p>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colores disponibles">
          {coloresDisponibles.map(({ color, stockTotal }) => {
            const activo = color === colorSeleccionado;
            const colorAgotado = stockTotal <= 0;
            const swatches = obtenerSwatchesColor(color);

            return (
              <button
                key={color}
                type="button"
                role="radio"
                aria-checked={activo}
                disabled={colorAgotado && hayAlgunColorConStock}
                onClick={() => {
                  const variantesDelColor = variantes.filter(
                    (v) => (v.color ?? "Único") === color,
                  );
                  // Mantiene el mismo talle si tiene stock en el nuevo color, o pasa al primer talle con stock
                  const mismoTalleConStock = variantesDelColor.find(
                    (v) => v.talle === seleccionada.talle && v.stock > 0,
                  );
                  const primeraConStock =
                    mismoTalleConStock ??
                    variantesDelColor.find((v) => v.stock > 0) ??
                    variantesDelColor[0];

                  if (primeraConStock) {
                    setVarianteId(primeraConStock.id);
                    if (primeraConStock.stock > 0 && cantidad > primeraConStock.stock) {
                      setCantidad(primeraConStock.stock);
                    }
                  }
                }}
                className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium leading-[18px] transition-all ${
                  colorAgotado
                    ? "cursor-not-allowed border-[#D9D9D9] bg-[#EBEBEB] text-[#9E9E9E] line-through opacity-75"
                    : activo
                      ? "border-2 border-[#CF1A1F] bg-[#FFF5F5] text-[#CF1A1F] shadow-sm"
                      : "border-[#D9D9D9] bg-white text-black hover:border-[#CF1A1F]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="inline-flex h-4 w-4 shrink-0 overflow-hidden rounded-full border border-black/20"
                >
                  {swatches.map((hex, i) => (
                    <span
                      key={i}
                      style={{ backgroundColor: hex }}
                      className="h-full flex-1"
                    />
                  ))}
                </span>
                <span>
                  {color}
                  {colorAgotado ? " (Sin stock)" : ""}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selector de TALLE (separado del color, estilo Mercado Libre) */}
      <div className="flex flex-col gap-2">
        <p className="text-base font-normal leading-[22px] text-[#4E4E4E]">
          Talle:{" "}
          <span className="font-semibold text-black">
            {seleccionada.talle ?? "Único"}
          </span>
        </p>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Talles disponibles">
          {tallesUnicos.map((talle) => {
            const varianteEnColor = variantes.find(
              (v) =>
                (v.color ?? "Único") === colorSeleccionado &&
                (v.talle ?? "Único") === talle,
            );
            const stockTalle = varianteEnColor?.stock ?? 0;
            const agotadoEnEsteColor = !varianteEnColor || stockTalle <= 0;
            const activo =
              !agotadoEnEsteColor && varianteEnColor?.id === seleccionada.id;

            return (
              <button
                key={talle}
                type="button"
                role="radio"
                aria-checked={activo}
                disabled={agotadoEnEsteColor}
                title={
                  agotadoEnEsteColor
                    ? `Talle ${talle} sin stock en color ${colorSeleccionado}`
                    : `${stockTalle} unidades disponibles`
                }
                onClick={() => {
                  if (!varianteEnColor || agotadoEnEsteColor) return;
                  setVarianteId(varianteEnColor.id);
                  if (cantidad > varianteEnColor.stock) {
                    setCantidad(varianteEnColor.stock);
                  }
                }}
                className={`min-w-[52px] rounded-md border px-3.5 py-2 text-base font-medium leading-[18px] transition-all ${
                  agotadoEnEsteColor
                    ? "cursor-not-allowed border-[#D9D9D9] bg-[#EBEBEB] text-[#9E9E9E] line-through"
                    : activo
                      ? "border-2 border-[#CF1A1F] bg-[#FFF5F5] text-[#CF1A1F] shadow-sm"
                      : "border-[#D9D9D9] bg-white text-black hover:border-[#CF1A1F]"
                }`}
              >
                {talle}
              </button>
            );
          })}
        </div>

        {/* Estado de stock de la variante elegida (RF-10 / RF-11 / RN-09) */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {sinStock ? (
            <span className="rounded bg-[#9E9E9E] px-2.5 py-1 text-sm font-medium text-white">
              Variante sin stock disponible
            </span>
          ) : ultimasUnidades ? (
            <span className="rounded bg-[#CF1A1F] px-2.5 py-1 text-sm font-medium text-white">
              ¡Últimas {seleccionada.stock} unidades disponibles en {colorSeleccionado} (Talle{" "}
              {seleccionada.talle})!
            </span>
          ) : (
            <span className="text-sm font-medium text-[#4E4E4E]">
              Stock disponible: {seleccionada.stock} unidades
            </span>
          )}
        </div>
      </div>

      <form action={formAction} noValidate className="flex flex-col gap-3">
        <input type="hidden" name="varianteId" value={seleccionada.id} />

        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="cantidad-variante-seleccionada"
            className="text-lg font-light leading-[27px] text-black"
          >
            Cantidad:
          </label>
          <input
            id="cantidad-variante-seleccionada"
            name="cantidad"
            type="number"
            min={1}
            max={Math.max(1, seleccionada.stock)}
            disabled={sinStock}
            value={cantidad}
            onChange={(e) => {
              const valor = Number.parseInt(e.target.value, 10);
              setCantidad(Number.isNaN(valor) || valor < 1 ? 1 : valor);
            }}
            className="w-20 rounded-md border border-[#D9D9D9] px-3 py-2 text-base font-medium text-[#2C2C2C] outline-none focus:border-[#CF1A1F] disabled:bg-[#F5F5F5] disabled:text-[#9E9E9E]"
          />
          {!sinStock && (
            <span className="text-sm text-[#9E9E9E]">
              ({seleccionada.stock} disponibles)
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-3">
          <BotonConEstado
            disabled={sinStock}
            className="rounded-md bg-[#CF1A1F] px-6 py-3 text-xl font-medium leading-[16px] text-white transition-opacity hover:bg-[#7C0300] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sinStock ? "Sin stock en este talle" : "Agregar al carrito"}
          </BotonConEstado>

          <Link
            href="/carrito"
            className="rounded-md border border-[#2C2C2C] bg-white px-6 py-3 text-xl font-medium leading-[16px] text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5]"
          >
            Ver carrito
          </Link>
        </div>

        <MensajeEstado estado={estado} />
      </form>
    </div>
  );
}

/**
 * RF-21 / RF-38 / RN-06: el kit no tiene variante propia. Se agrega
 * como una linea de carrito y el stock disponible es el del componente
 * que alcanza para menos unidades.
 */
export function SelectorKitCarrito({
  accion,
  kitProductoId,
  stock,
  nombre,
}: {
  accion: (prev: EstadoAccionCarrito, formData: FormData) => Promise<EstadoAccionCarrito>;
  kitProductoId: string;
  stock: number;
  nombre: string;
}) {
  const [estado, formAction] = useActionState(accion, ESTADO_INICIAL_CARRITO);
  const [cantidad, setCantidad] = useState(1);
  const sinStock = stock <= 0;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      <input type="hidden" name="kitProductoId" value={kitProductoId} />

      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="cantidad-kit" className="text-lg font-light leading-[27px] text-black">
          Cantidad:
        </label>
        <input
          id="cantidad-kit"
          name="cantidad"
          type="number"
          min={1}
          max={Math.max(1, stock)}
          disabled={sinStock}
          value={cantidad}
          onChange={(event) => {
            const valor = Number.parseInt(event.target.value, 10);
            setCantidad(Number.isNaN(valor) || valor < 1 ? 1 : valor);
          }}
          className="w-20 rounded-md border border-[#D9D9D9] px-3 py-2 text-base font-medium text-[#2C2C2C] outline-none focus:border-[#CF1A1F] disabled:bg-[#F5F5F5] disabled:text-[#9E9E9E]"
        />
        {!sinStock && (
          <span className="text-sm text-[#9E9E9E]">({stock} kits disponibles)</span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <BotonConEstado
          disabled={sinStock}
          className="rounded-md bg-[#CF1A1F] px-6 py-3 text-xl font-medium leading-[16px] text-white transition-opacity hover:bg-[#7C0300] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sinStock ? "Kit sin stock" : "Agregar kit al carrito"}
        </BotonConEstado>
        <Link
          href="/carrito"
          className="rounded-md border border-[#2C2C2C] bg-white px-6 py-3 text-xl font-medium leading-[16px] text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5]"
        >
          Ver carrito
        </Link>
      </div>

      <p className="text-sm text-[#9E9E9E]">
        Al vender {nombre}, se descuenta el stock de cada componente por separado.
      </p>
      <MensajeEstado estado={estado} />
    </form>
  );
}

/** RF-21: alta de linea de carrito desde el detalle de producto. */
export function BotonAgregarAlCarrito({
  accion,
  varianteId,
  disponible,
  titulo,
}: {
  accion: (prev: EstadoAccionCarrito, formData: FormData) => Promise<EstadoAccionCarrito>;
  varianteId: string;
  disponible: number;
  titulo: string;
}) {
  const [estado, formAction] = useActionState(accion, ESTADO_INICIAL_CARRITO);

  return (
    <form action={formAction} noValidate className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="varianteId" value={varianteId} />
      <label className="sr-only" htmlFor={`cantidad-${varianteId}`}>
        Cantidad para {titulo}
      </label>
      <input
        id={`cantidad-${varianteId}`}
        name="cantidad"
        type="number"
        min={1}
        defaultValue={1}
        className="w-16 rounded border border-[#D9D9D9] px-2 py-1 text-base text-[#2C2C2C] outline-none focus:border-[#CF1A1F]"
      />
      <span className="text-sm text-[#9E9E9E]">({disponible} disponibles)</span>
      <BotonConEstado className="rounded bg-[#CF1A1F] px-3 py-2 text-base font-medium leading-[16px] text-white transition-opacity hover:bg-[#7C0300]">
        Agregar al carrito
      </BotonConEstado>
      <MensajeEstado estado={estado} />
    </form>
  );
}

/** RF-29 / RN-04: inicia la reserva y avanza al checkout. */
export function BotonIniciarReserva({
  accion,
  disabled,
}: {
  accion: (prev: EstadoAccionCarrito, formData: FormData) => Promise<EstadoAccionCarrito>;
  disabled?: boolean;
}) {
  const [estado, formAction] = useActionState(accion, ESTADO_INICIAL_CARRITO);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <BotonConEstado
        className="rounded-md bg-[#CF1A1F] px-6 py-3 text-xl font-medium leading-[16px] text-white transition-opacity hover:bg-[#7C0300] disabled:cursor-not-allowed disabled:opacity-50"
        >
        {disabled ? "Resolvé los items sin stock" : "Iniciar compra"}
      </BotonConEstado>
      <MensajeEstado estado={estado} />
    </form>
  );
}

/** RN-04: cancela la reserva manualmente y libera el stock. */
export function BotonCancelarReserva({
  accion,
  className,
}: {
  accion: (prev: EstadoAccionCarrito, formData: FormData) => Promise<EstadoAccionCarrito>;
  className?: string;
}) {
  const [estado, formAction] = useActionState(accion, ESTADO_INICIAL_CARRITO);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <BotonConEstado
        className={
          className ??
          "rounded border border-[#2C2C2C] px-5 py-2 text-base font-semibold text-[#2C2C2C] hover:bg-white"
        }
      >
        Cancelar reserva
      </BotonConEstado>
      <MensajeEstado estado={estado} />
    </form>
  );
}

/** RF-21: modifica cantidad o elimina la linea. */
export function ControlesItemCarrito({
  accionActualizar,
  accionQuitar,
  itemId,
  cantidad,
  maximo,
}: {
  accionActualizar: (prev: EstadoAccionCarrito, formData: FormData) => Promise<EstadoAccionCarrito>;
  accionQuitar: (prev: EstadoAccionCarrito, formData: FormData) => Promise<EstadoAccionCarrito>;
  itemId: string;
  cantidad: number;
  maximo: number;
}) {
  const [estadoActualizar, accionUpdate] = useActionState(accionActualizar, ESTADO_INICIAL_CARRITO);
  const [estadoQuitar, accionRemove] = useActionState(accionQuitar, ESTADO_INICIAL_CARRITO);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <form action={accionUpdate} noValidate className="flex items-center gap-2">
          <input type="hidden" name="itemId" value={itemId} />
          <label className="sr-only" htmlFor={`item-cantidad-${itemId}`}>
            Cantidad
          </label>
          <input
            id={`item-cantidad-${itemId}`}
            name="cantidad"
            type="number"
            min={0}
            defaultValue={cantidad}
            className="w-16 rounded border border-[#D9D9D9] px-2 py-1 text-base text-[#2C2C2C] outline-none focus:border-[#CF1A1F]"
          />
          <span className="text-sm text-[#9E9E9E]">(quedan {maximo})</span>
          <BotonConEstado className="rounded border border-[#2C2C2C] px-3 py-2 text-base font-medium text-[#2C2C2C] hover:bg-white">
            Actualizar
          </BotonConEstado>
        </form>
        <form action={accionRemove}>
          <input type="hidden" name="itemId" value={itemId} />
          <BotonConEstado className="rounded border border-[#D9D9D9] px-3 py-2 text-base font-medium text-[#4E4E4E] hover:bg-[#F5F5F5]">
            Quitar
          </BotonConEstado>
        </form>
      </div>
      <MensajeEstado estado={estadoActualizar} />
      <MensajeEstado estado={estadoQuitar} />
    </div>
  );
}

