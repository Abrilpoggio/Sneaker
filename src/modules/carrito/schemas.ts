import { z } from "zod";

/**
 * Esquemas y constantes del Modulo Carrito
 * (Sprint 3 - Abril Poggio. RF-21, RF-29, RN-01, RN-04, RN-05).
 */

/**
 * RN-04: la reserva dura entre 1 y 2 minutos. Se fija en 90 segundos,
 * el punto medio de la ventana que pide el cliente.
 */
export const DURACION_RESERVA_SEG = 90;

/** RF-21: tope defensivo por linea; el tope real es el stock (RN-05). */
export const CANTIDAD_MAXIMA_POR_ITEM = 99;

/** RN-01: sin sesion no hay carrito. Mensaje para acciones anonimas. */
export const MENSAJE_SESION_REQUERIDA =
  "Iniciá sesión para agregar productos al carrito (RN-01).";

const idVariante = z
  .string()
  .trim()
  .min(20, "Variante invalida.")
  .max(40, "Variante invalida.");

/** RF-21: alta de linea de carrito con tope de stock (RN-05). */
export const agregarAlCarritoSchema = z.object({
  varianteId: idVariante,
  cantidad: z.coerce
    .number({ error: "Ingresá una cantidad válida" })
    .int("La cantidad debe ser un número entero")
    .min(1, "La cantidad mínima es 1")
    .max(CANTIDAD_MAXIMA_POR_ITEM, `La cantidad máxima es ${CANTIDAD_MAXIMA_POR_ITEM}`),
});

/** RF-21: modificacion de cantidad; 0 elimina la linea. */
export const actualizarCantidadSchema = z.object({
  itemId: idVariante,
  cantidad: z.coerce
    .number({ error: "Ingresá una cantidad válida" })
    .int("La cantidad debe ser un número entero")
    .min(0, "La cantidad no puede ser negativa")
    .max(CANTIDAD_MAXIMA_POR_ITEM, `La cantidad máxima es ${CANTIDAD_MAXIMA_POR_ITEM}`),
});

export const quitarItemSchema = z.object({
  itemId: idVariante,
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
