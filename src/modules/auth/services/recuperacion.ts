import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/prisma";

/**
 * Tokens firmados de un solo uso para recuperacion de contrasena (RF-14).
 *
 * La firma HMAC-SHA256 incluye el `passwordHash` actual del usuario:
 * apenas el usuario actualiza su contrasena, cualquier token emitido
 * previamente queda invalidado automaticamente sin requerir tabla extra.
 */

const DURACION_TOKEN_MS = 30 * 60 * 1000; // 30 minutos

function secretoBase(): string {
  return (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "sneaker-dev-reset-secret"
  );
}

function firmar(datosBase64: string, huellaPassword: string): string {
  return createHmac("sha256", `${secretoBase()}:${huellaPassword}`)
    .update(datosBase64)
    .digest("base64url");
}

export function generarTokenRecuperacion(
  usuarioId: string,
  passwordHashActual: string | null,
): string {
  const payload = JSON.stringify({
    uid: usuarioId,
    exp: Date.now() + DURACION_TOKEN_MS,
  });
  const datosBase64 = Buffer.from(payload, "utf8").toString("base64url");
  const firma = firmar(datosBase64, passwordHashActual ?? "sin-password");
  return `${datosBase64}.${firma}`;
}

export interface ResultadoVerificacionToken {
  valido: boolean;
  usuario?: {
    id: string;
    correo: string;
    usuario: string;
  };
  motivo?: string;
}

export async function verificarTokenRecuperacion(
  token: string,
): Promise<ResultadoVerificacionToken> {
  const partes = token.trim().split(".");
  if (partes.length !== 2) {
    return { valido: false, motivo: "El enlace de recuperación no es válido." };
  }

  const [datosBase64, firmaRecibida] = partes;
  if (!datosBase64 || !firmaRecibida) {
    return { valido: false, motivo: "El enlace de recuperación no es válido." };
  }

  let payload: { uid?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(
      Buffer.from(datosBase64, "base64url").toString("utf8"),
    ) as { uid?: unknown; exp?: unknown };
  } catch {
    return { valido: false, motivo: "El enlace de recuperación está dañado." };
  }

  if (typeof payload.uid !== "string" || typeof payload.exp !== "number") {
    return { valido: false, motivo: "El enlace de recuperación no es válido." };
  }

  if (Date.now() > payload.exp) {
    return {
      valido: false,
      motivo: "El enlace expiró (tiene una validez de 30 minutos). Solicitá uno nuevo.",
    };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.uid },
    select: {
      id: true,
      correo: true,
      usuario: true,
      passwordHash: true,
      activo: true,
    },
  });

  if (!usuario || !usuario.activo) {
    return { valido: false, motivo: "La cuenta asociada no está disponible." };
  }

  const firmaEsperada = firmar(
    datosBase64,
    usuario.passwordHash ?? "sin-password",
  );

  const bufRecibida = Buffer.from(firmaRecibida, "utf8");
  const bufEsperada = Buffer.from(firmaEsperada, "utf8");
  if (
    bufRecibida.length !== bufEsperada.length ||
    !timingSafeEqual(bufRecibida, bufEsperada)
  ) {
    return {
      valido: false,
      motivo: "El enlace ya fue utilizado o no es válido. Solicitá uno nuevo.",
    };
  }

  return {
    valido: true,
    usuario: {
      id: usuario.id,
      correo: usuario.correo,
      usuario: usuario.usuario,
    },
  };
}
