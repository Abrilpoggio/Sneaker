"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ReactNode } from "react";

import {
  actualizarKitAdmin,
  crearKitAdmin,
  type KitFormState,
} from "@/modules/kits/actions";
import { FieldError, FormStateMessage } from "@/modules/catalogo/components/form-state";
import { SubmitButton } from "@/modules/catalogo/components/submit-button";

type Opcion = { id: string; nombre: string };

type VarianteOpcion = {
  id: string;
  talle: string | null;
  color: string | null;
  material: string | null;
  stockActual: number;
  producto: { nombre: string; sku: string };
};

export type KitInicial = {
  productoId: string;
  sku: string;
  nombre: string;
  descripcion: string;
  precioVenta: string;
  costoCompra: string;
  garantia: string;
  imagen: string;
  estado: "ACTIVO" | "INACTIVO";
  categoriaId: string;
  marcaId: string;
  proveedorId: string;
  componentes: { varianteId: string; cantidad: number }[];
};

const accionCrear: (state: KitFormState, formData: FormData) => Promise<KitFormState> =
  crearKitAdmin;
const accionEditar: (state: KitFormState, formData: FormData) => Promise<KitFormState> =
  actualizarKitAdmin;
const estadoInicial: KitFormState = { status: "idle" };

function tituloVariante(variante: VarianteOpcion) {
  return (
    [variante.talle, variante.color, variante.material].filter(Boolean).join(" · ") ||
    "Variante única"
  );
}

export function KitForm({
  categorias,
  marcas,
  proveedores,
  variantes,
  kit,
}: {
  categorias: Opcion[];
  marcas: Opcion[];
  proveedores: Opcion[];
  variantes: VarianteOpcion[];
  kit?: KitInicial;
}) {
  const [state, formAction] = useActionState(kit ? accionEditar : accionCrear, estadoInicial);
  const error = (field: string) => state.fieldErrors?.[field];
  const seleccionadas = new Map(
    (kit?.componentes ?? []).map((componente) => [componente.varianteId, componente.cantidad]),
  );

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {kit && <input type="hidden" name="productoId" value={kit.productoId} />}

      <FormStateMessage state={state} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,700px)_minmax(300px,380px)]">
        <div className="flex flex-col gap-5">
          <Field label="SKU del kit" error={error("sku")}>
            <input
              required
              name="sku"
              defaultValue={kit?.sku}
              placeholder="Ej: SNK-KIT-002"
              className={inputClass}
            />
          </Field>

          <Field label="Nombre del kit" error={error("nombre")}>
            <input
              required
              name="nombre"
              defaultValue={kit?.nombre}
              placeholder="Ej: Kit Running: zapatilla + medias"
              className={inputClass}
            />
          </Field>

          <Field label="Descripcion" error={error("descripcion")}>
            <textarea
              required
              name="descripcion"
              defaultValue={kit?.descripcion}
              rows={4}
              className={`${inputClass} min-h-28 resize-y`}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Marca" error={error("marcaId")}>
              <select required name="marcaId" defaultValue={kit?.marcaId ?? ""} className={inputClass}>
                <option value="" disabled>Seleccionar marca</option>
                {marcas.map((marca) => (
                  <option key={marca.id} value={marca.id}>{marca.nombre}</option>
                ))}
              </select>
            </Field>
            <Field label="Categoria" error={error("categoriaId")}>
              <select
                required
                name="categoriaId"
                defaultValue={kit?.categoriaId ?? ""}
                className={inputClass}
              >
                <option value="" disabled>Seleccionar categoria</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Precio de venta (ARS)" error={error("precioVenta")}>
              <input
                required
                min="0.01"
                step="0.01"
                type="number"
                name="precioVenta"
                defaultValue={kit?.precioVenta}
                className={inputClass}
              />
            </Field>
            <Field label="Costo de compra (ARS)" error={error("costoCompra")}>
              <input
                required
                min="0"
                step="0.01"
                type="number"
                name="costoCompra"
                defaultValue={kit?.costoCompra}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Garantia (opcional)" error={error("garantia")}>
              <input name="garantia" defaultValue={kit?.garantia} className={inputClass} />
            </Field>
            <Field label="Proveedor (opcional)" error={error("proveedorId")}>
              <select name="proveedorId" defaultValue={kit?.proveedorId ?? ""} className={inputClass}>
                <option value="">Sin proveedor asignado</option>
                {proveedores.map((proveedor) => (
                  <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Estado">
              <select name="estado" defaultValue={kit?.estado ?? "ACTIVO"} className={inputClass}>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </Field>
            <Field
              label="Ruta de imagen (opcional)"
              error={error("imagen")}
              hint="Ruta local dentro de public/productos."
            >
              <input name="imagen" defaultValue={kit?.imagen} className={inputClass} />
            </Field>
          </div>
        </div>

        <fieldset className="flex min-h-64 flex-col gap-3 rounded-md border border-[#D9D9D9] p-4">
          <legend className="px-2 text-sm font-semibold text-[#2C2C2C]">
            Componentes del kit
          </legend>
          <p className="text-xs text-[#6B6B6B]">
            Elegí al menos dos variantes. La cantidad indica cuantas unidades consume
            cada kit. El stock del kit sera el minimo resultante (RN-06).
          </p>

          {error("varianteId") && (
            <p className="text-sm font-semibold text-[#CF1A1F]">{error("varianteId")}</p>
          )}

          <div className="flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
            {variantes.length === 0 ? (
              <p className="text-sm text-[#6B6B6B]">
                Todavia no hay variantes cargadas. Crea productos y variantes primero.
              </p>
            ) : (
              variantes.map((variante) => {
                const idCantidad = `cantidad-${variante.id}`;
                return (
                  <div
                    key={variante.id}
                    className="grid grid-cols-[1fr_76px] items-center gap-2 rounded border border-[#E5E5E5] p-2"
                  >
                    <label className="flex items-start gap-2 text-sm text-[#2C2C2C]">
                      <input
                        type="checkbox"
                        name="componenteVarianteId"
                        value={variante.id}
                        defaultChecked={seleccionadas.has(variante.id)}
                        className="mt-1 accent-[#CF1A1F]"
                      />
                      <span>
                        <span className="font-semibold">{variante.producto.nombre}</span>
                        <span className="block text-xs text-[#6B6B6B]">
                          {variante.producto.sku} · {tituloVariante(variante)} · stock{" "}
                          {variante.stockActual}
                        </span>
                      </span>
                    </label>
                    <label className="flex flex-col text-xs text-[#6B6B6B]">
                      Cantidad
                      <input
                        id={idCantidad}
                        type="number"
                        min="1"
                        step="1"
                        name={idCantidad}
                        defaultValue={seleccionadas.get(variante.id) ?? 1}
                        className="w-full rounded border border-[#D9D9D9] px-2 py-1 text-sm text-[#2C2C2C]"
                      />
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-wrap justify-end gap-4 border-t border-[#D9D9D9] pt-5">
        <Link
          href="/admin/kits"
          className="rounded border border-[#2C2C2C] px-8 py-3 text-sm font-semibold text-[#2C2C2C] hover:bg-[#F5F5F5]"
        >
          Cancelar
        </Link>
        <SubmitButton className="rounded bg-[#CF1A1F] px-8 py-3 text-sm font-semibold text-white hover:bg-[#7C0300]">
          {kit ? "Guardar cambios" : "Crear kit"}
        </SubmitButton>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-[#2C2C2C]">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-[#6B6B6B]">{hint}</span>}
      <FieldError message={error} />
    </label>
  );
}

const inputClass =
  "w-full rounded-sm border border-black bg-white px-3 py-3 text-sm font-normal text-[#2C2C2C] outline-none placeholder:text-[#9E9E9E] focus:border-[#CF1A1F] focus:ring-1 focus:ring-[#CF1A1F]";
