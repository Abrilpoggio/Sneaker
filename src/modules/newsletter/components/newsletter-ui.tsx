"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { ESTADO_INICIAL_NEWSLETTER, type EstadoAccionNewsletter } from "../schemas";

/**
 * Componentes cliente del newsletter (Sprint 3 - Tadeo Rochas).
 * RF-43: formulario publico de suscripcion (solo correo).
 * RF-44: formulario del administrador para enviar novedades.
 */

function BotonConEstado({
  children,
  className,
  pendienteTexto = "Enviando...",
}: {
  children: React.ReactNode;
  className?: string;
  pendienteTexto?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendienteTexto : children}
    </button>
  );
}

function MensajeEstado({ estado }: { estado: EstadoAccionNewsletter }) {
  if (estado.ok && estado.mensaje) {
    return (
      <p role="status" className="text-base font-medium leading-[16px] text-green-700">
        {estado.mensaje}
      </p>
    );
  }
  if (!estado.ok && estado.error) {
    return (
      <p role="alert" className="text-base font-medium leading-[16px] text-[#CF1A1F]">
        {estado.error}
      </p>
    );
  }
  return null;
}

/** RF-43: alta de suscripcion abierta, sin cuenta. */
export function FormularioSuscripcion({
  accion,
  oscuro = false,
}: {
  accion: (prev: EstadoAccionNewsletter, formData: FormData) => Promise<EstadoAccionNewsletter>;
  oscuro?: boolean;
}) {
  const [estado, formAction] = useActionState(accion, ESTADO_INICIAL_NEWSLETTER);

  return (
    <form action={formAction} noValidate className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="newsletter-correo">
          Correo electrónico
        </label>
        <input
          id="newsletter-correo"
          name="correo"
          type="email"
          required
          autoComplete="email"
          placeholder="tu@correo.com"
          className={`min-w-0 flex-1 rounded border px-3 py-2 text-base outline-none ${
            oscuro
              ? "border-white/40 bg-transparent text-white placeholder:text-white/60 focus:border-white"
              : "border-[#D9D9D9] text-[#2C2C2C] focus:border-[#CF1A1F]"
          }`}
        />
        <BotonConEstado
          className={
            oscuro
              ? "rounded bg-white px-4 py-2 text-base font-semibold text-[#2C2C2C] hover:opacity-90"
              : "rounded bg-[#CF1A1F] px-4 py-2 text-base font-semibold text-white hover:bg-[#7C0300]"
          }
          pendienteTexto="Suscribiendo..."
        >
          Suscribirme
        </BotonConEstado>
      </div>
      <MensajeEstado estado={estado} />
    </form>
  );
}

/** RF-44: campana manual del administrador hacia los suscriptos. */
export function FormularioNovedades({
  accion,
}: {
  accion: (prev: EstadoAccionNewsletter, formData: FormData) => Promise<EstadoAccionNewsletter>;
}) {
  const [estado, formAction] = useActionState(accion, ESTADO_INICIAL_NEWSLETTER);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="campana-asunto" className="text-sm font-semibold text-[#2C2C2C]">
          Asunto
        </label>
        <input
          id="campana-asunto"
          name="asunto"
          type="text"
          required
          placeholder="Nueva temporada: 15% OFF en basketball"
          className="rounded border border-[#D9D9D9] px-3 py-2 text-base text-[#2C2C2C] outline-none focus:border-[#CF1A1F]"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="campana-mensaje" className="text-sm font-semibold text-[#2C2C2C]">
          Mensaje
        </label>
        <textarea
          id="campana-mensaje"
          name="mensaje"
          required
          rows={5}
          placeholder="Contamos las novedades, promociones vigentes y cupones de la temporada."
          className="rounded border border-[#D9D9D9] px-3 py-2 text-base text-[#2C2C2C] outline-none focus:border-[#CF1A1F]"
        />
      </div>
      <BotonConEstado
        className="self-start rounded-md bg-[#CF1A1F] px-6 py-3 text-lg font-medium leading-[16px] text-white hover:bg-[#7C0300] disabled:cursor-not-allowed disabled:opacity-60"
        pendienteTexto="Enviando campaña..."
      >
        Enviar novedades
      </BotonConEstado>
      <MensajeEstado estado={estado} />
    </form>
  );
}
