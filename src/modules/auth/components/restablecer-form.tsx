"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  accionRestablecerPassword,
  type EstadoFormulario,
} from "@/modules/auth/actions";

const estadoInicial: EstadoFormulario = {};

interface RestablecerFormProps {
  token: string;
  correo: string;
}

/**
 * Formulario de nueva contrasena para completar RF-14.
 */
export function RestablecerForm({ token, correo }: RestablecerFormProps) {
  const [estado, formAction, pendiente] = useActionState(
    accionRestablecerPassword,
    estadoInicial,
  );

  return (
    <div className="flex min-h-[440px] w-full max-w-[531px] flex-col items-center rounded-[40px] bg-[linear-gradient(180deg,rgba(255,0,7,0.8)_0%,rgba(153,0,4,1)_100%)] px-6 py-9 shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)]">
      <h1 className="text-center text-[24px] font-semibold leading-[29px] uppercase text-white">
        NUEVA CONTRASEÑA
      </h1>

      <p className="mt-4 max-w-[380px] text-center text-[14px] font-normal leading-[18px] text-white/95">
        Ingresá tu nueva contraseña para la cuenta{" "}
        <strong className="font-semibold">{correo}</strong>.
      </p>

      {estado.exito ? (
        <div className="mt-6 flex w-full max-w-[380px] flex-col items-center gap-4 rounded-2xl bg-white/95 p-5 text-center text-[#2C2C2C]">
          <p className="text-sm font-semibold text-[#1B5E20]">{estado.exito}</p>
          <Link
            href="/login"
            className="inline-flex h-[44px] items-center justify-center rounded-[9px] bg-[#2C2C2C] px-6 text-base font-semibold text-white transition-opacity hover:opacity-90"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <form
          action={formAction}
          noValidate
          className="mt-6 flex w-full flex-col items-center gap-4"
        >
          <input type="hidden" name="token" value={token} />

          {estado.error && (
            <p
              role="alert"
              className="w-full max-w-[360px] rounded-xl bg-[#2C2C2C] px-4 py-2 text-center text-xs font-medium text-white"
            >
              {estado.error}
            </p>
          )}

          <div className="w-full max-w-[328px]">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Nueva contraseña (mín. 8 caracteres)"
              aria-label="Nueva contraseña"
              className="h-[52px] w-full rounded-[40px] bg-white px-6 text-[15px] text-[#2C2C2C] shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)] outline-none placeholder:text-[#2C2C2C]/75 focus:ring-2 focus:ring-[#2C2C2C]"
            />
            {estado.erroresCampos?.password && (
              <p className="mt-1 px-4 text-xs font-medium text-white">
                {estado.erroresCampos.password}
              </p>
            )}
          </div>

          <div className="w-full max-w-[328px]">
            <input
              id="confirmarPassword"
              name="confirmarPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Repetir nueva contraseña"
              aria-label="Repetir nueva contraseña"
              className="h-[52px] w-full rounded-[40px] bg-white px-6 text-[15px] text-[#2C2C2C] shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)] outline-none placeholder:text-[#2C2C2C]/75 focus:ring-2 focus:ring-[#2C2C2C]"
            />
            {estado.erroresCampos?.confirmarPassword && (
              <p className="mt-1 px-4 text-xs font-medium text-white">
                {estado.erroresCampos.confirmarPassword}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={pendiente}
            className="mt-2 flex h-[44px] min-w-[200px] items-center justify-center rounded-[9px] bg-[#2C2C2C] px-6 text-[18px] font-medium text-white shadow-[6px_5px_6.5px_rgba(0,0,0,0.25),inset_0_4px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pendiente ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>
      )}
    </div>
  );
}
