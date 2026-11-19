import { z } from "zod";

/**
 * Esquemas y constantes del Modulo Carrito
 * (Sprint 3 - Abril Poggio. RF-21, RF-29, RN-01, RN-04, RN-05).
 */

/**
 * RN-04 / RF-29: la reserva dura entre 1 y 2 minutos. Se fija en 120 segundos
 * (2 minutos exactos), el máximo de la ventana definida para dar comodidad al comprador.
 */
export const DURACION_RESERVA_SEG = 120;

/** RF-21: tope defensivo por linea; el tope real es el stock (RN-05). */
export const CANTIDAD_MAXIMA_POR_ITEM = 99;

/** RN-01: sin sesion no hay carrito. Mensaje para acciones anonimas. */
export const MENSAJE_SESION_REQUERIDA =
  "Iniciá sesión para agregar productos al carrito.";

const idReferencia = z
  .string()
  .trim()
  .min(20, "Referencia invalida.")
  .max(40, "Referencia invalida.");

/**
 * RF-21 / RF-38: alta de linea de carrito. Una linea apunta a una
 * variante fisica o a un kit, nunca a ambos (RN-06).
 */
export const agregarAlCarritoSchema = z
  .object({
    varianteId: idReferencia.optional(),
    kitProductoId: idReferencia.optional(),
    cantidad: z.coerce
      .number({ error: "Ingresá una cantidad válida" })
      .int("La cantidad debe ser un número entero")
      .min(1, "La cantidad mínima es 1")
      .max(CANTIDAD_MAXIMA_POR_ITEM, `La cantidad máxima es ${CANTIDAD_MAXIMA_POR_ITEM}`),
  })
  .refine(
    (datos) => Boolean(datos.varianteId) !== Boolean(datos.kitProductoId),
    "Indicá una variante o un kit, no ambos.",
  );

/** RF-21: modificacion de cantidad; 0 elimina la linea. */
export const actualizarCantidadSchema = z.object({
  itemId: idReferencia,
  cantidad: z.coerce
    .number({ error: "Ingresá una cantidad válida" })
    .int("La cantidad debe ser un número entero")
    .min(0, "La cantidad no puede ser negativa")
    .max(CANTIDAD_MAXIMA_POR_ITEM, `La cantidad máxima es ${CANTIDAD_MAXIMA_POR_ITEM}`),
});

export const quitarItemSchema = z.object({
  itemId: idReferencia,
});

/**
 * Estado serializable entre Server Actions y Client Components.
 * Vive fuera de `actions.ts` por la restriccion de Next.js 16 sobre
 * modulos `"use server"` (solo exportan funciones asincronas).
 */
export interface EstadoAccionCarrito {
  ok: boolean;
  mensaje?: string;
  error?: string;
  codigo?: string;
  marcaTiempo?: number;
}

export const ESTADO_INICIAL_CARRITO: EstadoAccionCarrito = {
  ok: false,
};
