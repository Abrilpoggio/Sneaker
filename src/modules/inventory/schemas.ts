import { z } from "zod";

/**
 * Esquema de extracciones de stock (Sprint 4 - Camila Viegas).
 * RN-07: una extraccion nunca computa como venta; exige motivo y
 * responsable para dejar auditoria (RF-36).
 */
export const extraccionSchema = z.object({
  varianteId: z
    .string()
    .trim()
    .min(20, "Selecciona una variante.")
    .max(40, "Variante invalida."),
  cantidad: z.coerce
    .number({ error: "Ingresa una cantidad valida." })
    .int("La cantidad debe ser un numero entero.")
    .positive("La cantidad debe ser mayor a cero."),
  motivo: z
    .string()
    .trim()
    .min(4, "Indica el motivo de la extraccion.")
    .max(300, "El motivo no puede superar los 300 caracteres."),
});

export type ExtraccionInput = z.infer<typeof extraccionSchema>;
