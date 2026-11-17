"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { ESTADO_INICIAL_CHECKOUT, type EstadoAccionCheckout } from "../schemas";

/**
 * Componentes cliente del checkout (Sprint 3 - Camila Viegas).
 * Encapsulan `useActionState` para dar feedback inmediato del cupon y
 * del pago sin recargar la pagina.
 */

function BotonConEstado({
  children,
  className,
  pendienteTexto = "Procesando...",
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

function MensajeEstado({ estado }: { estado: EstadoAccionCheckout }) {
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

/** RF-22: formulario de cupon del checkout. */
export function FormularioCupon({
  accionAplicar,
  accionQuitar,
  cuponAplicado,
}: {
  accionAplicar: (prev: EstadoAccionCheckout, formData: FormData) => Promise<EstadoAccionCheckout>;
  accionQuitar: (prev: EstadoAccionCheckout, formData: FormData) => Promise<EstadoAccionCheckout>;
  cuponAplicado: { codigo: string; porcentaje: number } | null;
}) {
  const [estadoAplicar, aplicar] = useActionState(accionAplicar, ESTADO_INICIAL_CHECKOUT);
  const [estadoQuitar, quitar] = useActionState(accionQuitar, ESTADO_INICIAL_CHECKOUT);

  if (cuponAplicado) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between rounded border border-green-700 bg-[#F0FFF4] px-4 py-3">
          <p className="text-base font-semibold text-green-700">
            Cupón {cuponAplicado.codigo}: -{cuponAplicado.porcentaje}%
          </p>
          <form action={quitar}>
            <BotonConEstado
              className="text-base font-semibold text-[#4E4E4E] underline hover:text-[#2C2C2C]"
              pendienteTexto="Quitando..."
            >
              Quitar cupón
            </BotonConEstado>
          </form>
        </div>
        <MensajeEstado estado={estadoQuitar} />
      </div>
    );
  }

  return (
    <form action={aplicar} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="codigo-cupon">
          Código de cupón
        </label>
        <input
          id="codigo-cupon"
          name="codigo"
          type="text"
          placeholder="Ingresá tu código"
          autoComplete="off"
          className="min-w-0 flex-1 rounded border border-[#D9D9D9] px-3 py-2 text-base text-[#2C2C2C] outline-none focus:border-[#CF1A1F]"
        />
        <BotonConEstado className="rounded border border-[#2C2C2C] px-4 py-2 text-base font-medium text-[#2C2C2C] hover:bg-[#F5F5F5]">
          Aplicar
        </BotonConEstado>
      </div>
      <MensajeEstado estado={estadoAplicar} />
    </form>
  );
}

/** RF-24: boton principal de pago (Mercado Pago o simulado). */
export function BotonPagar({
  accion,
  modo,
}: {
  accion: (prev: EstadoAccionCheckout, formData: FormData) => Promise<EstadoAccionCheckout>;
  modo: "REAL" | "SIMULADO";
}) {
  const [estado, formAction] = useActionState(accion, ESTADO_INICIAL_CHECKOUT);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <BotonConEstado
        className="rounded-md bg-[#CF1A1F] px-6 py-3 text-xl font-medium leading-[16px] text-white transition-opacity hover:bg-[#7C0300] disabled:cursor-not-allowed disabled:opacity-60"
        pendienteTexto={modo === "REAL" ? "Redirigiendo..." : "Confirmando pedido..."}
      >
        {modo === "REAL" ? "Pagar con Mercado Pago" : "Pagar (simulado)"}
      </BotonConEstado>
      <MensajeEstado estado={estado} />
    </form>
  );
}

/**
 * RF-25 (solo modo simulado): demuestra el rechazo del pago. El pedido
 * queda RECHAZADO y el carrito se conserva para reintentar.
 */
export function BotonPagoRechazado({
  accion,
}: {
  accion: (prev: EstadoAccionCheckout, formData: FormData) => Promise<EstadoAccionCheckout>;
}) {
  const [estado, formAction] = useActionState(accion, ESTADO_INICIAL_CHECKOUT);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <BotonConEstado
        className="rounded-md border border-[#2C2C2C] px-6 py-3 text-lg font-medium leading-[16px] text-[#2C2C2C] transition-opacity hover:bg-[#F5F5F5] disabled:cursor-not-allowed disabled:opacity-60"
        pendienteTexto="Procesando rechazo..."
      >
        Simular pago rechazado
      </BotonConEstado>
      <MensajeEstado estado={estado} />
    </form>
  );
}
