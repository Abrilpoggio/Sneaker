import { z } from "zod";

/**
 * Esquemas de validacion para el ABM de Promociones (RF-41)
 * y Cupones de Descuento (RF-42).
 */

const porcentajeSchema = z
  .string()
  .trim()
  .min(1, "Ingresá el porcentaje de descuento.")
  .transform((v) => Number(v.replace(",", ".")))
  .pipe(
    z
      .number()
      .finite("Debe ser un número válido.")
      .min(1, "El descuento mínimo es 1%.")
      .max(90, "El descuento máximo permitido es 90%."),
  );

const fechaObligatoria = z
  .string()
  .trim()
  .min(1, "Seleccioná una fecha.")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida.");

const fechaOpcional = z
  .string()
  .trim()
  .transform((v) => (v.length > 0 ? v : null))
  .refine(
    (v) => v === null || !Number.isNaN(Date.parse(v)),
    "Fecha de fin inválida.",
  );

export const crearPromocionSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(3, "El nombre debe tener al menos 3 caracteres.")
      .max(120, "El nombre es demasiado largo."),
    porcentajeDescuento: porcentajeSchema,
    fechaInicio: fechaObligatoria,
    fechaFin: fechaObligatoria,
    activa: z.boolean().default(true),
    productoIds: z.array(z.string()).default([]),
  })
  .refine(
    (data) => new Date(data.fechaFin).getTime() >= new Date(data.fechaInicio).getTime(),
    {
      message: "La fecha de fin debe ser igual o posterior a la de inicio.",
      path: ["fechaFin"],
    },
  );

export const crearCuponSchema = z
  .object({
    codigo: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "El código debe tener al menos 3 caracteres.")
      .max(40, "El código no puede superar los 40 caracteres.")
      .regex(
        /^[A-Z0-9_-]+$/,
        "El código solo puede contener letras, números, guiones o guión bajo.",
      ),
    porcentajeDescuento: porcentajeSchema,
    fechaVigencia: fechaObligatoria,
    fechaVigenciaFin: fechaOpcional,
    descripcion: z
      .string()
      .trim()
      .max(200, "La descripción no puede superar los 200 caracteres.")
      .transform((v) => (v.length > 0 ? v : null)),
    activo: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (!data.fechaVigenciaFin) return true;
      return (
        new Date(data.fechaVigenciaFin).getTime() >=
        new Date(data.fechaVigencia).getTime()
      );
    },
    {
      message: "La fecha de vencimiento debe ser igual o posterior al inicio.",
      path: ["fechaVigenciaFin"],
    },
  );

export interface EstadoAccionMarketing {
  ok: boolean;
  mensaje?: string;
  error?: string;
  erroresCampos?: Record<string, string>;
}

export const ESTADO_INICIAL_MARKETING: EstadoAccionMarketing = {
  ok: false,
};
