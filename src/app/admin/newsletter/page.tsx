import type { Metadata } from "next";

import { requireAdmin } from "@/lib/permissions";
import { correoHabilitado } from "@/lib/env";
import { accionEnviarNewsletter } from "@/modules/newsletter/actions";
import { FormularioNovedades } from "@/modules/newsletter/components/newsletter-ui";
import { obtenerSuscriptosActivos } from "@/modules/newsletter/services/newsletter";
import { TARIFA_CIUDAD } from "@/modules/envios/tarifas";
import { formatoPrecio } from "@/modules/catalogo/productos";

export const metadata: Metadata = { title: "Newsletter · Admin" };

/**
 * Gestion del newsletter (Sprint 3 - Tadeo Rochas. RF-44).
 *
 * Exclusivo de ADMIN (RNF-08, `requireAdmin()`). Permite enviar
 * manualmente una campana de novedades, promociones y cupones a las
 * suscripciones activas, y revisar la lista para ver a quien llego.
 */
export default async function AdminNewsletterPage() {
  await requireAdmin();

  const suscriptos = await obtenerSuscriptosActivos();

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold">Newsletter (RF-44)</h1>
        <p className="mt-1 text-sm text-texto-tenue">
          Envio manual de novedades, promociones y cupones a las suscripciones activas
          (RF-43).{" "}
          {correoHabilitado()
            ? "Resend configurado: los correos salen de verdad."
            : "Modo simulado: sin RESEND_API_KEY el contenido se escribe en la consola del servidor."}
        </p>
      </header>

      <section aria-labelledby="titulo-envio" className="rounded-md border border-[#D9D9D9] bg-white p-5">
        <h2 id="titulo-envio" className="text-lg font-semibold text-[#2C2C2C]">
          Nueva campaña
        </h2>
        <p className="mt-1 text-sm text-[#6B6B6B]">
          Va a {suscriptos.length} suscripto(s) activo(s).
        </p>
        <div className="mt-4">
          <FormularioNovedades accion={accionEnviarNewsletter} />
        </div>
      </section>

      <section aria-labelledby="titulo-lista" className="rounded-md border border-[#D9D9D9] bg-white p-5">
        <h2 id="titulo-lista" className="text-lg font-semibold text-[#2C2C2C]">
          Suscriptos activos
        </h2>
        {suscriptos.length === 0 ? (
          <p className="mt-2 text-sm text-[#9E9E9E]">Todavia no hay suscripciones (RF-43).</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {suscriptos.map((suscripcion) => (
              <li
                key={suscripcion.correo}
                className="flex flex-wrap items-center justify-between gap-2 rounded border border-[#D9D9D9] px-3 py-2 text-sm"
              >
                <span className="font-medium text-[#2C2C2C]">{suscripcion.correo}</span>
                <span className="text-[#9E9E9E]">
                  desde {suscripcion.fechaSuscripcion.toLocaleDateString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-sm text-texto-tenue">
        El envio individual fallido no corta la campana: los demas correos salen igual y el
        detalle queda logueado. Tarifa de envio local (RF-45, referencia):{" "}
        {formatoPrecio(TARIFA_CIUDAD)}.
      </p>
    </div>
  );
}
