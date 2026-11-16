import { z } from "zod";

/**
 * Variables de entorno obligatorias, validadas en el arranque del servidor.
 *
 * Se separa del .env para que un valor faltante falle con un mensaje util
 * en lugar de un error cryptic de Prisma o de Auth.js a mitad de una peticion.
 */
const esquemaServidor = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL no puede estar vacia"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET debe tener al menos 16 caracteres"),
  AUTH_URL: z.string().url().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  CORREO_REMITENTE: z.string().optional(),
});

export type VariablesServidor = z.infer<typeof esquemaServidor>;

/**
 * Lee y valida las variables de entorno del servidor.
 * Llamar dentro de un server component, server action o route handler.
 */
export function leerEnvServidor(): VariablesServidor {
  const resultado = esquemaServidor.safeParse(process.env);

  if (!resultado.success) {
    const problemas = resultado.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `Configuracion de entorno incompleta:\n${problemas}\n\n` +
        "Revisar el archivo .env (plantilla en .env.example).",
    );
  }

  return resultado.data;
}

/**
 * Google OAuth es opcional en desarrollo: si el proyecto de Google Cloud
 * todavia no esta creado (RF-13), la app debe igual arrancar y funcionar
 * con credenciales locales.
 */
export function googleOAuthHabilitado(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
}

/**
 * RF-24: Mercado Pago es opcional en desarrollo. Sin credenciales de
 * prueba la app funciona igual: el checkout usa un pago simulado que
 * recorre el mismo camino de confirmacion (pedido, stock, cupones),
 * de modo que al llegar las credenciales solo cambie el paso de
 * redireccion.
 */
export function mercadoPagoHabilitado(): boolean {
  return Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
}

/**
 * RF-28 / RF-44: el proveedor de correo (Resend) es opcional en
 * desarrollo. Sin `RESEND_API_KEY` los correos se escriben en la
 * consola del servidor (modo simulado) sin fallar: el mismo contenido
 * que se mandaria por SMTP llega a la terminal y queda demostrable el
 * flujo completo.
 */
export function correoHabilitado(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** Remitente de los correos salientes (Resend exige uno verificado). */
export function remitenteCorreo(): string {
  return process.env.CORREO_REMITENTE ?? "Sneaker <onboarding@resend.dev>";
}
