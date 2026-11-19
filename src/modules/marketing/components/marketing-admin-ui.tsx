"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  accionAlternarCupon,
  accionAlternarPromocion,
  accionCrearCupon,
  accionCrearPromocion,
  accionEditarCupon,
  accionEditarPromocion,
  accionEliminarCupon,
  accionEliminarPromocion,
} from "@/modules/marketing/actions";
import { ESTADO_INICIAL_MARKETING } from "@/modules/marketing/schemas";

export interface PromocionAdminItem {
  id: string;
  nombre: string;
  porcentajeDescuento: number;
  fechaInicioISO: string;
  fechaFinISO: string;
  activa: boolean;
  cantidadProductos: number;
  cantidadPedidos: number;
}

export interface CuponAdminItem {
  id: string;
  codigo: string;
  porcentajeDescuento: number;
  fechaVigenciaISO: string;
  fechaVigenciaFinISO: string | null;
  descripcion: string | null;
  activo: boolean;
  cantidadPedidos: number;
}

export interface ProductoOpcionMarketing {
  id: string;
  sku: string;
  nombre: string;
  marca: string;
}

interface MarketingAdminUIProps {
  promociones: PromocionAdminItem[];
  cupones: CuponAdminItem[];
  productos: ProductoOpcionMarketing[];
  hoyISO: string;
  enUnMesISO: string;
}

const inputClass =
  "w-full rounded border border-[#D9D9D9] bg-white px-3 py-2 text-sm text-[#2C2C2C] outline-none focus:border-[#CF1A1F] focus:ring-1 focus:ring-[#CF1A1F]";

function formatearFecha(iso: string | null): string {
  if (!iso) return "Sin vencimiento";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function estadoVigencia(
  activo: boolean,
  inicioISO: string,
  finISO: string | null,
): { label: string; clase: string } {
  if (!activo) {
    return { label: "Inactiva", clase: "bg-[#EEEEEE] text-[#6B6B6B]" };
  }
  const ahora = Date.now();
  const inicio = new Date(inicioISO).getTime();
  const fin = finISO ? new Date(finISO).getTime() : null;
  if (inicio > ahora) {
    return { label: "Programada", clase: "bg-[#FFF8E1] text-[#8A6D00]" };
  }
  if (fin !== null && fin < ahora) {
    return { label: "Vencida", clase: "bg-[#FFEBEE] text-[#7C0300]" };
  }
  return { label: "Vigente", clase: "bg-[#E8F5E9] text-[#2E7D32]" };
}

export function MarketingAdminUI({
  promociones,
  cupones,
  productos,
  hoyISO,
  enUnMesISO,
}: MarketingAdminUIProps) {
  const router = useRouter();
  const [pestana, setPestana] = useState<"promociones" | "cupones">("promociones");
  const [alcance, setAlcance] = useState<"todos" | "seleccionados">("todos");
  const [editandoPromoId, setEditandoPromoId] = useState<string | null>(null);
  const [editandoCuponId, setEditandoCuponId] = useState<string | null>(null);
  const [avisoAccion, setAvisoAccion] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);
  const [pendienteAccion, startTransition] = useTransition();

  const [estadoPromo, formPromo, cargandoPromo] = useActionState(
    accionCrearPromocion,
    ESTADO_INICIAL_MARKETING,
  );
  const [estadoCupon, formCupon, cargandoCupon] = useActionState(
    accionCrearCupon,
    ESTADO_INICIAL_MARKETING,
  );
  const [, formEditarPromo, cargandoEditPromo] = useActionState(
    async (prev: typeof ESTADO_INICIAL_MARKETING, fd: FormData) => {
      const res = await accionEditarPromocion(prev, fd);
      if (res.ok) {
        setEditandoPromoId(null);
        setAvisoAccion({ tipo: "ok", texto: res.mensaje ?? "Promoción actualizada." });
        router.refresh();
      } else if (res.error) {
        setAvisoAccion({ tipo: "error", texto: res.error });
      }
      return res;
    },
    ESTADO_INICIAL_MARKETING,
  );
  const [, formEditarCupon, cargandoEditCupon] = useActionState(
    async (prev: typeof ESTADO_INICIAL_MARKETING, fd: FormData) => {
      const res = await accionEditarCupon(prev, fd);
      if (res.ok) {
        setEditandoCuponId(null);
        setAvisoAccion({ tipo: "ok", texto: res.mensaje ?? "Cupón actualizado." });
        router.refresh();
      } else if (res.error) {
        setAvisoAccion({ tipo: "error", texto: res.error });
      }
      return res;
    },
    ESTADO_INICIAL_MARKETING,
  );

  function ejecutarAccionRapida(
    fn: () => Promise<{ ok: boolean; mensaje?: string; error?: string }>,
  ) {
    setAvisoAccion(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setAvisoAccion({ tipo: "ok", texto: res.mensaje ?? "Actualizado." });
        router.refresh();
      } else {
        setAvisoAccion({
          tipo: "error",
          texto: res.error ?? "No se pudo completar la operación.",
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de pestañas */}
      <div className="flex flex-wrap gap-2 border-b border-[#E5E5E5] pb-3">
        <button
          type="button"
          onClick={() => {
            setPestana("promociones");
            setAvisoAccion(null);
          }}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            pestana === "promociones"
              ? "bg-[#CF1A1F] text-white"
              : "bg-[#F5F5F5] text-[#2C2C2C] hover:bg-[#E5E5E5]"
          }`}
        >
          Promociones ({promociones.length}) · RF-41
        </button>
        <button
          type="button"
          onClick={() => {
            setPestana("cupones");
            setAvisoAccion(null);
          }}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            pestana === "cupones"
              ? "bg-[#CF1A1F] text-white"
              : "bg-[#F5F5F5] text-[#2C2C2C] hover:bg-[#E5E5E5]"
          }`}
        >
          Cupones de Descuento ({cupones.length}) · RF-42
        </button>
      </div>

      {avisoAccion && (
        <div
          role="status"
          className={`rounded-md border px-4 py-3 text-sm font-medium ${
            avisoAccion.tipo === "ok"
              ? "border-[#2E7D32]/40 bg-[#E8F5E9] text-[#1B5E20]"
              : "border-[#CF1A1F]/40 bg-[#FFEBEE] text-[#7C0300]"
          }`}
        >
          {avisoAccion.texto}
        </div>
      )}

      {pestana === "promociones" ? (
        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          {/* Formulario Alta de Promocion */}
          <section
            aria-label="Nueva promoción"
            className="rounded-lg border border-[#D9D9D9] bg-white p-5 shadow-xs"
          >
            <h2 className="text-lg font-bold text-[#2C2C2C]">
              Crear promoción
            </h2>
            <p className="mt-1 text-xs text-[#6B6B6B]">
              Se aplica automáticamente en el catálogo y en el checkout. Si un
              producto tiene varias, rige la de mayor descuento (RN-08).
            </p>

            <form action={formPromo} className="mt-4 flex flex-col gap-3.5">
              <div>
                <label
                  htmlFor="promo-nombre"
                  className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
                >
                  Nombre de la promoción *
                </label>
                <input
                  id="promo-nombre"
                  name="nombre"
                  required
                  placeholder="Ej: Semana Running 20%"
                  className={inputClass}
                />
                {estadoPromo.erroresCampos?.nombre && (
                  <p className="mt-1 text-xs text-[#CF1A1F]">
                    {estadoPromo.erroresCampos.nombre}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="promo-porcentaje"
                  className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
                >
                  Porcentaje de descuento (1 a 90%) *
                </label>
                <input
                  id="promo-porcentaje"
                  name="porcentajeDescuento"
                  type="number"
                  min={1}
                  max={90}
                  step="1"
                  required
                  placeholder="Ej: 20"
                  className={inputClass}
                />
                {estadoPromo.erroresCampos?.porcentajeDescuento && (
                  <p className="mt-1 text-xs text-[#CF1A1F]">
                    {estadoPromo.erroresCampos.porcentajeDescuento}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="promo-inicio"
                    className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
                  >
                    Fecha inicio *
                  </label>
                  <input
                    id="promo-inicio"
                    name="fechaInicio"
                    type="date"
                    defaultValue={hoyISO}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="promo-fin"
                    className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
                  >
                    Fecha fin *
                  </label>
                  <input
                    id="promo-fin"
                    name="fechaFin"
                    type="date"
                    defaultValue={enUnMesISO}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              {estadoPromo.erroresCampos?.fechaFin && (
                <p className="text-xs text-[#CF1A1F]">
                  {estadoPromo.erroresCampos.fechaFin}
                </p>
              )}

              <div>
                <span className="mb-1.5 block text-xs font-semibold text-[#2C2C2C]">
                  Alcance de la promoción
                </span>
                <div className="flex gap-4 text-sm">
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name="alcance"
                      value="todos"
                      checked={alcance === "todos"}
                      onChange={() => setAlcance("todos")}
                      className="accent-[#CF1A1F]"
                    />
                    <span>Todo el catálogo</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input
                      type="radio"
                      name="alcance"
                      value="seleccionados"
                      checked={alcance === "seleccionados"}
                      onChange={() => setAlcance("seleccionados")}
                      className="accent-[#CF1A1F]"
                    />
                    <span>Productos elegidos</span>
                  </label>
                </div>
              </div>

              {alcance === "seleccionados" && (
                <div className="max-h-48 overflow-y-auto rounded border border-[#D9D9D9] bg-[#FAFAFA] p-2.5">
                  <p className="mb-2 text-[11px] font-semibold uppercase text-[#6B6B6B]">
                    Elegí los productos incluidos:
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {productos.map((p) => (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-2 text-xs text-[#2C2C2C]"
                      >
                        <input
                          type="checkbox"
                          name="productoIds"
                          value={p.id}
                          className="accent-[#CF1A1F]"
                        />
                        <span className="truncate">
                          <strong>{p.nombre}</strong> ({p.marca} · {p.sku})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {estadoPromo.error && (
                <p className="rounded bg-[#FFEBEE] px-3 py-2 text-xs font-medium text-[#7C0300]">
                  {estadoPromo.error}
                </p>
              )}
              {estadoPromo.ok && estadoPromo.mensaje && (
                <p className="rounded bg-[#E8F5E9] px-3 py-2 text-xs font-medium text-[#1B5E20]">
                  {estadoPromo.mensaje}
                </p>
              )}

              <button
                type="submit"
                disabled={cargandoPromo}
                className="mt-1 rounded-md bg-[#CF1A1F] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7C0300] disabled:opacity-60"
              >
                {cargandoPromo ? "Guardando..." : "Crear promoción"}
              </button>
            </form>
          </section>

          {/* Listado de Promociones */}
          <section aria-label="Listado de promociones" className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-[#2C2C2C]">
              Promociones registradas
            </h2>

            {promociones.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#D9D9D9] p-8 text-center text-sm text-[#6B6B6B]">
                Todavía no hay promociones cargadas.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {promociones.map((promo) => {
                  const estado = estadoVigencia(
                    promo.activa,
                    promo.fechaInicioISO,
                    promo.fechaFinISO,
                  );
                  return (
                    <div
                      key={promo.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#D9D9D9] bg-white p-4 shadow-xs"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-[#CF1A1F] px-2 py-0.5 text-xs font-extrabold text-white">
                            -{promo.porcentajeDescuento}%
                          </span>
                          <h3 className="text-base font-bold text-[#2C2C2C]">
                            {promo.nombre}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estado.clase}`}
                          >
                            {estado.label}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B6B6B]">
                          Vigencia: {formatearFecha(promo.fechaInicioISO)} al{" "}
                          {formatearFecha(promo.fechaFinISO)} ·{" "}
                          {promo.cantidadProductos === 0
                            ? "Aplica a todo el catálogo"
                            : `Aplica a ${promo.cantidadProductos} producto(s)`}
                        </p>
                        {promo.cantidadPedidos > 0 && (
                          <p className="text-[11px] text-[#9E9E9E]">
                            Aplicada en {promo.cantidadPedidos} pedido(s)
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditandoPromoId(
                              editandoPromoId === promo.id ? null : promo.id,
                            )
                          }
                          className="rounded border border-[#D9D9D9] px-3 py-1.5 text-xs font-semibold text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5]"
                        >
                          {editandoPromoId === promo.id ? "Cerrar" : "Editar"}
                        </button>
                        <button
                          type="button"
                          disabled={pendienteAccion}
                          onClick={() =>
                            ejecutarAccionRapida(() =>
                              accionAlternarPromocion(promo.id, !promo.activa),
                            )
                          }
                          className="rounded border border-[#2C2C2C] px-3 py-1.5 text-xs font-semibold text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5] disabled:opacity-50"
                        >
                          {promo.activa ? "Desactivar" : "Activar"}
                        </button>
                        {promo.cantidadPedidos === 0 && (
                          <button
                            type="button"
                            disabled={pendienteAccion}
                            onClick={() =>
                              ejecutarAccionRapida(() =>
                                accionEliminarPromocion(promo.id),
                              )
                            }
                            className="rounded border border-[#CF1A1F] px-3 py-1.5 text-xs font-semibold text-[#CF1A1F] transition-colors hover:bg-[#FFF5F5] disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      {editandoPromoId === promo.id && (
                        <form
                          action={formEditarPromo}
                          className="mt-3 grid w-full gap-3 border-t border-[#EEEEEE] pt-3 sm:grid-cols-2 lg:grid-cols-4"
                        >
                          <input type="hidden" name="promocionId" value={promo.id} />
                          <input type="hidden" name="activa" value={String(promo.activa)} />
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                              Nombre
                            </label>
                            <input
                              name="nombre"
                              required
                              defaultValue={promo.nombre}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                              Descuento (%)
                            </label>
                            <input
                              name="porcentajeDescuento"
                              type="number"
                              min={1}
                              max={90}
                              required
                              defaultValue={promo.porcentajeDescuento}
                              className={inputClass}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                                Inicio
                              </label>
                              <input
                                name="fechaInicio"
                                type="date"
                                required
                                defaultValue={promo.fechaInicioISO.slice(0, 10)}
                                className={inputClass}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                                Fin
                              </label>
                              <input
                                name="fechaFin"
                                type="date"
                                required
                                defaultValue={promo.fechaFinISO.slice(0, 10)}
                                className={inputClass}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
                            <button
                              type="submit"
                              disabled={cargandoEditPromo}
                              className="rounded bg-[#CF1A1F] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#7C0300] disabled:opacity-60"
                            >
                              {cargandoEditPromo ? "Guardando..." : "Guardar cambios"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoPromoId(null)}
                              className="rounded border border-[#D9D9D9] px-3 py-1.5 text-xs font-semibold text-[#6B6B6B]"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
          {/* Formulario Alta de Cupon */}
          <section
            aria-label="Nuevo cupón"
            className="rounded-lg border border-[#D9D9D9] bg-white p-5 shadow-xs"
          >
            <h2 className="text-lg font-bold text-[#2C2C2C]">Crear cupón</h2>
            <p className="mt-1 text-xs text-[#6B6B6B]">
              Los clientes podrán verlo en <strong>/cupones</strong> y aplicarlo
              en el checkout (1 cupón por compra, RN-08).
            </p>

            <form action={formCupon} className="mt-4 flex flex-col gap-3.5">
              <div>
                <label
                  htmlFor="cupon-codigo"
                  className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
                >
                  Código del cupón *
                </label>
                <input
                  id="cupon-codigo"
                  name="codigo"
                  required
                  placeholder="Ej: SNEAKER15"
                  className={`${inputClass} uppercase`}
                />
                {estadoCupon.erroresCampos?.codigo && (
                  <p className="mt-1 text-xs text-[#CF1A1F]">
                    {estadoCupon.erroresCampos.codigo}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="cupon-porcentaje"
                  className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
                >
                  Porcentaje de descuento (1 a 90%) *
                </label>
                <input
                  id="cupon-porcentaje"
                  name="porcentajeDescuento"
                  type="number"
                  min={1}
                  max={90}
                  step="1"
                  required
                  placeholder="Ej: 15"
                  className={inputClass}
                />
                {estadoCupon.erroresCampos?.porcentajeDescuento && (
                  <p className="mt-1 text-xs text-[#CF1A1F]">
                    {estadoCupon.erroresCampos.porcentajeDescuento}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="cupon-desc"
                  className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
                >
                  Descripción breve (opcional)
                </label>
                <input
                  id="cupon-desc"
                  name="descripcion"
                  placeholder="Ej: 15% extra en toda la tienda"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="cupon-inicio"
                    className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
                  >
                    Vigente desde *
                  </label>
                  <input
                    id="cupon-inicio"
                    name="fechaVigencia"
                    type="date"
                    defaultValue={hoyISO}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cupon-fin"
                    className="mb-1 block text-xs font-semibold text-[#2C2C2C]"
                  >
                    Vence el (opcional)
                  </label>
                  <input
                    id="cupon-fin"
                    name="fechaVigenciaFin"
                    type="date"
                    defaultValue={enUnMesISO}
                    className={inputClass}
                  />
                </div>
              </div>
              {estadoCupon.erroresCampos?.fechaVigenciaFin && (
                <p className="text-xs text-[#CF1A1F]">
                  {estadoCupon.erroresCampos.fechaVigenciaFin}
                </p>
              )}

              {estadoCupon.error && (
                <p className="rounded bg-[#FFEBEE] px-3 py-2 text-xs font-medium text-[#7C0300]">
                  {estadoCupon.error}
                </p>
              )}
              {estadoCupon.ok && estadoCupon.mensaje && (
                <p className="rounded bg-[#E8F5E9] px-3 py-2 text-xs font-medium text-[#1B5E20]">
                  {estadoCupon.mensaje}
                </p>
              )}

              <button
                type="submit"
                disabled={cargandoCupon}
                className="mt-1 rounded-md bg-[#CF1A1F] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#7C0300] disabled:opacity-60"
              >
                {cargandoCupon ? "Guardando..." : "Crear cupón"}
              </button>
            </form>
          </section>

          {/* Listado de Cupones */}
          <section aria-label="Listado de cupones" className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-[#2C2C2C]">
              Cupones registrados
            </h2>

            {cupones.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#D9D9D9] p-8 text-center text-sm text-[#6B6B6B]">
                Todavía no hay cupones cargados.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {cupones.map((cupon) => {
                  const estado = estadoVigencia(
                    cupon.activo,
                    cupon.fechaVigenciaISO,
                    cupon.fechaVigenciaFinISO,
                  );
                  return (
                    <div
                      key={cupon.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-[#D9D9D9] bg-white p-4 shadow-xs"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded bg-[#CF1A1F] px-2 py-0.5 text-xs font-extrabold text-white">
                            -{cupon.porcentajeDescuento}%
                          </span>
                          <code className="text-base font-extrabold tracking-wide text-[#2C2C2C]">
                            {cupon.codigo}
                          </code>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estado.clase}`}
                          >
                            {estado.label}
                          </span>
                        </div>
                        {cupon.descripcion && (
                          <p className="text-xs text-[#4E4E4E]">
                            {cupon.descripcion}
                          </p>
                        )}
                        <p className="text-xs text-[#6B6B6B]">
                          Vigencia: {formatearFecha(cupon.fechaVigenciaISO)} →{" "}
                          {formatearFecha(cupon.fechaVigenciaFinISO)} · Usado en{" "}
                          {cupon.cantidadPedidos} pedido(s)
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setEditandoCuponId(
                              editandoCuponId === cupon.id ? null : cupon.id,
                            )
                          }
                          className="rounded border border-[#D9D9D9] px-3 py-1.5 text-xs font-semibold text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5]"
                        >
                          {editandoCuponId === cupon.id ? "Cerrar" : "Editar"}
                        </button>
                        <button
                          type="button"
                          disabled={pendienteAccion}
                          onClick={() =>
                            ejecutarAccionRapida(() =>
                              accionAlternarCupon(cupon.id, !cupon.activo),
                            )
                          }
                          className="rounded border border-[#2C2C2C] px-3 py-1.5 text-xs font-semibold text-[#2C2C2C] transition-colors hover:bg-[#F5F5F5] disabled:opacity-50"
                        >
                          {cupon.activo ? "Desactivar" : "Activar"}
                        </button>
                        {cupon.cantidadPedidos === 0 && (
                          <button
                            type="button"
                            disabled={pendienteAccion}
                            onClick={() =>
                              ejecutarAccionRapida(() =>
                                accionEliminarCupon(cupon.id),
                              )
                            }
                            className="rounded border border-[#CF1A1F] px-3 py-1.5 text-xs font-semibold text-[#CF1A1F] transition-colors hover:bg-[#FFF5F5] disabled:opacity-50"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>

                      {editandoCuponId === cupon.id && (
                        <form
                          action={formEditarCupon}
                          className="mt-3 grid w-full gap-3 border-t border-[#EEEEEE] pt-3 sm:grid-cols-2 lg:grid-cols-4"
                        >
                          <input type="hidden" name="cuponId" value={cupon.id} />
                          <input type="hidden" name="activo" value={String(cupon.activo)} />
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                              Código
                            </label>
                            <input
                              name="codigo"
                              required
                              defaultValue={cupon.codigo}
                              className={`${inputClass} uppercase`}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                              Descuento (%)
                            </label>
                            <input
                              name="porcentajeDescuento"
                              type="number"
                              min={1}
                              max={90}
                              required
                              defaultValue={cupon.porcentajeDescuento}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                              Desde
                            </label>
                            <input
                              name="fechaVigencia"
                              type="date"
                              required
                              defaultValue={cupon.fechaVigenciaISO.slice(0, 10)}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                              Hasta (opcional)
                            </label>
                            <input
                              name="fechaVigenciaFin"
                              type="date"
                              defaultValue={cupon.fechaVigenciaFinISO?.slice(0, 10) ?? ""}
                              className={inputClass}
                            />
                          </div>
                          <div className="sm:col-span-2 lg:col-span-4">
                            <label className="mb-1 block text-xs font-semibold text-[#4E4E4E]">
                              Descripción (opcional)
                            </label>
                            <input
                              name="descripcion"
                              defaultValue={cupon.descripcion ?? ""}
                              className={inputClass}
                            />
                          </div>
                          <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
                            <button
                              type="submit"
                              disabled={cargandoEditCupon}
                              className="rounded bg-[#CF1A1F] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#7C0300] disabled:opacity-60"
                            >
                              {cargandoEditCupon ? "Guardando..." : "Guardar cambios"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditandoCuponId(null)}
                              className="rounded border border-[#D9D9D9] px-3 py-1.5 text-xs font-semibold text-[#6B6B6B]"
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
