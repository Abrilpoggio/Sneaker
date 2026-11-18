"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { ESTADO_INICIAL_CARRITO, type EstadoAccionCarrito } from "../schemas";

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
 * RF-10 / RF-11 / RN-09 / RF-21: Selector interactivo de variante (talle / color)
 * con un único control de cantidad y un único botón "Agregar al carrito".
 */
export function SelectorVarianteCarrito({
  accion,
  variantes,
  umbralUltimasUnidades = 10,
}: {
  accion: (prev: EstadoAccionCarrito, formData: FormData) => Promise<EstadoAccionCarrito>;
  variantes: OpcionVarianteCarrito[];
  umbralUltimasUnidades?: number;
}) {
  const primeraDisponible = variantes.find((v) => v.stock > 0) ?? variantes[0];
  const [varianteId, setVarianteId] = useState<string>(primeraDisponible?.id ?? "");
  const [cantidad, setCantidad] = useState<number>(1);
  const [estado, formAction] = useActionState(accion, ESTADO_INICIAL_CARRITO);

  const seleccionada =
    variantes.find((v) => v.id === varianteId) ?? primeraDisponible ?? null;

  if (!seleccionada) {
    return null;
  }

  const sinStock = seleccionada.stock <= 0;
  const ultimasUnidades =
    seleccionada.stock > 0 && seleccionada.stock <= umbralUltimasUnidades;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="text-lg font-light leading-[27px] text-black">
          Seleccioná talle / variante:{" "}
          <span className="font-semibold text-[#2C2C2C]">{seleccionada.titulo}</span>
        </p>

        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Variantes disponibles">
          {variantes.map((v) => {
            const activa = v.id === seleccionada.id;
            const agotada = v.stock <= 0;
            const etiquetaChip =
              [v.talle ? `Talle ${v.talle}` : null, v.color].filter(Boolean).join(" · ") ||
              v.titulo;

            return (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={activa}
                onClick={() => {
                  setVarianteId(v.id);
                  if (v.stock > 0 && cantidad > v.stock) {
                    setCantidad(v.stock);
                  }
                }}
                className={`min-w-[56px] rounded-md border px-3.5 py-2 text-base font-medium leading-[18px] transition-all ${
                  activa
                    ? "border-2 border-[#CF1A1F] bg-[#FFF5F5] text-[#CF1A1F] shadow-sm"
                    : agotada
                      ? "border-[#D9D9D9] bg-[#F5F5F5] text-[#9E9E9E] line-through"
                      : "border-[#D9D9D9] bg-white text-black hover:border-[#CF1A1F]"
                }`}
              >
                {etiquetaChip}
                {agotada ? " (Sin stock)" : ""}
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
              ¡Últimas {seleccionada.stock} unidades disponibles!
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

