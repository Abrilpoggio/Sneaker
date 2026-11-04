"use client";

import Link from "next/link";
import { useRef, useState, useTransition, type FormEvent } from "react";

import { accionCambiarPassword } from "../actions";
import {
  ESTADO_INICIAL_CLIENTE,
  type EstadoAccionCliente,
} from "../schemas";

/**
 * Vista interactiva "Seguridad" reconstruida 1:1 desde el mockup de Figma
 * (`Nodo 341:947` - `seccion-seguridad` `344:440`).
 */

interface SeguridadPanelProps {
  tienePassword: boolean;
  tieneGoogle: boolean;
}

function IconoOjo({ visible }: { visible: boolean }) {
  return visible ? (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 3l18 18M10.58 10.58a2 2 0 0 0 2.83 2.83M9.88 5.09A9.77 9.77 0 0 1 12 4.8c5 0 9.27 3.11 11 7.2a11.8 11.8 0 0 1-4.12 5.19M6.61 6.61A11.84 11.84 0 0 0 1 12c1.73 4.09 6 7.2 11 7.2 1.82 0 3.55-.41 5.09-1.14"
      />
    </svg>
  ) : (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-5 w-5"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M1 12s4-7.2 11-7.2S23 12 23 12s-4 7.2-11 7.2S1 12 1 12Z"
      />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function SeguridadPanel({
  tienePassword,
  tieneGoogle,
}: SeguridadPanelProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [verActual, setVerActual] = useState(false);
  const [verNueva, setVerNueva] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);
  const [estado, setEstado] = useState<EstadoAccionCliente>(
    ESTADO_INICIAL_CLIENTE,
  );
  const [pendiente, iniciarTransicion] = useTransition();

  const manejarEnvio = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);

    iniciarTransicion(async () => {
      const resultado = await accionCambiarPassword(
        ESTADO_INICIAL_CLIENTE,
        formData,
      );
      setEstado(resultado);

      if (resultado.ok) {
        formRef.current?.reset();
      }
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-[1170px] flex-col gap-5">
      {/* Encabezado (Figma 341:1052) */}
      <div className="flex flex-col gap-1">
        <Link
          href="/cuenta"
          className="w-fit text-[13px] font-medium text-[#6B6B6B] transition-colors hover:text-[#CF1A1F]"
        >
          ← Volver a Mi Perfil
        </Link>
        <h1 className="text-[18px] font-semibold leading-[22px] text-black">
          Seguridad
        </h1>
      </div>

      {/* Contenedor principal #FAFAFA (Figma 344:440) */}
      <div className="flex flex-col gap-6 rounded-[7px] bg-[#FAFAFA] p-5 sm:p-8">
        <header className="flex flex-col gap-1.5">
          <h2 className="text-[24px] font-semibold leading-tight text-[#2C2C2C] sm:text-[28px]">
            {tienePassword ? "Cambiar contraseña" : "Configurar contraseña"}
          </h2>
          <p className="text-[14px] text-[#6B6B6B]">
            {tienePassword
              ? "Actualizá tu contraseña regularmente para mantener protegida tu cuenta."
              : "Tu cuenta ingresó mediante Google. Si querés, podés definir también una contraseña para ingresar con correo."}
          </p>
        </header>

        {/* Selector de modo (Figma 345:439) */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col justify-center rounded-[7px] border border-[#2C2C2C]/20 bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <span className="text-[15px] font-semibold text-[#2C2C2C]">
              {tienePassword
                ? "Cambiar con contraseña actual"
                : "Definir contraseña de acceso"}
            </span>
            <span className="mt-0.5 text-[13px] text-[#6B6B6B]">
              {tieneGoogle
                ? "Tu acceso con Google seguirá vinculado."
                : "Confirmá tu identidad con tu clave vigente."}
            </span>
          </div>

          <Link
            href="/recuperar"
            className="flex flex-col justify-center rounded-[7px] border border-[#E5E5E5] bg-[#FAFAFA] p-4 transition-colors hover:border-[#CF1A1F] hover:bg-white"
          >
            <span className="text-[15px] font-semibold text-[#CF1A1F]">
              ¿Olvidaste tu contraseña?
            </span>
            <span className="mt-0.5 text-[13px] text-[#6B6B6B]">
              Recibirás un correo con instrucciones para restablecerla.
            </span>
          </Link>
        </div>

        {estado.ok && estado.mensaje && (
          <div
            role="status"
            className="rounded-[7px] border border-green-300 bg-green-50 px-4 py-3 text-[14px] font-medium text-green-800"
          >
            {estado.mensaje}
          </div>
        )}

        {estado.error && (
          <div
            role="alert"
            className="rounded-[7px] border border-red-300 bg-red-50 px-4 py-3 text-[14px] font-medium text-[#CF1A1F]"
          >
            {estado.error}
          </div>
        )}

        {/* Formulario (Figma 344:444) */}
        <form
          ref={formRef}
          onSubmit={manejarEnvio}
          className="flex flex-col gap-[18px]"
          noValidate
        >
          {tienePassword && (
            <div className="flex flex-col gap-2">
              <label
                htmlFor="seguridad-actual"
                className="text-[14px] font-semibold text-[#2C2C2C]"
              >
                Contraseña actual
              </label>
              <div className="flex h-[52px] items-center gap-3 rounded-[7px] border border-[#D9D9D9] bg-white px-4 focus-within:border-[#CF1A1F]">
                <input
                  id="seguridad-actual"
                  name="passwordActual"
                  type={verActual ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Ingresa tu contraseña actual"
                  className="w-full bg-transparent text-[16px] text-[#2C2C2C] outline-none placeholder:text-[#9E9E9E]"
                />
                <button
                  type="button"
                  aria-label={
                    verActual
                      ? "Ocultar contraseña actual"
                      : "Mostrar contraseña actual"
                  }
                  onClick={() => setVerActual((v) => !v)}
                  className="cursor-pointer text-[#6B6B6B] hover:text-[#2C2C2C]"
                >
                  <IconoOjo visible={verActual} />
                </button>
              </div>
              {estado.erroresCampos?.passwordActual?.[0] && (
                <p className="text-[12px] font-medium text-[#CF1A1F]">
                  {estado.erroresCampos.passwordActual[0]}
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="seguridad-nueva"
              className="text-[14px] font-semibold text-[#2C2C2C]"
            >
              Nueva contraseña
            </label>
            <div className="flex h-[52px] items-center gap-3 rounded-[7px] border border-[#D9D9D9] bg-white px-4 focus-within:border-[#CF1A1F]">
              <input
                id="seguridad-nueva"
                name="passwordNueva"
                type={verNueva ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Ingresa una nueva contraseña"
                className="w-full bg-transparent text-[16px] text-[#2C2C2C] outline-none placeholder:text-[#9E9E9E]"
              />
              <button
                type="button"
                aria-label={
                  verNueva
                    ? "Ocultar nueva contraseña"
                    : "Mostrar nueva contraseña"
                }
                onClick={() => setVerNueva((v) => !v)}
                className="cursor-pointer text-[#6B6B6B] hover:text-[#2C2C2C]"
              >
                <IconoOjo visible={verNueva} />
              </button>
            </div>
            {estado.erroresCampos?.passwordNueva?.[0] && (
              <p className="text-[12px] font-medium text-[#CF1A1F]">
                {estado.erroresCampos.passwordNueva[0]}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="seguridad-confirmar"
              className="text-[14px] font-semibold text-[#2C2C2C]"
            >
              Confirmar nueva contraseña
            </label>
            <div className="flex h-[52px] items-center gap-3 rounded-[7px] border border-[#D9D9D9] bg-white px-4 focus-within:border-[#CF1A1F]">
              <input
                id="seguridad-confirmar"
                name="confirmarPassword"
                type={verConfirmar ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repite la nueva contraseña"
                className="w-full bg-transparent text-[16px] text-[#2C2C2C] outline-none placeholder:text-[#9E9E9E]"
              />
              <button
                type="button"
                aria-label={
                  verConfirmar
                    ? "Ocultar confirmación de contraseña"
                    : "Mostrar confirmación de contraseña"
                }
                onClick={() => setVerConfirmar((v) => !v)}
                className="cursor-pointer text-[#6B6B6B] hover:text-[#2C2C2C]"
              >
                <IconoOjo visible={verConfirmar} />
              </button>
            </div>
            {estado.erroresCampos?.confirmarPassword?.[0] && (
              <p className="text-[12px] font-medium text-[#CF1A1F]">
                {estado.erroresCampos.confirmarPassword[0]}
              </p>
            )}
          </div>

          {/* Ayuda y recomendaciones (Figma 344:461) */}
          <div className="rounded-[7px] bg-white p-5 shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
            <h3 className="text-[16px] font-semibold text-[#2C2C2C]">
              Ayuda y recomendaciones
            </h3>
            <ul className="mt-2.5 flex flex-col gap-1.5 text-[14px] text-[#6B6B6B]">
              <li>• Usa al menos 8 caracteres, incluyendo letras y números.</li>
              <li>
                • Evita utilizar información personal o repetir contraseñas
                anteriores.
              </li>
            </ul>
          </div>

          {/* Barra de acciones (Figma 344:465) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-[14px] text-[#6B6B6B]">
              Los cambios se aplicarán de inmediato en tu cuenta.
            </p>

            <div className="ml-auto flex items-center gap-3">
              <Link
                href="/cuenta"
                className="inline-flex h-[48px] items-center justify-center rounded-[7px] border border-[#D9D9D9] bg-white px-6 text-[16px] font-semibold text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5]"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={pendiente}
                className="h-[48px] cursor-pointer rounded-[7px] bg-[#E53935] px-6 text-[16px] font-semibold text-white transition-colors hover:bg-[#7C0300] disabled:opacity-60"
              >
                {pendiente ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

