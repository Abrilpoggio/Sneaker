import { z } from "zod";

/**
 * Esquemas de validacion del modulo de cuentas (RF-12, RF-13, RF-14).
 *
 * Se definen aca y no en cada formulario porque el mismo objeto se usa
 * del lado del cliente (feedback inmediato) y del servidor (que es el
 * unico que decide). Un schema por formulario es una forma de saltarse
 * la validacion del servidor con una peticion manual.
 */

/** RF-13: autenticacion con credenciales. */
export const loginSchema = z.object({
  correo: z.email("Ingresa un correo valido"),
  password: z.string().min(1, "Ingresa tu contrasena"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/** RF-12 / CU2: alta de cliente. */
export const registroSchema = z
  .object({
    nombre: z.string().trim().min(2, "El nombre es obligatorio").max(60),
    apellido: z.string().trim().min(2, "El apellido es obligatorio").max(60),
    usuario: z
      .string()
      .trim()
      .toLowerCase()
      .min(3, "El usuario debe tener al menos 3 caracteres")
      .max(30)
      .regex(
        /^[a-z0-9._-]+$/,
        "Solo letras, numeros, punto, guion y guion bajo",
      ),
    correo: z.email("Ingresa un correo valido"),
    telefono: z
      .string()
      .trim()
      .regex(/^[0-9+\s-]{8,20}$/, "Ingresa un telefono valido")
      .optional()
      .or(z.literal("")),
    dni: z.coerce
      .number()
      .int("El DNI debe ser un numero entero")
      .min(10000000, "El DNI debe tener al menos 8 digitos")
      .max(99999999, "El DNI debe tener como maximo 8 digitos")
      .optional(),
    password: z
      .string()
      .min(8, "La contrasena debe tener al menos 8 caracteres")
      .max(72),
    confirmarPassword: z.string(),
  })
  .refine((datos) => datos.password === datos.confirmarPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmarPassword"],
  });

export type RegistroInput = z.input<typeof registroSchema>;

/** RF-14: recuperacion de contrasena. */
export const recuperacionSchema = z.object({
  correo: z.email("Ingresa un correo valido"),
});

/** RF-16: panel de perfil. RN-03: usuario y correo no se editan. */
export const perfilSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio").max(60),
  apellido: z.string().trim().min(2, "El apellido es obligatorio").max(60),
  telefono: z
    .string()
    .trim()
    .regex(/^[0-9+\s-]{8,20}$/, "Ingresa un telefono valido")
    .optional()
    .or(z.literal("")),
});

export type PerfilInput = z.infer<typeof perfilSchema>;

/** RF-17 / RN-02: hasta 3 direcciones por cliente. */
export const direccionSchema = z.object({
  destinatario: z.string().trim().min(2, "El destinatario es obligatorio").max(80),
  calle: z.string().trim().min(2, "La calle es obligatoria").max(80),
  numero: z.string().trim().min(1, "El numero es obligatorio").max(10),
  piso: z.string().trim().max(10).optional().or(z.literal("")),
  departamento: z.string().trim().max(20).optional().or(z.literal("")),
  ciudad: z.string().trim().min(2, "La ciudad es obligatoria").max(60),
  provincia: z.string().trim().min(2, "La provincia es obligatoria").max(60),
  codigoPostal: z.string().trim().max(10).optional().or(z.literal("")),
  predeterminada: z.boolean().default(false),
});

export type DireccionInput = z.infer<typeof direccionSchema>;
