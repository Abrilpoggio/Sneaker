import { prisma } from "@/lib/prisma";
import { correoHabilitado } from "@/lib/env";
import { enviarCorreo } from "@/modules/emails/services/correo";

import { newsletterSchema, novedadesSchema } from "../schemas";

/**
 * Servicio del Modulo Newsletter (Sprint 3 - Tadeo Rochas).
 *
 * RF-43: suscripcion al newsletter sin cuenta, pidiendo unicamente el
 * correo. La tabla `SuscripcionNewsletter` tiene `correo` unico a
 * nivel global: si el visitante ya esta registrado como usuario, la
 * fila se enlaza a su `usuarioId` para no duplicar la lista (comentario
 * del modelo en el schema).
 *
 * RF-44: envio manual de novedades, promociones y cupones a las
 * suscripciones activas. Sin `RESEND_API_KEY` el envio es simulado
 * (se escribe en consola) y la campana queda igual demostrada.
 */

export class ErrorNegocioNewsletter extends Error {
  constructor(
    public codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorNegocioNewsletter";
  }
}

/**
 * RF-43: alta de suscripcion. Idempotente: si ya existia y estaba
 * activa se informa; si estaba de baja se reactiva.
 */
export async function suscribirseNewsletter(
  entrada: unknown,
  usuarioId?: string | null,
): Promise<{ estado: "NUEVO" | "YA_SUSCRIPTO" | "REACTIVADO"; correo: string }> {
  const { correo } = newsletterSchema.parse(entrada);

  const existente = await prisma.suscripcionNewsletter.findUnique({
    where: { correo },
    select: { id: true, activo: true },
  });

  if (!existente) {
    // El enlace a usuario solo aplica si ese usuario no tiene ya una
    // fila propia con otro correo (usuarioId es unico).
    const usuarioIdEnlazado = usuarioId && (await usuarioSinSuscripcion(usuarioId)) ? usuarioId : null;
    await prisma.suscripcionNewsletter.create({
      data: { correo, activo: true, usuarioId: usuarioIdEnlazado },
    });
    return { estado: "NUEVO", correo };
  }

  if (existente.activo) {
    // Si el usuario recien se logueo con su cuenta, vinculamos la fila
    // que estaba anonima (solo si el enlace es posible).
    if (usuarioId && (await usuarioSinSuscripcion(usuarioId))) {
      await prisma.suscripcionNewsletter.update({
        where: { id: existente.id },
        data: { usuarioId },
      });
    }
    return { estado: "YA_SUSCRIPTO", correo };
  }

  const usuarioIdEnlazado = usuarioId && (await usuarioSinSuscripcion(usuarioId)) ? usuarioId : null;
  await prisma.suscripcionNewsletter.update({
    where: { id: existente.id },
    data: { activo: true, usuarioId: usuarioIdEnlazado },
  });
  return { estado: "REACTIVADO", correo };
}

/** True si el usuario no tiene ninguna fila de suscripcion asociada. */
async function usuarioSinSuscripcion(usuarioId: string): Promise<boolean> {
  const ocupado = await prisma.suscripcionNewsletter.findUnique({
    where: { usuarioId },
    select: { id: true },
  });
  return !ocupado;
}

export async function contarSuscriptosActivos(): Promise<number> {
  return prisma.suscripcionNewsletter.count({ where: { activo: true } });
}

export async function obtenerSuscriptosActivos() {
  return prisma.suscripcionNewsletter.findMany({
    where: { activo: true },
    orderBy: { fechaSuscripcion: "desc" },
    select: { correo: true, fechaSuscripcion: true },
  });
}

export interface ResultadoCampana {
  suscriptos: number;
  correosEnviados: number;
  modo: "ENVIADO" | "SIMULADO";
}

/**
 * RF-44: envia una campana de novedades a todas las suscripciones
 * activas. Devuelve cuantos correos salieron (o se simularon). Si
 * falla el proveedor a mitad de la lista, se registran los logueados y
 * se reporta el fallo al final.
 */
export async function enviarNovedades(entrada: unknown): Promise<ResultadoCampana> {
  const { asunto, mensaje } = novedadesSchema.parse(entrada);

  const suscriptos = await obtenerSuscriptosActivos();
  let correosEnviados = 0;
  let fallo: unknown = null;

  for (const suscripcion of suscriptos) {
    try {
      await enviarCorreo({
        para: suscripcion.correo,
        asunto,
        html: `<!DOCTYPE html>
<html lang="es-AR">
<body style="font-family:Arial,sans-serif;color:#2c2c2c;max-width:560px;margin:0 auto;padding:24px;">
  <h1 style="font-size:20px;">Sneaker</h1>
  <p>${asunto}</p>
  <div style="line-height:1.5;">${mensaje.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</div>
  <p style="color:#9e9e9e;font-size:12px;margin-top:24px;">
    Recibís este correo por estar suscripto al newsletter de Sneaker.
  </p>
</body>
</html>`,
      });
      correosEnviados++;
    } catch (error) {
      fallo = error;
    }
  }

  if (fallo) {
    console.error("[newsletter] Fallos de envio en la campana:", fallo);
  }

  return {
    suscriptos: suscriptos.length,
    correosEnviados,
    modo: correoHabilitado() ? "ENVIADO" : "SIMULADO",
  };
}
