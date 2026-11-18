import type { Metadata } from "next";
import Link from "next/link";

import { sesionActual } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { accionSuscribirseNewsletter } from "@/modules/newsletter/actions";
import { FormularioSuscripcion } from "@/modules/newsletter/components/newsletter-ui";

export const metadata: Metadata = { title: "Newsletter · Sneaker" };

/**
 * Newsletter (Sprint 3 - Tadeo Rochas. RF-43).
 *
 * Suscripcion abierta sin cuenta: se pide unicamente el correo
 * electronico. Si el visitante ya tiene sesion, la fila queda enlazada
 * a su usuario (comentario del modelo `SuscripcionNewsletter`).
 */
export default async function NewsletterPage() {
  const sesion = await sesionActual();
  const [suscriptos, conectado] = await Promise.all([
    prisma.suscripcionNewsletter.count({ where: { activo: true } }),
    sesion?.user && !sesion.error
      ? prisma.suscripcionNewsletter.findFirst({
          where: { OR: [{ usuarioId: sesion.user.id }, { correo: sesion.user.email ?? "" }], activo: true },
          select: { correo: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-16">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#9E9E9E]">Newsletter</p>
        <h1 className="mt-2 text-4xl font-bold text-[#2C2C2C]">Novedades, promos y cupones</h1>
        <p className="mt-3 text-lg text-[#4E4E4E]">
          Suscribite con tu correo y recibí las novedades de la temporada, las promociones
          vigentes y cupones antes que nadie.
        </p>
      </header>

      <div className="rounded-md border border-[#D9D9D9] bg-[#FAFAFA] p-6">
        {conectado ? (
          <p className="text-base font-medium text-green-700">
            Ya estás suscripto con {conectado.correo}.
          </p>
        ) : (
          <FormularioSuscripcion accion={accionSuscribirseNewsletter} />
        )}
        <p className="mt-3 text-sm text-[#9E9E9E]">
          {suscriptos} suscripto(s) activos hoy. Sin necesidad de tener una cuenta; podés pedir la
          baja escribiéndonos.
        </p>
      </div>

      <Link href="/catalogo" className="self-center text-base font-semibold text-[#CF1A1F] underline">
        Volver al catálogo
      </Link>
    </div>
  );
}
