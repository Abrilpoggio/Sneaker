import { z } from "zod";

/**
 * Esquemas del Modulo Checkout
 * (Sprint 3 - Camila Viegas. RF-22, RF-23, RF-24, RF-25, RF-26, RF-27,
 * RN-05, RN-08).
 */

/** RN-08: un unico cupon por compra. El alcance exacto de "por
 * usuario" sigue pendiente de precision del cliente; por ahora el
 * motor limita a un cupon por pedido (ver README). */
export const MENSAJE_UN_CUPON_POR_COMPRA =
  "Solo se puede aplicar un cupón por compra.";

export const aplicarCuponSchema = z.object({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .min(3, "Ingresá el código del cupón")
    .max(40, "El código es demasiado largo")
    .regex(/^[A-Z0-9_-]+$/, "El código solo admite letras y números"),
});

export interface EstadoAccionCheckout {
  ok: boolean;
  mensaje?: string;
  error?: string;
  codigo?: string;
  redirectUrl?: string;
  marcaTiempo?: number;
}

export const ESTADO_INICIAL_CHECKOUT: EstadoAccionCheckout = {
  ok: false,
};

export interface EstadoDireccionCheckout {
  ok: boolean;
  mensaje?: string;
  error?: string;
  erroresCampos?: Record<string, string>;
}

export const ESTADO_INICIAL_DIRECCION_CHECKOUT: EstadoDireccionCheckout = {
  ok: false,
};
