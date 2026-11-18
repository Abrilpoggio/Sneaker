"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin, sesionActual } from "@/lib/permissions";

import {
  type EstadoAccionNewsletter,
} from "./schemas";
import {
  ErrorNegocioNewsletter,
  enviarNovedades,
  suscribirseNewsletter,
} from "./services/newsletter";

/**
 * Server Actions del Modulo Newsletter
 * (Sprint 3 - Tadeo Rochas. RF-43, RF-44).
 *
 * IMPORTANTE (Next.js 16): este archivo posee `"use server"` y por lo
 * tanto unicamente exporta funciones `async`.
 */

function estadoError(error: unknown): EstadoAccionNewsletter {
  if (error instanceof ErrorNegocioNewsletter) {
    return { ok: false, error: error.message, marcaTiempo: Date.now() };
  }
  if (error instanceof Error && error.name === "ZodError") {
    const issues = (error as Error & { issues?: Array<{ message: string }> }).issues;
    return {
      ok: false,
      error: issues?.[0]?.message ?? "Datos invalidos.",
      marcaTiempo: Date.now(),
    };
  }
  return {
    ok: false,
    error: "Ocurrió un error inesperado.",
    marcaTiempo: Date.now(),
  };
}

/** RF-43: suscripcion desde el sitio, sin necesidad de cuenta. */
export async function accionSuscribirseNewsletter(
  _prev: EstadoAccionNewsletter,
  formData: FormData,
): Promise<EstadoAccionNewsletter> {
  // La suscripcion es abierta: la sesion es opcional y solo se usa
  // para enlazar la fila con el usuario (comentario del modelo).
  const sesion = await sesionActual();

  try {
    const resultado = await suscribirseNewsletter(
      // El servicio valida con Zod: le pasamos el objeto que espera.
      { correo: formData.get("correo") },
      sesion?.user?.id ?? null,
    );
    revalidatePath("/newsletter");
    const mensajes = {
      NUEVO: `¡Listo! ${resultado.correo} quedó suscripto: vas a recibir novedades, promociones y cupones.`,
      YA_SUSCRIPTO: `El correo ${resultado.correo} ya estaba suscripto.`,
      REACTIVADO: `El correo ${resultado.correo} volvió a estar suscripto.`,
    } as const;
    return { ok: true, mensaje: mensajes[resultado.estado], marcaTiempo: Date.now() };
  } catch (error) {
    return estadoError(error);
  }
}

/**
 * RF-44: envio manual de una campana de novedades a las suscripciones
 * activas. Exclusivo de ADMIN (RF-49/RNF-08).
 */
export async function accionEnviarNewsletter(
  _prev: EstadoAccionNewsletter,
  formData: FormData,
): Promise<EstadoAccionNewsletter> {
  const sesion = await requireAdmin();
  void sesion;

  try {
    const campana = await enviarNovedades({
      asunto: formData.get("asunto"),
      mensaje: formData.get("mensaje"),
    });
    return {
      ok: true,
      mensaje:
        campana.modo === "ENVIADO"
          ? `Campaña enviada a ${campana.correosEnviados} de ${campana.suscriptos} suscripto(s).`
          : `Modo simulado (sin RESEND_API_KEY): campaña demostrada en consola para ${campana.suscriptos} suscripto(s).`,
      marcaTiempo: Date.now(),
    };
  } catch (error) {
    return estadoError(error);
  }
}
