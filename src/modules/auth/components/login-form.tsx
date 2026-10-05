"use client";

import { useActionState } from "react";
import Link from "next/link";

import { accionIniciarSesion, type EstadoFormulario } from "../actions";
import { signIn } from "@/lib/auth-client";

/**
 * Formulario de acceso (RF-12, RF-13).
 *
 * El cliente valida por comodidad, pero la decision real ocurre en la
 * server action. Por eso los mensajes de error que llegan en `estado` son
 * los del servidor.
 */
export function LoginForm({
  callbackUrl,
  googleHabilitado,
}: {
  callbackUrl: string;
  googleHabilitado: boolean;
}) {
  const [estado, enviar, pendiente] = useActionState<EstadoFormulario, FormData>(
    accionIniciarSesion,
    {},
  );

  const errorCampo = (campo: string) => estado?.erroresCampos?.[campo];

  return (
    <form action={enviar} className="flex flex-col gap-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="flex flex-col gap-1">
        <label htmlFor="correo" className="text-sm font-medium">
          Correo
        </label>
        <input
          id="correo"
          name="correo"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(errorCampo("correo"))}
          aria-describedby={errorCampo("correo") ? "error-correo" : undefined}
          className="h-10 rounded-md border border-borde px-3 text-sm"
        />
        {errorCampo("correo") && (
          <p id="error-correo" className="text-xs text-stock-critico">
            {errorCampo("correo")}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Contrasena
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(errorCampo("password"))}
          aria-describedby={errorCampo("password") ? "error-password" : undefined}
          className="h-10 rounded-md border border-borde px-3 text-sm"
        />
        {errorCampo("password") && (
          <p id="error-password" className="text-xs text-stock-critico">
            {errorCampo("password")}
          </p>
        )}
      </div>

      {estado?.error && (
        <p role="alert" className="rounded-md bg-stock-critico/10 px-3 py-2 text-sm text-stock-critico">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="h-10 rounded-md bg-marca text-sm font-medium text-marca-contraste disabled:opacity-60"
      >
        {pendiente ? "Ingresando..." : "Ingresar"}
      </button>

      {googleHabilitado && (
        <>
          <div className="flex items-center gap-3 text-xs text-texto-tenue">
            <span className="h-px flex-1 bg-borde" />
            o
            <span className="h-px flex-1 bg-borde" />
          </div>

          <button
            type="button"
            onClick={() => void signIn("google", { redirectTo: callbackUrl })}
            className="h-10 rounded-md border border-borde text-sm font-medium hover:border-marca transition-colors"
          >
            Continuar con Google
          </button>
        </>
      )}

      <div className="flex flex-col gap-1 text-sm text-texto-tenue">
        <Link href="/registro" className="hover:text-acento">
          No tengo cuenta, quiero registrarme
        </Link>
        {/* RF-14: el envio del correo de recuperacion se completa en el
            Sprint 2, cuando se elija el proveedor de correo. */}
        <span className="opacity-60">Olvide mi contrasena (proximamente)</span>
      </div>
    </form>
  );
}
