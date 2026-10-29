"use client";

import { useActionState, useState } from "react";

import {
  accionRecuperarPassword,
  type EstadoFormulario,
} from "@/modules/auth/actions";

const estadoInicial: EstadoFormulario = {};

/**
 * Tarjeta de Recuperacion de contrasena reconstruida 1:1 desde el mockup de Figma.
 *
 * Fuente: `Vista 5: Autenticacion (Login / Registro / Recuperacion)` ->
 * frame `Recuperación de contraseña` (`id: "226:1591"`), tarjeta `Frame 87` (`id: "226:2055"`).
 */
export function RecuperarForm() {
  const [estado, formAction, pendiente] = useActionState(
    accionRecuperarPassword,
    estadoInicial,
  );
  const [reenviado, setReenviado] = useState(false);

  return (
    <div className="flex min-h-[440px] w-full max-w-[531px] flex-col items-center rounded-[40px] bg-[linear-gradient(180deg,rgba(255,0,7,0.8)_0%,rgba(153,0,4,1)_100%)] px-6 py-9 shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)]">
      <h1 className="text-center text-[24px] font-semibold leading-[29px] uppercase text-white">
        RECUPERA TU CONTRASEÑA
      </h1>

      <p className="mt-5 max-w-[380px] text-center text-[14px] font-normal leading-[17px] text-white">
        Coloca el correo electrónico vinculado a tu cuenta.
        <br />
        Chequea tu correo para obtener el link de actualización de contraseña.
      </p>

      {estado.exito && (
        <p
          role="status"
          className="mt-4 w-full max-w-[380px] rounded-xl bg-white/95 px-4 py-2 text-center text-xs font-medium text-[#2C2C2C]"
        >
          {reenviado ? "Correo reenviado. " : ""}
          {estado.exito}
        </p>
      )}

      {estado.error && (
        <p
          role="alert"
          className="mt-4 w-full max-w-[380px] rounded-xl bg-[#2C2C2C] px-4 py-2 text-center text-xs font-medium text-white"
        >
          {estado.error}
        </p>
      )}

      <form
        action={formAction}
        noValidate
        className="mt-7 flex w-full flex-col items-center"
      >
        <div className="w-full max-w-[328px]">
          <input
            id="correo"
            name="correo"
            type="email"
            autoComplete="email"
            required
            placeholder="Correo electrónico"
            aria-label="Correo electrónico"
            aria-invalid={Boolean(estado.erroresCampos?.correo)}
            className="h-[54px] w-full rounded-[40px] bg-white px-6 text-[16px] font-normal leading-[19px] text-[#2C2C2C] shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)] outline-none placeholder:text-[#2C2C2C]/80 focus:ring-2 focus:ring-[#2C2C2C]"
          />
          {estado.erroresCampos?.correo && (
            <p className="mt-1 px-4 text-xs font-medium text-white">
              {estado.erroresCampos.correo}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pendiente}
          onClick={() => setReenviado(false)}
          className="mt-6 flex h-[44px] w-[171px] items-center justify-center rounded-[9px] bg-[#2C2C2C] text-[24px] font-normal leading-[29px] text-white shadow-[6px_5px_6.5px_rgba(0,0,0,0.25),inset_0_4px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pendiente ? "..." : "Enviar correo"}
        </button>

        <button
          type="submit"
          disabled={pendiente}
          onClick={() => setReenviado(true)}
          className="mt-3 text-[13px] font-normal leading-[16px] text-white underline-offset-4 hover:underline disabled:opacity-60"
        >
          Reenviar correo
        </button>
      </form>

      {/* Separador blanco de 371px (Line 10 en Figma) */}
      <div className="mt-6 h-[2px] w-full max-w-[371px] bg-white" />
    </div>
  );
}
