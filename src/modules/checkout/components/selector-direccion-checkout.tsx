"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  accionGuardarDireccionCheckout,
  accionSeleccionarDireccionCheckout,
  ESTADO_INICIAL_DIRECCION_CHECKOUT,
} from "@/modules/checkout/direccion-actions";
import {
  MAXIMO_DIRECCIONES_POR_CLIENTE,
  PROVINCIAS_ARGENTINA,
} from "@/modules/clients/schemas";
import type { SugerenciaDireccion } from "@/app/api/direcciones/autocompletar/route";
import { CampoCalleAutocompletar } from "@/modules/clients/components/campo-calle-autocompletar";

export interface DireccionCheckoutItem {
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

interface SelectorDireccionCheckoutProps {
  direcciones: DireccionCheckoutItem[];
}

const inputClass =
  "w-full rounded border border-[#D9D9D9] bg-white px-3 py-2 text-sm text-[#2C2C2C] outline-none focus:border-[#CF1A1F] focus:ring-1 focus:ring-[#CF1A1F]";

/**
 * Selector y alta/edicion inline de direccion durante el checkout (RF-18).
 * Evita salir de `/carrito/checkout` mientras corre la reserva de stock y
 * recalcula el costo de envio (RF-45) al cambiar o guardar la direccion.
 */
export function SelectorDireccionCheckout({
  direcciones,
}: SelectorDireccionCheckoutProps) {
  const router = useRouter();
  const [modoForm, setModoForm] = useState<"cerrado" | "nueva" | "editar">(
    direcciones.length === 0 ? "nueva" : "cerrado",
  );
  const [editando, setEditando] = useState<DireccionCheckoutItem | null>(null);
  const [calle, setCalle] = useState("");
  const [numero, setNumero] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [provincia, setProvincia] = useState<string>("Entre Ríos");
  const [codigoPostal, setCodigoPostal] = useState("");

  const [pendienteSeleccion, startTransition] = useTransition();
  const [errorSeleccion, setErrorSeleccion] = useState<string | null>(null);

  const abrirFormNueva = () => {
    setEditando(null);
    setCalle("");
    setNumero("");
    setCiudad("");
    setProvincia("Entre Ríos");
    setCodigoPostal("");
    setModoForm("nueva");
  };

  const abrirFormEditar = (dir: DireccionCheckoutItem) => {
    setEditando(dir);
    setCalle(dir.calle);
    setNumero(dir.numero);
    setCiudad(dir.ciudad);
    setProvincia(dir.provincia);
    setCodigoPostal(dir.codigoPostal ?? "");
    setModoForm("editar");
  };

  const aplicarSugerencia = (sug: SugerenciaDireccion) => {
    setCalle(sug.calle);
    if (sug.numero) setNumero(sug.numero);
    if (sug.ciudad) setCiudad(sug.ciudad);
    if (sug.provincia) setProvincia(sug.provincia);
    if (sug.codigoPostal) setCodigoPostal(sug.codigoPostal);
  };

  const [estadoForm, formAction, guardando] = useActionState(
    async (
      prev: typeof ESTADO_INICIAL_DIRECCION_CHECKOUT,
      formData: FormData,
    ) => {
      const res = await accionGuardarDireccionCheckout(prev, formData);
      if (res.ok) {
        setModoForm("cerrado");
        setEditando(null);
        router.refresh();
      }
      return res;
    },
    ESTADO_INICIAL_DIRECCION_CHECKOUT,
  );

  const puedeAgregarMas = direcciones.length < MAXIMO_DIRECCIONES_POR_CLIENTE;
  const activa = direcciones[0] ?? null;

  function seleccionarDireccion(id: string) {
    if (activa?.id === id) return;
    setErrorSeleccion(null);
    startTransition(async () => {
      const res = await accionSeleccionarDireccionCheckout(id);
      if (!res.ok) {
        setErrorSeleccion(res.error ?? "No se pudo cambiar la dirección.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <section
      aria-label="Dirección de envío"
      className="flex flex-col gap-4 rounded-md border border-[#D9D9D9] bg-white p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#9E9E9E]">
            Dirección de envío (RF-18)
          </p>
          <p className="text-sm text-[#6B6B6B]">
            Elegí una dirección guardada ({direcciones.length}/
            {MAXIMO_DIRECCIONES_POR_CLIENTE}) o cargá una nueva sin perder tu
            reserva.
          </p>
        </div>

        {modoForm === "cerrado" && puedeAgregarMas && (
          <button
            type="button"
            onClick={abrirFormNueva}
            className="rounded border border-[#CF1A1F] px-3 py-1.5 text-sm font-semibold text-[#CF1A1F] transition-colors hover:bg-[#FFF5F5]"
          >
            + Nueva dirección
          </button>
        )}
      </div>

      {errorSeleccion && (
        <p className="rounded bg-[#FFEBEE] px-3 py-2 text-xs font-medium text-[#7C0300]">
          {errorSeleccion}
        </p>
      )}

      {direcciones.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {direcciones.map((dir, indice) => {
            const seleccionada = indice === 0;
            return (
              <div
                key={dir.id}
                className={`flex flex-col justify-between gap-3 rounded-md border p-3.5 transition-colors ${
                  seleccionada
                    ? "border-[#CF1A1F] bg-[#FFF9F9]"
                    : "border-[#D9D9D9] bg-[#FAFAFA] hover:border-[#9E9E9E]"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-[#2C2C2C]">
                      {dir.destinatario}
                    </span>
                    {seleccionada && (
                      <span className="rounded-full bg-[#CF1A1F] px-2 py-0.5 text-[11px] font-semibold text-white">
                        Seleccionada
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#4E4E4E]">
                    {dir.calle} {dir.numero}
                    {dir.piso ? `, Piso ${dir.piso}` : ""}
                    {dir.departamento ? `, Depto ${dir.departamento}` : ""}
                  </p>
                  <p className="text-xs text-[#6B6B6B]">
                    {dir.ciudad}, {dir.provincia}
                    {dir.codigoPostal ? ` (CP ${dir.codigoPostal})` : ""}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-[#E5E5E5] pt-2">
                  {!seleccionada ? (
                    <button
                      type="button"
                      disabled={pendienteSeleccion}
                      onClick={() => seleccionarDireccion(dir.id)}
                      className="text-xs font-semibold text-[#CF1A1F] underline hover:opacity-75 disabled:opacity-50"
                    >
                      {pendienteSeleccion ? "Cambiando..." : "Enviar acá"}
                    </button>
                  ) : (
                    <span className="text-xs font-medium text-[#2E7D32]">
                      Usada para el envío
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => abrirFormEditar(dir)}
                    className="text-xs font-semibold text-[#4E4E4E] underline hover:text-[#2C2C2C]"
                  >
                    Editar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modoForm !== "cerrado" && (
        <form
          key={editando?.id ?? "nueva-direccion"}
          action={formAction}
          className="rounded-md border border-[#E5E5E5] bg-[#FAFAFA] p-4"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#2C2C2C]">
              {modoForm === "editar"
                ? "Editar dirección de envío"
                : "Cargar dirección de envío"}
            </h3>
            {direcciones.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setModoForm("cerrado");
                  setEditando(null);
                }}
                className="text-xs font-semibold text-[#6B6B6B] underline hover:text-[#2C2C2C]"
              >
                Cancelar
              </button>
            )}
          </div>

          {editando && (
            <input type="hidden" name="direccionId" value={editando.id} />
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label
                htmlFor="dir-destinatario"
                className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
              >
                Nombre del destinatario (quien recibe) *
              </label>
              <input
                id="dir-destinatario"
                name="destinatario"
                required
                defaultValue={editando?.destinatario ?? ""}
                placeholder="Ej: Abril Poggio"
                className={inputClass}
              />
              {estadoForm.erroresCampos?.destinatario && (
                <p className="mt-1 text-xs text-[#CF1A1F]">
                  {estadoForm.erroresCampos.destinatario}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="dir-calle"
                className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
              >
                Calle *
              </label>
              <CampoCalleAutocompletar
                id="dir-calle"
                name="calle"
                required
                value={calle}
                onChange={setCalle}
                onSeleccionar={aplicarSugerencia}
                placeholder="Empezá a escribir calle y altura..."
                className={inputClass}
              />
              {estadoForm.erroresCampos?.calle && (
                <p className="mt-1 text-xs text-[#CF1A1F]">
                  {estadoForm.erroresCampos.calle}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="dir-numero"
                className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
              >
                Altura / Número *
              </label>
              <input
                id="dir-numero"
                name="numero"
                required
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="Ej: 123"
                className={inputClass}
              />
              {estadoForm.erroresCampos?.numero && (
                <p className="mt-1 text-xs text-[#CF1A1F]">
                  {estadoForm.erroresCampos.numero}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="dir-ciudad"
                className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
              >
                Ciudad / Localidad *
              </label>
              <input
                id="dir-ciudad"
                name="ciudad"
                required
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Ej: Colón"
                className={inputClass}
              />
              {estadoForm.erroresCampos?.ciudad && (
                <p className="mt-1 text-xs text-[#CF1A1F]">
                  {estadoForm.erroresCampos.ciudad}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="dir-provincia"
                className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
              >
                Provincia *
              </label>
              <select
                id="dir-provincia"
                name="provincia"
                required
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                className={inputClass}
              >
                {provincia &&
                  !PROVINCIAS_ARGENTINA.includes(
                    provincia as (typeof PROVINCIAS_ARGENTINA)[number],
                  ) && <option value={provincia}>{provincia}</option>}
                {PROVINCIAS_ARGENTINA.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
              {estadoForm.erroresCampos?.provincia && (
                <p className="mt-1 text-xs text-[#CF1A1F]">
                  {estadoForm.erroresCampos.provincia}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="dir-cp"
                className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
              >
                Código postal (opcional)
              </label>
              <input
                id="dir-cp"
                name="codigoPostal"
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                placeholder="Ej: 3280"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="dir-piso"
                className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
              >
                Piso (opcional)
              </label>
              <input
                id="dir-piso"
                name="piso"
                defaultValue={editando?.piso ?? ""}
                placeholder="Ej: 2"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="dir-depto"
                className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
              >
                Depto (opcional)
              </label>
              <input
                id="dir-depto"
                name="departamento"
                defaultValue={editando?.departamento ?? ""}
                placeholder="Ej: B"
                className={inputClass}
              />
            </div>
          </div>

          {estadoForm.error && (
            <p className="mt-3 rounded bg-[#FFEBEE] px-3 py-2 text-xs font-medium text-[#7C0300]">
              {estadoForm.error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-[#CF1A1F] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#7C0300] disabled:opacity-60"
            >
              {guardando
                ? "Guardando..."
                : modoForm === "editar"
                  ? "Guardar cambios y recalcular envío"
                  : "Guardar y usar esta dirección"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
