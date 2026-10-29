"use client";

import { useActionState } from "react";

import { signIn } from "@/lib/auth-client";
import {
  accionRegistrar,
  type EstadoFormulario,
} from "@/modules/auth/actions";
import { AuthCheckbox, GoogleIcon } from "./auth-shell";

const estadoInicial: EstadoFormulario = {};

interface Props {
  callbackUrl?: string;
  googleHabilitado?: boolean;
}

export function RegistroForm({ callbackUrl = "/" }: Props) {
  const [estado, formAction, pendiente] = useActionState(
    accionRegistrar,
    estadoInicial,
  );

  return (
    <div className="flex min-h-[519px] w-full max-w-[469px] flex-col items-center rounded-[40px] bg-[linear-gradient(180deg,rgba(255,0,7,0.8)_0%,rgba(153,0,4,1)_100%)] px-6 pt-[43px] pb-[36px] shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)]">
      <h1 className="text-center text-[24px] font-semibold leading-[29px] uppercase text-white">
        CREAR CUENTA
      </h1>

      {estado.error && (
        <p
          role="alert"
          className="mt-3 w-full max-w-[328px] rounded-xl bg-[#2C2C2C] px-4 py-2 text-center text-xs font-medium text-white"
        >
          {estado.error}
        </p>
      )}

      <form
        action={formAction}
        noValidate
        className="mt-[20px] flex w-full flex-col items-center"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div className="flex w-full max-w-[328px] flex-col gap-[18px]">
          <div>
            <input
              id="nombreCompleto"
              name="nombreCompleto"
              type="text"
              autoComplete="name"
              required
              placeholder="Nombre completo"
              aria-label="Nombre completo"
              aria-invalid={Boolean(
                estado.erroresCampos?.nombreCompleto ||
                  estado.erroresCampos?.nombre,
              )}
              className="h-[54px] w-full rounded-[40px] bg-white px-6 text-[16px] font-normal leading-[19px] text-black shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)] outline-none placeholder:text-black/70 focus:ring-2 focus:ring-[#2C2C2C]"
            />
            {(estado.erroresCampos?.nombreCompleto ||
              estado.erroresCampos?.nombre) && (
              <p className="mt-1 px-4 text-xs font-medium text-white">
                {estado.erroresCampos.nombreCompleto ??
                  estado.erroresCampos.nombre}
              </p>
            )}
          </div>

          <div>
            <input
              id="correo"
              name="correo"
              type="email"
              autoComplete="email"
              required
              placeholder="Correo electrónico"
              aria-label="Correo electrónico"
              aria-invalid={Boolean(estado.erroresCampos?.correo)}
              className="h-[54px] w-full rounded-[40px] bg-white px-6 text-[16px] font-normal leading-[19px] text-black shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)] outline-none placeholder:text-black/70 focus:ring-2 focus:ring-[#2C2C2C]"
            />
            {estado.erroresCampos?.correo && (
              <p className="mt-1 px-4 text-xs font-medium text-white">
                {estado.erroresCampos.correo}
              </p>
            )}
          </div>

          <div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Contraseña"
              aria-label="Contraseña"
              aria-invalid={Boolean(estado.erroresCampos?.password)}
              className="h-[54px] w-full rounded-[40px] bg-white px-6 text-[16px] font-normal leading-[19px] text-black shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)] outline-none placeholder:text-black/70 focus:ring-2 focus:ring-[#2C2C2C]"
            />
            {estado.erroresCampos?.password && (
              <p className="mt-1 px-4 text-xs font-medium text-white">
                {estado.erroresCampos.password}
              </p>
            )}
          </div>
        </div>

        {/* Checkbox Acepto los terminos y condiciones (Frame 13: gap 6px, 13x13 #D9D9D9, radio 2px) */}
        <div className="mt-[18px] w-full max-w-[328px]">
          <AuthCheckbox
            name="aceptaTerminos"
            label="Acepto los terminos y condiciones"
            required
          />
          {estado.erroresCampos?.aceptaTerminos && (
            <p className="mt-1 px-1 text-xs font-medium text-white">
              {estado.erroresCampos.aceptaTerminos}
            </p>
          )}
        </div>

        {/* Boton Registrarme (Frame 10: 163 x 39, #2C2C2C, radio 9px) */}
        <button
          type="submit"
          disabled={pendiente}
          className="mt-[20px] flex h-[39px] w-[163px] items-center justify-center rounded-[9px] bg-[#2C2C2C] text-[24px] font-normal leading-[29px] text-white shadow-[6px_5px_6.5px_rgba(0,0,0,0.25),inset_0_4px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {pendiente ? "..." : "Registrarme"}
        </button>
      </form>

      {/* Separador blanco (Vector 1: 371px, 2px) */}
      <div className="mt-[20px] h-[2px] w-full max-w-[371px] bg-white" />

      {/* Boton Ingresar con gmail (Frame 101: 241 x 54, radio 40px, #FFFFFF) */}
      <button
        type="button"
        onClick={() => void signIn("google", { callbackUrl })}
        className="mt-[20px] flex h-[54px] w-[241px] items-center justify-center gap-[10px] rounded-[40px] bg-white px-5 shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-95"
      >
        <GoogleIcon />
        <span className="text-[16px] font-semibold leading-[19px] text-black">
          Ingresar con gmail
        </span>
      </button>
    </div>
  );
}
