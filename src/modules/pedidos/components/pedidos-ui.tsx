"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { EstadoPedido } from "@/generated/prisma/enums";
import {
  actualizarEstadoPedidoAction,
  repetirCompraAction,
  type PedidoFormState,
} from "../actions";
import {
  ETIQUETA_ESTADO_PEDIDO,
  TRANSICIONES_PERMITIDAS,
} from "../services/pedidos";

const ESTADO_INICIAL: PedidoFormState = { status: "idle" };

const PASOS_SEGUIMIENTO: { estado: EstadoPedido; titulo: string }[] = [
  { estado: "CONFIRMADO", titulo: "Confirmado" },
  { estado: "PREPARANDO", titulo: "Preparando" },
  { estado: "EN_CAMINO", titulo: "En camino" },
  { estado: "RECIBIDO", titulo: "Recibido" },
];

export function BarraProgresoPedido({ estado }: { estado: EstadoPedido }) {
  const indiceActual = PASOS_SEGUIMIENTO.findIndex((p) => p.estado === estado);
  if (indiceActual === -1) {
    return null;
  }

  return (
    <div className="mt-3">
      <ol className="grid grid-cols-4 gap-2">
        {PASOS_SEGUIMIENTO.map((paso, idx) => {
          const completado = idx <= indiceActual;
          const esActual = idx === indiceActual;
          return (
            <li key={paso.estado} className="flex flex-col gap-1.5">
              <div
                className={`h-2 w-full rounded-full transition-colors ${
                  completado ? "bg-[#CF1A1F]" : "bg-[#E0E0E0]"
                }`}
              />
              <span
                className={`text-xs ${
                  esActual
                    ? "font-bold text-[#CF1A1F]"
                    : completado
                      ? "font-semibold text-[#2C2C2C]"
                      : "font-medium text-[#9E9E9E]"
                }`}
              >
                {paso.titulo}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * RF-31 / RF-46 / CU12: selector para actualizar manualmente el estado del
 * pedido desde el panel de administracion.
 */
export function SelectorEstadoPedidoAdmin({
  pedidoId,
  estadoActual,
}: {
  pedidoId: string;
  estadoActual: EstadoPedido;
}) {
  const [state, action, pending] = useActionState(
    actualizarEstadoPedidoAction,
    ESTADO_INICIAL,
  );

  const opcionesDisponibles = TRANSICIONES_PERMITIDAS[estadoActual] ?? [];

  if (opcionesDisponibles.length === 0) {
    return (
      <p className="text-xs font-medium text-[#6B6B6B]">
        Estado final ({ETIQUETA_ESTADO_PEDIDO[estadoActual].nombre}) — no admite más cambios.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="pedidoId" value={pedidoId} />
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`estado-${pedidoId}`} className="text-xs font-semibold uppercase tracking-wide text-[#6B6B6B]">
          Cambiar estado a:
        </label>
        <select
          id={`estado-${pedidoId}`}
          name="nuevoEstado"
          defaultValue={opcionesDisponibles[0]}
          disabled={pending}
          className="h-9 rounded-[5px] border border-[#D9D9D9] bg-white px-3 text-sm font-medium text-[#2C2C2C] focus:border-[#CF1A1F] focus:outline-none"
        >
          {opcionesDisponibles.map((est) => (
            <option key={est} value={est}>
              {ETIQUETA_ESTADO_PEDIDO[est].nombre}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-[5px] bg-[#CF1A1F] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#A61217] disabled:opacity-50"
        >
          {pending ? "Guardando..." : "Actualizar estado"}
        </button>
      </div>

      {state.status === "error" && state.message && (
        <p role="alert" className="text-xs font-semibold text-[#CF1A1F]">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <p role="status" className="text-xs font-semibold text-emerald-700">
          {state.message}
        </p>
      )}
    </form>
  );
}

/**
 * RF-33 / CU10: boton para repetir una compra anterior desde el historial
 * o el detalle del pedido.
 */
export function BotonRepetirCompra({ pedidoId }: { pedidoId: string }) {
  const [state, action, pending] = useActionState(
    repetirCompraAction,
    ESTADO_INICIAL,
  );

  return (
    <div className="flex flex-col items-start gap-1.5">
      <form action={action}>
        <input type="hidden" name="pedidoId" value={pedidoId} />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center gap-2 rounded-[5px] border border-[#2C2C2C] bg-white px-4 text-sm font-semibold text-[#2C2C2C] transition-colors hover:bg-[#2C2C2C] hover:text-white disabled:opacity-50"
        >
          {pending ? "Agregando al carrito..." : "Repetir compra"}
        </button>
      </form>
      {state.status === "error" && state.message && (
        <p role="alert" className="text-xs font-semibold text-[#CF1A1F]">
          {state.message}
        </p>
      )}
      {state.status === "success" && state.message && (
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-700">
          <span>{state.message}</span>
          <Link href="/carrito" className="text-[#CF1A1F] underline">
            Ir al carrito →
          </Link>
        </div>
      )}
    </div>
  );
}
