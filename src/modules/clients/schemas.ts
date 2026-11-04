import { z } from "zod";

import { direccionSchema, perfilSchema } from "@/modules/auth/schemas";

/**
 * Esquemas y constantes de validacion del Modulo 2: Perfil & Clientes
 * (Sprint 2 - CU3, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RN-02, RN-03).
 */

/** RN-02 / RF-17: Tope estricto de direcciones por cliente. */
export const MAXIMO_DIRECCIONES_POR_CLIENTE = 3;

export const MENSAJE_LIMITE_DIRECCIONES =
  "Has alcanzado el límite de direcciones asociadas por cuenta.";

export const MENSAJE_CAMPOS_INMUTABLES =
  "El usuario y el correo electrónico asociados a la cuenta no pueden modificarse (RN-03).";

/**
 * Estado serializable compartido entre Server Actions y Client Components
 * del Modulo 2 (`PerfilPanel`, `SeguridadPanel`, `DireccionesManager`).
 *
 * Vive fuera de `actions.ts` porque en Next.js 16 los modulos `"use server"`
 * solo pueden exportar funciones asincronas en tiempo de ejecucion.
 */
export interface EstadoAccionCliente {
  ok: boolean;
  mensaje?: string;
  error?: string;
  codigo?: string;
  erroresCampos?: Record<string, string[]>;
  marcaTiempo?: number;
}

export const ESTADO_INICIAL_CLIENTE: EstadoAccionCliente = {
  ok: false,
};

/**
 * RF-15 / RF-16 / RN-03: Actualizacion de datos personales del cliente.
 *
 * Extiende `perfilSchema` permitiendo informar `dni` unicamente cuando el
 * cliente aun no lo tiene registrado (ej. alta por Google OAuth o formulario
 * rapido). El servicio verifica en BD que un `dni` ya cargado jamas se modifique.
 */
export const actualizarPerfilClienteSchema = perfilSchema.extend({
  dni: z
    .union([
      z.literal(""),
      z
        .string()
        .trim()
        .regex(/^\d{7,8}$/, "Ingresá un DNI válido (7 u 8 dígitos numéricos)")
        .transform((val) => Number(val)),
      z
        .number({ error: "El DNI debe contener solo números" })
        .int("El DNI debe ser un número entero")
        .min(1000000, "Ingresá un DNI válido (7 u 8 dígitos)")
        .max(99999999, "El DNI debe tener como máximo 8 dígitos"),
    ])
    .optional(),
});

export type ActualizarPerfilClienteInput = z.infer<
  typeof actualizarPerfilClienteSchema
>;

/**
 * RF-14 / Mockup Figma `Seguridad` (`341:947`): Cambio de contrasena.
 * Respeta las recomendaciones del mockup: al menos 8 caracteres incluyendo
 * letras y numeros.
 */
export const cambiarPasswordClienteSchema = z
  .object({
    passwordActual: z.string().optional().or(z.literal("")),
    passwordNueva: z
      .string()
      .min(8, "La nueva contraseña debe tener al menos 8 caracteres")
      .max(72, "La contraseña no puede superar los 72 caracteres")
      .regex(
        /(?=.*[A-Za-z])(?=.*\d)/,
        "Usá al menos 8 caracteres, incluyendo letras y números",
      ),
    confirmarPassword: z.string().min(1, "Confirmá la nueva contraseña"),
  })
  .refine((datos) => datos.passwordNueva === datos.confirmarPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmarPassword"],
  });

export type CambiarPasswordClienteInput = z.infer<
  typeof cambiarPasswordClienteSchema
>;

/**
 * RF-17 / RF-18 / RF-19 / RN-02: Alta y edicion de direccion de envio.
 * Reutiliza `direccionSchema` definido en `src/modules/auth/schemas.ts`.
 */
export const direccionClienteSchema = direccionSchema;

export type DireccionClienteInput = z.infer<typeof direccionClienteSchema>;

/**
 * Provincias de Argentina (RNF-04: alcance nacional del sistema).
 */
export const PROVINCIAS_ARGENTINA = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

/**
 * Verifica si un payload crudo intenta modificar `usuario` o `correo`
 * (flujo alternativo de CU3 / RF-16 / RN-03).
 */
export function intentaModificarUsuarioOCorreo(
  payload: Record<string, unknown>,
  actual: { usuario: string; correo: string },
): boolean {
  if (typeof payload.usuario === "string") {
    const u = payload.usuario.trim().toLowerCase();
    if (u.length > 0 && u !== actual.usuario.toLowerCase()) {
      return true;
    }
  }

  if (typeof payload.correo === "string") {
    const c = payload.correo.trim().toLowerCase();
    if (c.length > 0 && c !== actual.correo.toLowerCase()) {
      return true;
    }
  }

  if (typeof payload.email === "string") {
    const c = payload.email.trim().toLowerCase();
    if (c.length > 0 && c !== actual.correo.toLowerCase()) {
      return true;
    }
  }

  return false;
}

