"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { signIn, useSesion } from "@/lib/auth-client";
import {
  accionIniciarSesion,
  type EstadoFormulario,
} from "@/modules/auth/actions";
import { AuthCheckbox, GoogleIcon } from "./auth-shell";

const estadoInicial: EstadoFormulario = {};

interface Props {
  callbackUrl: string;
  googleHabilitado?: boolean;
  mensajeExito?: string;
}

export function LoginForm({ callbackUrl, mensajeExito }: Props) {
  const router = useRouter();
  const { update } = useSesion();
  const [estado, formAction, pendiente] = useActionState(
    accionIniciarSesion,
    estadoInicial,
  );

  const cargando = pendiente || Boolean(estado.redirectTo);

  useEffect(() => {
    if (!estado.redirectTo) return;
    let cancelado = false;

    void (async () => {
      // Actualizamos el SessionProvider del cliente antes de navegar para que
      // el Header y el SideMenu reflejen el usuario logueado de inmediato.
      await update();
      if (cancelado) return;
      router.replace(estado.redirectTo!);
      router.refresh();
    })();

    return () => {
      cancelado = true;
    };
  }, [estado.redirectTo, router, update]);

  return (
    <div className="flex min-h-[440px] w-full max-w-[469px] flex-col items-center rounded-[40px] bg-[linear-gradient(180deg,rgba(255,0,7,0.8)_0%,rgba(153,0,4,1)_100%)] px-6 pt-[37px] pb-[32px] shadow-[inset_4px_4px_3.7px_rgba(0,0,0,0.25)]">
      <h1 className="text-center text-[24px] font-semibold leading-[29px] uppercase text-white">
        INICIAR SESIÓN
      </h1>

      {mensajeExito && (
        <p
          role="status"
          className="mt-3 w-full max-w-[328px] rounded-xl bg-white/95 px-4 py-2 text-center text-xs font-medium text-[#2C2C2C]"
        >
          {mensajeExito}
        </p>
      )}

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
        className="mt-[25px] flex w-full flex-col items-center"
      >
        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div className="flex w-full max-w-[328px] flex-col gap-[19px]">
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
              autoComplete="current-password"
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

        {/* Checkbox Recordarme (Frame 89: gap 6px, 13x13 #D9D9D9, radio 2px) */}
        <div className="mt-[14px] w-full max-w-[328px]">
          <AuthCheckbox name="recordarme" label="Recordarme" />
        </div>

        {/* Boton Ingresar (Frame 10: 115 x 44, #2C2C2C, radio 9px) */}
        <button
          type="submit"
          disabled={cargando}
          className="mt-[18px] flex h-[44px] w-[115px] items-center justify-center rounded-[9px] bg-[#2C2C2C] text-[24px] font-normal leading-[29px] text-white shadow-[6px_5px_6.5px_rgba(0,0,0,0.25),inset_0_4px_4px_rgba(0,0,0,0.25)] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {cargando ? "..." : "Ingresar"}
        </button>
      </form>

      {/* Separador blanco (Line 10: 371px, 2px) */}
      <div className="mt-[20px] h-[2px] w-full max-w-[371px] bg-white" />

      {/* Boton Ingresar con gmail (Frame 100: 241 x 54, radio 40px, #FFFFFF) */}
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
