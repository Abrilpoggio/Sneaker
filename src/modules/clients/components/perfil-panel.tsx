"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";

import { useSesion } from "@/lib/auth-client";
import { accionActualizarPerfil } from "../actions";
import {
  ESTADO_INICIAL_CLIENTE,
  type EstadoAccionCliente,
} from "../schemas";

/**
 * Panel interactivo de "Informacion de perfil" reconstruido desde Figma
 * (`Nodo 334:818` + tokens de edicion de `Nodo 341:947`).
 *
 * Cumple CU3, RF-15, RF-16 y RN-03:
 * - Edicion de `nombre`, `apellido` y `telefono` (y alta unica de `dni` si es null).
 * - Bloqueo visual y funcional de `usuario`, `correo` y `dni` ya registrado.
 * - Sincronizacion inmediata con `SessionProvider` (`update()`) al guardar.
 */

export interface PerfilPanelProps {
  usuario: {
    usuario: string;
    correo: string;
    rol: string;
    creadoEnIso: string;
    tienePassword: boolean;
    tieneGoogle: boolean;
  };
  cliente: {
    nombre: string;
    apellido: string;
    telefono: string | null;
    dni: number | null;
  } | null;
  iniciarEnEdicion?: boolean;
}

function formatearDni(dni: number | null): string {
  if (dni === null) return "Sin registrar";
  return dni.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function formatearFechaAlta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

export function PerfilPanel({
  usuario,
  cliente,
  iniciarEnEdicion = false,
}: PerfilPanelProps) {
  const router = useRouter();
  const { update } = useSesion();
  const [editando, setEditando] = useState(
    Boolean(cliente && iniciarEnEdicion),
  );
  const [estado, setEstado] = useState<EstadoAccionCliente>(
    ESTADO_INICIAL_CLIENTE,
  );
  const [pendiente, iniciarTransicion] = useTransition();

  const metodoAcceso =
    usuario.tienePassword && usuario.tieneGoogle
      ? "Correo y contraseña · Google vinculado"
      : usuario.tieneGoogle
        ? "Cuenta de Google (OAuth)"
        : "Correo y contraseña";

  const nombreCompleto = cliente
    ? [
        cliente.nombre,
        cliente.apellido !== cliente.nombre ? cliente.apellido : "",
      ]
        .filter(Boolean)
        .join(" ")
    : usuario.usuario;

  const manejarEnvio = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);

    iniciarTransicion(async () => {
      const resultado = await accionActualizarPerfil(
        ESTADO_INICIAL_CLIENTE,
        formData,
      );
      setEstado(resultado);

      if (resultado.ok) {
        await update();
        setEditando(false);
        router.refresh();
      }
    });
  };

  const abrirEdicion = () => {
    setEstado(ESTADO_INICIAL_CLIENTE);
    setEditando(true);
  };

  const cancelarEdicion = () => {
    setEstado(ESTADO_INICIAL_CLIENTE);
    setEditando(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1170px] flex-col gap-5">
      {/* Encabezado de seccion (Figma 334:923) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            href="/cuenta"
            className="w-fit text-[13px] font-medium text-[#6B6B6B] transition-colors hover:text-[#CF1A1F]"
          >
            ← Volver a Mi Perfil
          </Link>
          <h1 className="text-[18px] font-semibold leading-[22px] text-black">
            Información de perfil
          </h1>
        </div>
      </div>

      {/* Feedback de exito tras guardar */}
      {estado.ok && estado.mensaje && !editando && (
        <div
          role="status"
          className="rounded-[7px] border border-green-300 bg-green-50 px-4 py-3 text-[14px] font-medium text-green-800"
        >
          {estado.mensaje}
        </div>
      )}

      {/* Contenedor principal #FAFAFA (Figma 342:439) */}
      <div className="flex flex-col gap-6 rounded-[7px] bg-[#FAFAFA] p-5 sm:p-8">
        {/* Tarjeta 1: Datos personales (Figma 342:440) */}
        <section
          aria-labelledby="titulo-datos-personales"
          className="flex flex-col gap-5 rounded-[7px] bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.12)] sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="titulo-datos-personales"
              className="text-[18px] font-semibold leading-[22px] text-[#2C2C2C]"
            >
              Datos personales
            </h2>

            {cliente && !editando && (
              <button
                type="button"
                onClick={abrirEdicion}
                className="inline-flex cursor-pointer items-center gap-2 rounded-[7px] bg-[#2C2C2C] px-4 py-2 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 3.487a2.1 2.1 0 1 1 2.97 2.97L8.5 17.79 4 19l1.21-4.5L16.862 3.487Z"
                  />
                </svg>
                Editar datos
              </button>
            )}
          </div>

          {!cliente ? (
            <p className="text-[14px] text-[#6B6B6B]">
              Esta sesión corresponde a una cuenta con rol{" "}
              <strong className="font-semibold text-[#2C2C2C]">
                {usuario.rol}
              </strong>{" "}
              y no posee ficha de comprador asociada.
            </p>
          ) : !editando ? (
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-[#9E9E9E]">
                  Nombre completo
                </span>
                <span className="text-[16px] font-medium text-[#2C2C2C]">
                  {nombreCompleto}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-[#9E9E9E]">
                  Teléfono
                </span>
                <span className="text-[16px] font-medium text-[#2C2C2C]">
                  {cliente.telefono ?? "Sin registrar"}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-[#9E9E9E]">
                  Documento (DNI)
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[16px] font-medium text-[#2C2C2C]">
                    {formatearDni(cliente.dni)}
                  </span>
                  {cliente.dni !== null && (
                    <span className="rounded bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-medium text-[#6B6B6B]">
                      No editable
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[13px] font-medium text-[#9E9E9E]">
                  Miembro desde
                </span>
                <span className="text-[16px] font-medium text-[#2C2C2C]">
                  {formatearFechaAlta(usuario.creadoEnIso)}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={manejarEnvio} className="flex flex-col gap-5" noValidate>
              {estado.error && (
                <div
                  role="alert"
                  className="rounded-[7px] border border-red-300 bg-red-50 px-4 py-3 text-[14px] font-medium text-[#CF1A1F]"
                >
                  {estado.error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="perfil-nombre"
                    className="text-[14px] font-semibold text-[#2C2C2C]"
                  >
                    Nombre *
                  </label>
                  <input
                    id="perfil-nombre"
                    name="nombre"
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    defaultValue={cliente.nombre}
                    className="h-[52px] rounded-[7px] border border-[#D9D9D9] bg-white px-4 text-[16px] text-[#2C2C2C] outline-none transition-colors focus:border-[#CF1A1F]"
                  />
                  {estado.erroresCampos?.nombre?.[0] && (
                    <p className="text-[12px] font-medium text-[#CF1A1F]">
                      {estado.erroresCampos.nombre[0]}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="perfil-apellido"
                    className="text-[14px] font-semibold text-[#2C2C2C]"
                  >
                    Apellido *
                  </label>
                  <input
                    id="perfil-apellido"
                    name="apellido"
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    defaultValue={cliente.apellido}
                    className="h-[52px] rounded-[7px] border border-[#D9D9D9] bg-white px-4 text-[16px] text-[#2C2C2C] outline-none transition-colors focus:border-[#CF1A1F]"
                  />
                  {estado.erroresCampos?.apellido?.[0] && (
                    <p className="text-[12px] font-medium text-[#CF1A1F]">
                      {estado.erroresCampos.apellido[0]}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="perfil-telefono"
                    className="text-[14px] font-semibold text-[#2C2C2C]"
                  >
                    Teléfono
                  </label>
                  <input
                    id="perfil-telefono"
                    name="telefono"
                    type="tel"
                    placeholder="+54 3442 123 4567"
                    defaultValue={cliente.telefono ?? ""}
                    className="h-[52px] rounded-[7px] border border-[#D9D9D9] bg-white px-4 text-[16px] text-[#2C2C2C] outline-none transition-colors placeholder:text-[#9E9E9E] focus:border-[#CF1A1F]"
                  />
                  {estado.erroresCampos?.telefono?.[0] && (
                    <p className="text-[12px] font-medium text-[#CF1A1F]">
                      {estado.erroresCampos.telefono[0]}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="perfil-dni"
                    className="flex items-center justify-between text-[14px] font-semibold text-[#2C2C2C]"
                  >
                    <span>Documento (DNI)</span>
                    {cliente.dni !== null && (
                      <span className="text-[12px] font-normal text-[#6B6B6B]">
                        Bloqueado (RN-03)
                      </span>
                    )}
                  </label>
                  {cliente.dni !== null ? (
                    <input
                      id="perfil-dni"
                      type="text"
                      disabled
                      readOnly
                      value={formatearDni(cliente.dni)}
                      className="h-[52px] cursor-not-allowed rounded-[7px] border border-[#E5E5E5] bg-[#F5F5F5] px-4 text-[16px] text-[#6B6B6B]"
                    />
                  ) : (
                    <>
                      <input
                        id="perfil-dni"
                        name="dni"
                        type="text"
                        inputMode="numeric"
                        placeholder="Ej: 40234567 (se registra por única vez)"
                        className="h-[52px] rounded-[7px] border border-[#D9D9D9] bg-white px-4 text-[16px] text-[#2C2C2C] outline-none transition-colors placeholder:text-[#9E9E9E] focus:border-[#CF1A1F]"
                      />
                      {estado.erroresCampos?.dni?.[0] && (
                        <p className="text-[12px] font-medium text-[#CF1A1F]">
                          {estado.erroresCampos.dni[0]}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Campos bloqueados visibles en modo edicion para explicitar RF-16 / RN-03 */}
              <div className="grid gap-4 rounded-[7px] border border-[#EAEAEA] bg-[#FAFAFA] p-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="perfil-usuario-bloqueado"
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-[#6B6B6B]"
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-3.5 w-3.5"
                    >
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    Usuario (No modificable · RN-03)
                  </label>
                  <input
                    id="perfil-usuario-bloqueado"
                    type="text"
                    disabled
                    readOnly
                    value={usuario.usuario}
                    className="h-[46px] cursor-not-allowed rounded-[7px] border border-[#E5E5E5] bg-[#EFEFEF] px-3.5 text-[15px] text-[#6B6B6B]"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="perfil-correo-bloqueado"
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-[#6B6B6B]"
                  >
                    <svg
                      aria-hidden
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-3.5 w-3.5"
                    >
                      <rect x="4" y="11" width="16" height="10" rx="2" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                    </svg>
                    Correo electrónico (No modificable · RN-03)
                  </label>
                  <input
                    id="perfil-correo-bloqueado"
                    type="email"
                    disabled
                    readOnly
                    value={usuario.correo}
                    className="h-[46px] cursor-not-allowed rounded-[7px] border border-[#E5E5E5] bg-[#EFEFEF] px-3.5 text-[15px] text-[#6B6B6B]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <p className="text-[13px] text-[#6B6B6B]">
                  Por seguridad, el usuario y el correo electrónico asociados a tu
                  cuenta son permanentes.
                </p>

                <div className="ml-auto flex items-center gap-3">
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={cancelarEdicion}
                    className="h-[48px] cursor-pointer rounded-[7px] border border-[#D9D9D9] bg-white px-6 text-[15px] font-semibold text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5] disabled:opacity-60"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pendiente}
                    className="h-[48px] cursor-pointer rounded-[7px] bg-[#CF1A1F] px-6 text-[15px] font-semibold text-white transition-colors hover:bg-[#7C0300] disabled:opacity-60"
                  >
                    {pendiente ? "Guardando..." : "Guardar cambios"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </section>

        {/* Tarjeta 2: Datos de la cuenta (Figma 342:456 - RN-03 / RF-16) */}
        <section
          aria-labelledby="titulo-datos-cuenta"
          className="flex flex-col gap-5 rounded-[7px] bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.12)] sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              id="titulo-datos-cuenta"
              className="text-[18px] font-semibold leading-[22px] text-[#2C2C2C]"
            >
              Datos de la cuenta
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F5] px-3 py-1 text-[12px] font-medium text-[#6B6B6B]">
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-3.5 w-3.5"
              >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              Identificadores protegidos
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[#9E9E9E]">
                Correo electrónico
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="break-all text-[16px] font-medium text-[#2C2C2C]">
                  {usuario.correo}
                </span>
                <span className="rounded bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-medium text-[#6B6B6B]">
                  No editable
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[#9E9E9E]">
                Nombre de usuario
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[16px] font-medium text-[#2C2C2C]">
                  {usuario.usuario}
                </span>
                <span className="rounded bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-medium text-[#6B6B6B]">
                  No editable
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[#9E9E9E]">
                Contraseña
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[16px] font-medium tracking-widest text-[#2C2C2C]">
                  {usuario.tienePassword ? "••••••••••••" : "Sin definir"}
                </span>
                <Link
                  href="/cuenta/seguridad"
                  className="text-[13px] font-semibold text-[#CF1A1F] underline hover:text-[#7C0300]"
                >
                  Gestionar en Seguridad
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-[#9E9E9E]">
                Autenticación
              </span>
              <span className="text-[16px] font-medium text-[#2C2C2C]">
                {metodoAcceso}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
