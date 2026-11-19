"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import {
  accionCrearDireccion,
  accionEditarDireccion,
  accionEliminarDireccion,
  accionPredeterminarDireccion,
} from "../actions";
import {
  ESTADO_INICIAL_CLIENTE,
  MAXIMO_DIRECCIONES_POR_CLIENTE,
  MENSAJE_LIMITE_DIRECCIONES,
  PROVINCIAS_ARGENTINA,
  type EstadoAccionCliente,
} from "../schemas";
import type { SugerenciaCiudad } from "@/app/api/direcciones/autocompletar/route";
import { CampoCiudadAutocompletar } from "./campo-ciudad-autocompletar";

/**
 * Gestor CRUD de "Mis direcciones" reconstruido 1:1 desde Figma:
 * - `Vista 8: Gestion de direcciones` (`226:3609`): contenedor `#FAFAFA` (`rounded-[7px]`),
 *   boton superior derecho `Agregar direccion` (`#2C2C2C`, `rounded-[10px]`),
 *   hasta 3 tarjetas blancas (`rounded-[7px]`, sombra suave) con lapiz de edicion.
 * - `Vista agregar` (`226:8114`): modal `rounded-[30px]` + estado bloqueado en `#5F5F5F`
 *   y leyenda roja `282:439` al alcanzar 3 direcciones (`RN-02`).
 * - `Vista edicion 2` (`226:8081`): modal `rounded-[30px]` de edicion de direccion.
 * - Badge `Actual` en `#CF1A1F` (`421:943`) para la direccion predeterminada (`RF-18`)
 *   y soporte de `destinatario` distinto al titular (`RF-19`).
 */

export interface DireccionItemDTO {
  id: string;
  destinatario: string;
  calle: string;
  numero: string;
  piso: string | null;
  departamento: string | null;
  ciudad: string;
  provincia: string;
  codigoPostal: string | null;
  predeterminada: boolean;
}

interface DireccionesManagerProps {
  direcciones: DireccionItemDTO[];
  destinatarioSugerido: string;
  puedeGestionar: boolean;
}

type EstadoModalDireccion =
  | { tipo: "cerrado" }
  | { tipo: "crear" }
  | { tipo: "editar"; direccion: DireccionItemDTO };

function formatearDeptoPiso(
  departamento: string | null,
  piso: string | null,
): string {
  const partes: string[] = [];
  if (departamento) partes.push(`Departamento ${departamento}`);
  if (piso) partes.push(`Piso ${piso}`);
  return partes.length > 0 ? partes.join(", ") : "-";
}

export function DireccionesManager({
  direcciones,
  destinatarioSugerido,
  puedeGestionar,
}: DireccionesManagerProps) {
  const router = useRouter();
  const [modal, setModal] = useState<EstadoModalDireccion>({ tipo: "cerrado" });
  const [confirmandoBorradoId, setConfirmandoBorradoId] = useState<
    string | null
  >(null);
  const [estadoForm, setEstadoForm] = useState<EstadoAccionCliente>(
    ESTADO_INICIAL_CLIENTE,
  );
  const [avisoGlobal, setAvisoGlobal] = useState<{
    tipo: "exito" | "error";
    texto: string;
  } | null>(null);
  const [pendienteForm, iniciarTransicionForm] = useTransition();
  const [pendienteTarjeta, iniciarTransicionTarjeta] = useTransition();

  const [calle, setCalle] = useState("");
  const [numero, setNumero] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [provincia, setProvincia] = useState<string>("Entre Ríos");

  const limiteAlcanzado =
    direcciones.length >= MAXIMO_DIRECCIONES_POR_CLIENTE;

  useEffect(() => {
    if (modal.tipo === "cerrado") return;
    const alPulsarTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal({ tipo: "cerrado" });
      }
    };
    document.addEventListener("keydown", alPulsarTecla);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alPulsarTecla);
      document.body.style.overflow = "";
    };
  }, [modal.tipo]);

  const abrirModalCrear = () => {
    if (limiteAlcanzado) return;
    setEstadoForm(ESTADO_INICIAL_CLIENTE);
    setAvisoGlobal(null);
    setCalle("");
    setNumero("");
    setCiudad("");
    setCodigoPostal("");
    setProvincia("Entre Ríos");
    setModal({ tipo: "crear" });
  };

  const abrirModalEditar = (direccion: DireccionItemDTO) => {
    setEstadoForm(ESTADO_INICIAL_CLIENTE);
    setAvisoGlobal(null);
    setCalle(direccion.calle);
    setNumero(direccion.numero);
    setCiudad(direccion.ciudad);
    setCodigoPostal(direccion.codigoPostal ?? "");
    setProvincia(direccion.provincia);
    setModal({ tipo: "editar", direccion });
  };

  const aplicarSugerenciaCiudad = (sug: SugerenciaCiudad) => {
    setCiudad(sug.ciudad);
    if (sug.provincia) setProvincia(sug.provincia);
  };

  const cerrarModal = () => {
    setEstadoForm(ESTADO_INICIAL_CLIENTE);
    setModal({ tipo: "cerrado" });
  };

  const manejarSubmitModal = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    const esEdicion = modal.tipo === "editar";

    iniciarTransicionForm(async () => {
      const resultado = esEdicion
        ? await accionEditarDireccion(ESTADO_INICIAL_CLIENTE, formData)
        : await accionCrearDireccion(ESTADO_INICIAL_CLIENTE, formData);

      setEstadoForm(resultado);

      if (resultado.ok) {
        setModal({ tipo: "cerrado" });
        setAvisoGlobal({
          tipo: "exito",
          texto:
            resultado.mensaje ??
            (esEdicion
              ? "Dirección actualizada correctamente."
              : "Dirección agregada correctamente."),
        });
        router.refresh();
      }
    });
  };

  const manejarPredeterminar = (direccionId: string) => {
    setAvisoGlobal(null);
    iniciarTransicionTarjeta(async () => {
      const resultado = await accionPredeterminarDireccion(direccionId);
      if (resultado.ok) {
        setAvisoGlobal({
          tipo: "exito",
          texto: resultado.mensaje ?? "Dirección predeterminada actualizada.",
        });
        router.refresh();
      } else if (resultado.error) {
        setAvisoGlobal({ tipo: "error", texto: resultado.error });
      }
    });
  };

  const manejarEliminar = (direccionId: string) => {
    setAvisoGlobal(null);
    iniciarTransicionTarjeta(async () => {
      const resultado = await accionEliminarDireccion(direccionId);
      setConfirmandoBorradoId(null);
      if (resultado.ok) {
        setAvisoGlobal({
          tipo: "exito",
          texto: resultado.mensaje ?? "Dirección eliminada correctamente.",
        });
        router.refresh();
      } else if (resultado.error) {
        setAvisoGlobal({ tipo: "error", texto: resultado.error });
      }
    });
  };

  const direccionEditando = modal.tipo === "editar" ? modal.direccion : null;

  return (
    <div className="mx-auto flex w-full max-w-[1170px] flex-col gap-5">
      {/* Encabezado (Figma 226:3752 - UPPERCASE 18px 600) */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link
            href="/cuenta"
            className="w-fit text-[13px] font-medium text-[#6B6B6B] transition-colors hover:text-[#CF1A1F]"
          >
            ← Volver a Mi Perfil
          </Link>
          <h1 className="text-[18px] font-semibold uppercase leading-[22px] text-black">
            Mis direcciones
          </h1>
        </div>

        {puedeGestionar && (
          <span className="rounded-full bg-[#F5F5F5] px-3 py-1 text-[13px] font-semibold text-[#2C2C2C]">
            {direcciones.length} / {MAXIMO_DIRECCIONES_POR_CLIENTE} direcciones
          </span>
        )}
      </div>

      {/* Feedback de operaciones */}
      {avisoGlobal && (
        <div
          role={avisoGlobal.tipo === "error" ? "alert" : "status"}
          className={`rounded-[7px] border px-4 py-3 text-[14px] font-medium ${
            avisoGlobal.tipo === "error"
              ? "border-red-300 bg-red-50 text-[#CF1A1F]"
              : "border-green-300 bg-green-50 text-green-800"
          }`}
        >
          {avisoGlobal.texto}
        </div>
      )}

      {/* Contenedor principal #FAFAFA (Figma 226:3620 - 1170 x 409, radio 7) */}
      <section
        aria-label="Listado de direcciones guardadas"
        className="flex min-h-[409px] flex-col gap-6 rounded-[7px] bg-[#FAFAFA] p-5 sm:p-7"
      >
        {!puedeGestionar ? (
          <div className="my-auto rounded-[7px] bg-white p-8 text-center shadow-[0_2px_6px_rgba(0,0,0,0.12)]">
            <p className="text-[15px] text-[#6B6B6B]">
              Esta cuenta administrativa no posee un perfil de comprador para
              asociar direcciones de envío.
            </p>
          </div>
        ) : (
          <>
            {/* Barra superior con boton "Agregar direccion" y aviso RN-02 (Figma 226:3657 & 282:439) */}
            <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-[14px] text-[#6B6B6B]">
                Podés guardar hasta {MAXIMO_DIRECCIONES_POR_CLIENTE} direcciones
                de envío y elegir cuál usar por defecto.
              </p>

              <div className="flex flex-col items-end gap-1.5">
                <button
                  type="button"
                  disabled={limiteAlcanzado}
                  onClick={abrirModalCrear}
                  className={`inline-flex min-h-[38px] items-center justify-center rounded-[10px] px-5 py-1.5 text-[17px] font-medium text-white transition-opacity sm:text-[19px] ${
                    limiteAlcanzado
                      ? "cursor-not-allowed bg-[#5F5F5F]"
                      : "cursor-pointer bg-[#2C2C2C] hover:opacity-90"
                  }`}
                >
                  Agregar dirección
                </button>

                {limiteAlcanzado && (
                  <p
                    role="status"
                    className="max-w-[290px] text-right text-[13px] font-medium leading-snug text-[#CF1A1F]"
                  >
                    {MENSAJE_LIMITE_DIRECCIONES}
                  </p>
                )}
              </div>
            </div>

            {/* Tarjetas de direcciones (Figma 226:3621, 226:3639, 226:3659) */}
            {direcciones.length === 0 ? (
              <div className="my-auto flex flex-col items-center justify-center gap-4 rounded-[7px] bg-white px-6 py-12 text-center shadow-[0_2px_6px_rgba(0,0,0,0.12)]">
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9E9E9E"
                  strokeWidth="1.8"
                  className="h-12 w-12"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 10c0 5.5-7 11-7 11s-7-5.5-7-11a7 7 0 0 1 14 0Z"
                  />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
                <div className="flex flex-col gap-1">
                  <h2 className="text-[18px] font-semibold text-[#2C2C2C]">
                    Todavía no tenés direcciones guardadas
                  </h2>
                  <p className="max-w-md text-[14px] text-[#6B6B6B]">
                    Agregá una dirección de entrega para agilizar tus próximas
                    compras. Podés indicar un destinatario distinto al titular de
                    la cuenta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={abrirModalCrear}
                  className="mt-1 cursor-pointer rounded-[10px] bg-[#2C2C2C] px-5 py-2.5 text-[16px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  Agregar mi primera dirección
                </button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {direcciones.map((dir, indice) => {
                  const pidiendoConfirmacion = confirmandoBorradoId === dir.id;
                  return (
                    <article
                      key={dir.id}
                      className={`relative flex min-h-[357px] flex-col justify-between rounded-[7px] bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.16)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.2)] ${
                        dir.predeterminada
                          ? "ring-2 ring-[#CF1A1F]/80"
                          : "border border-[#ECECEC]"
                      }`}
                    >
                      {/* Cabecera de la tarjeta: Badge Actual + Lapiz Editar + Eliminar */}
                      <div>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          {dir.predeterminada ? (
                            <span className="inline-flex items-center rounded-full bg-[#FFCDD2]/60 px-2.5 py-0.5 text-[13px] font-bold text-[#CF1A1F]">
                              Actual
                            </span>
                          ) : (
                            <span className="text-[12px] font-semibold uppercase tracking-wide text-[#9E9E9E]">
                              Dirección {indice + 1}
                            </span>
                          )}

                          <div className="flex items-center gap-1.5">
                            {/* Lapiz de edicion (Figma Note Pencil Fill 24x24 #000000) */}
                            <button
                              type="button"
                              aria-label={`Editar dirección ${dir.calle} ${dir.numero}`}
                              title="Editar dirección"
                              disabled={pendienteTarjeta}
                              onClick={() => abrirModalEditar(dir)}
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-black transition-colors hover:bg-[#F5F5F5] disabled:opacity-50"
                            >
                              <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-[19px] w-[19px]"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z"
                                />
                              </svg>
                            </button>

                            {/* Eliminar direccion */}
                            <button
                              type="button"
                              aria-label={`Eliminar dirección ${dir.calle} ${dir.numero}`}
                              title="Eliminar dirección"
                              disabled={pendienteTarjeta}
                              onClick={() =>
                                setConfirmandoBorradoId(
                                  pidiendoConfirmacion ? null : dir.id,
                                )
                              }
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#6B6B6B] transition-colors hover:bg-red-50 hover:text-[#CF1A1F] disabled:opacity-50"
                            >
                              <svg
                                aria-hidden
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.9"
                                className="h-[18px] w-[18px]"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12Z"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Pila de datos de envio (Figma Frame 142: labels 18px 600 #000, valores 14px 400 #000) */}
                        <dl className="flex flex-col gap-[10px]">
                          <div>
                            <dt className="text-[16px] font-semibold leading-[20px] text-black">
                              Dirección
                            </dt>
                            <dd className="mt-0.5 text-[14px] font-normal leading-[18px] text-black">
                              {dir.calle} {dir.numero}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[16px] font-semibold leading-[20px] text-black">
                              Departamento/Piso
                            </dt>
                            <dd className="mt-0.5 text-[14px] font-normal leading-[18px] text-black">
                              {formatearDeptoPiso(dir.departamento, dir.piso)}
                            </dd>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <dt className="text-[16px] font-semibold leading-[20px] text-black">
                                Ciudad
                              </dt>
                              <dd className="mt-0.5 text-[14px] font-normal leading-[18px] text-black">
                                {dir.ciudad}
                              </dd>
                            </div>

                            <div>
                              <dt className="text-[16px] font-semibold leading-[20px] text-black">
                                CP
                              </dt>
                              <dd className="mt-0.5 text-[14px] font-normal leading-[18px] text-black">
                                {dir.codigoPostal ?? "-"}
                              </dd>
                            </div>
                          </div>

                          <div>
                            <dt className="text-[16px] font-semibold leading-[20px] text-black">
                              Provincia
                            </dt>
                            <dd className="mt-0.5 text-[14px] font-normal leading-[18px] text-black">
                              {dir.provincia}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-[16px] font-semibold leading-[20px] text-black">
                              Recibe (Destinatario)
                            </dt>
                            <dd className="mt-0.5 text-[14px] font-normal leading-[18px] text-black">
                              {dir.destinatario}
                            </dd>
                          </div>
                        </dl>
                      </div>

                      {/* Pie de tarjeta: Confirmacion de borrado o seleccion como predeterminada */}
                      <div className="mt-4 border-t border-[#EFEFEF] pt-3">
                        {pidiendoConfirmacion ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12px] font-semibold text-[#CF1A1F]">
                              ¿Eliminar esta dirección?
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={pendienteTarjeta}
                                onClick={() => setConfirmandoBorradoId(null)}
                                className="cursor-pointer rounded px-2 py-1 text-[12px] font-semibold text-[#4E4E4E] hover:bg-[#F5F5F5]"
                              >
                                No
                              </button>
                              <button
                                type="button"
                                disabled={pendienteTarjeta}
                                onClick={() => manejarEliminar(dir.id)}
                                className="cursor-pointer rounded bg-[#CF1A1F] px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-[#7C0300]"
                              >
                                Sí, borrar
                              </button>
                            </div>
                          </div>
                        ) : dir.predeterminada ? (
                          <span className="text-[12px] font-medium text-[#6B6B6B]">
                            Seleccionada como dirección principal de envío
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={pendienteTarjeta}
                            onClick={() => manejarPredeterminar(dir.id)}
                            className="cursor-pointer text-[13px] font-semibold text-[#2C2C2C] underline transition-colors hover:text-[#CF1A1F] disabled:opacity-50"
                          >
                            Marcar como predeterminada
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </section>

      {/* Modal Agregar / Editar direccion (Figma 226:8114 & 226:8081: bg #FFFFFF, radio 30px) */}
      {modal.tipo !== "cerrado" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
          <button
            type="button"
            aria-label="Cerrar ventana"
            onClick={cerrarModal}
            className="fixed inset-0 bg-black/50"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-modal-direccion"
            className="relative z-10 my-auto w-full max-w-[460px] rounded-[30px] bg-white p-6 shadow-2xl sm:p-8"
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id="titulo-modal-direccion"
                className="text-[20px] font-semibold text-black"
              >
                {modal.tipo === "editar"
                  ? "Editar dirección"
                  : "Agregar dirección"}
              </h2>

              <button
                type="button"
                aria-label="Cerrar formulario"
                onClick={cerrarModal}
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5]"
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18 6 6 18M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {estadoForm.error && (
              <div
                role="alert"
                className="mt-4 rounded-[10px] border border-red-300 bg-red-50 px-3.5 py-2.5 text-[13px] font-medium text-[#CF1A1F]"
              >
                {estadoForm.error}
              </div>
            )}

            <form
              key={direccionEditando?.id ?? "nueva-direccion"}
              onSubmit={manejarSubmitModal}
              className="mt-5 flex flex-col gap-3.5"
              noValidate
            >
              {direccionEditando && (
                <input
                  type="hidden"
                  name="direccionId"
                  value={direccionEditando.id}
                />
              )}

              {/* Destinatario (RF-19: puede diferir del titular) */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="dir-destinatario"
                  className="text-[15px] font-semibold text-black"
                >
                  Destinatario *
                </label>
                <input
                  id="dir-destinatario"
                  name="destinatario"
                  type="text"
                  required
                  defaultValue={
                    direccionEditando?.destinatario ?? destinatarioSugerido
                  }
                  placeholder="Nombre y apellido de quien recibe"
                  className="h-[42px] rounded-[7px] border border-[#D9D9D9] bg-white px-3 text-[14px] text-black outline-none placeholder:text-[#9E9E9E] focus:border-[#CF1A1F]"
                />
                {estadoForm.erroresCampos?.destinatario?.[0] && (
                  <p className="text-[12px] font-medium text-[#CF1A1F]">
                    {estadoForm.erroresCampos.destinatario[0]}
                  </p>
                )}
              </div>

              {/* Direccion: Calle + Altura */}
              <div className="grid grid-cols-[1fr_115px] gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="dir-calle"
                    className="text-[15px] font-semibold text-black"
                  >
                    Dirección (Calle) *
                  </label>
                  <input
                    id="dir-calle"
                    name="calle"
                    type="text"
                    required
                    value={calle}
                    onChange={(e) => setCalle(e.target.value)}
                    placeholder="Ingrese su calle"
                    className="h-[42px] w-full rounded-[7px] border border-[#D9D9D9] bg-white px-3 text-[14px] text-black outline-none placeholder:text-[#9E9E9E] focus:border-[#CF1A1F]"
                  />
                  {estadoForm.erroresCampos?.calle?.[0] && (
                    <p className="text-[12px] font-medium text-[#CF1A1F]">
                      {estadoForm.erroresCampos.calle[0]}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="dir-numero"
                    className="text-[15px] font-semibold text-black"
                  >
                    Altura *
                  </label>
                  <input
                    id="dir-numero"
                    name="numero"
                    type="text"
                    required
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    placeholder="Ej: 213"
                    className="h-[42px] rounded-[7px] border border-[#D9D9D9] bg-white px-3 text-[14px] text-black outline-none placeholder:text-[#9E9E9E] focus:border-[#CF1A1F]"
                  />
                  {estadoForm.erroresCampos?.numero?.[0] && (
                    <p className="text-[12px] font-medium text-[#CF1A1F]">
                      {estadoForm.erroresCampos.numero[0]}
                    </p>
                  )}
                </div>
              </div>

              {/* Departamento / Piso */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="dir-departamento"
                    className="text-[15px] font-semibold text-black"
                  >
                    Departamento
                  </label>
                  <input
                    id="dir-departamento"
                    name="departamento"
                    type="text"
                    defaultValue={direccionEditando?.departamento ?? ""}
                    placeholder="Opcional (ej: 6B)"
                    className="h-[42px] rounded-[7px] border border-[#D9D9D9] bg-white px-3 text-[14px] text-black outline-none placeholder:text-[#9E9E9E] focus:border-[#CF1A1F]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="dir-piso"
                    className="text-[15px] font-semibold text-black"
                  >
                    Piso
                  </label>
                  <input
                    id="dir-piso"
                    name="piso"
                    type="text"
                    defaultValue={direccionEditando?.piso ?? ""}
                    placeholder="Opcional (ej: 2)"
                    className="h-[42px] rounded-[7px] border border-[#D9D9D9] bg-white px-3 text-[14px] text-black outline-none placeholder:text-[#9E9E9E] focus:border-[#CF1A1F]"
                  />
                </div>
              </div>

              {/* Ciudad + CP */}
              <div className="grid grid-cols-[1fr_130px] gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="dir-ciudad"
                    className="text-[15px] font-semibold text-black"
                  >
                    Ciudad *
                  </label>
                  <CampoCiudadAutocompletar
                    id="dir-ciudad"
                    name="ciudad"
                    required
                    value={ciudad}
                    onChange={setCiudad}
                    onSeleccionar={aplicarSugerenciaCiudad}
                    placeholder="Empezá a escribir tu ciudad..."
                    className="h-[42px] w-full rounded-[7px] border border-[#D9D9D9] bg-white px-3 text-[14px] text-black outline-none placeholder:text-[#9E9E9E] focus:border-[#CF1A1F]"
                  />
                  {estadoForm.erroresCampos?.ciudad?.[0] && (
                    <p className="text-[12px] font-medium text-[#CF1A1F]">
                      {estadoForm.erroresCampos.ciudad[0]}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="dir-cp"
                    className="text-[15px] font-semibold text-black"
                  >
                    CP
                  </label>
                  <input
                    id="dir-cp"
                    name="codigoPostal"
                    type="text"
                    value={codigoPostal}
                    onChange={(e) => setCodigoPostal(e.target.value)}
                    placeholder="Ej: 3260"
                    className="h-[42px] rounded-[7px] border border-[#D9D9D9] bg-white px-3 text-[14px] text-black outline-none placeholder:text-[#9E9E9E] focus:border-[#CF1A1F]"
                  />
                  {estadoForm.erroresCampos?.codigoPostal?.[0] && (
                    <p className="text-[12px] font-medium text-[#CF1A1F]">
                      {estadoForm.erroresCampos.codigoPostal[0]}
                    </p>
                  )}
                </div>
              </div>

              {/* Provincia */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="dir-provincia"
                  className="text-[15px] font-semibold text-black"
                >
                  Provincia *
                </label>
                <select
                  id="dir-provincia"
                  name="provincia"
                  required
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  className="h-[42px] rounded-[7px] border border-[#D9D9D9] bg-white px-3 text-[14px] text-black outline-none focus:border-[#CF1A1F]"
                >
                  {provincia &&
                    !PROVINCIAS_ARGENTINA.includes(
                      provincia as (typeof PROVINCIAS_ARGENTINA)[number],
                    ) && (
                      <option value={provincia}>{provincia}</option>
                    )}
                  {PROVINCIAS_ARGENTINA.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
                {estadoForm.erroresCampos?.provincia?.[0] && (
                  <p className="text-[12px] font-medium text-[#CF1A1F]">
                    {estadoForm.erroresCampos.provincia[0]}
                  </p>
                )}
              </div>

              {/* Predeterminada */}
              <label className="mt-1 flex cursor-pointer items-center gap-2.5 text-[14px] text-[#2C2C2C]">
                <input
                  type="checkbox"
                  name="predeterminada"
                  defaultChecked={
                    direccionEditando
                      ? direccionEditando.predeterminada
                      : direcciones.length === 0
                  }
                  className="h-4 w-4 accent-[#CF1A1F]"
                />
                <span>Usar como dirección predeterminada para mis envíos</span>
              </label>

              {/* Acciones del modal */}
              <div className="mt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={pendienteForm}
                  onClick={cerrarModal}
                  className="h-[40px] cursor-pointer rounded-[10px] border border-[#D9D9D9] bg-white px-4 text-[15px] font-medium text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pendienteForm}
                  className="h-[40px] cursor-pointer rounded-[10px] bg-[#2C2C2C] px-5 text-[16px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {pendienteForm
                    ? "Guardando..."
                    : modal.tipo === "editar"
                      ? "Guardar cambios"
                      : "Agregar dirección"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
