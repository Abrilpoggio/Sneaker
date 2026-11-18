import { z } from "zod";

/**
 * Esquemas y constantes del Modulo Newsletter
 * (Sprint 3 - Tadeo Rochas. RF-43, RF-44).
 */

export const newsletterSchema = z.object({
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .email("Ingresá un correo electrónico válido")
    .max(120, "El correo es demasiado largo"),
});

export interface EstadoAccionNewsletter {
  ok: boolean;
  mensaje?: string;
  error?: string;
  marcaTiempo?: number;
}

export const ESTADO_INICIAL_NEWSLETTER: EstadoAccionNewsletter = {
  ok: false,
};

/** RF-44: limites defensivos para el envio manual de novedades. */
export const MAXIMO_LARGO_ASUNTO = 120;
export const MAXIMO_LARGO_MENSAJE = 5000;

export const novedadesSchema = z.object({
  asunto: z
    .string()
    .trim()
    .min(3, "Ingresá un asunto")
    .max(MAXIMO_LARGO_ASUNTO, `El asunto admite hasta ${MAXIMO_LARGO_ASUNTO} caracteres`),
  mensaje: z
    .string()
    .trim()
    .min(3, "Ingresá el mensaje de la campaña")
    .max(MAXIMO_LARGO_MENSAJE, `El mensaje admite hasta ${MAXIMO_LARGO_MENSAJE} caracteres`),
});
