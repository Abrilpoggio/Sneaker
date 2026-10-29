"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

import {
  actualizarProductoAdmin,
  crearProductoAdmin,
  type AdminFormState,
} from "@/modules/catalogo/admin-actions";
import { FieldError, FormStateMessage } from "@/modules/catalogo/components/form-state";
import { SubmitButton } from "@/modules/catalogo/components/submit-button";

type Opcion = { id: string; nombre: string };
type ProductoInicial = {
  id: string;
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
  etiquetaIds: string[];
};

const accionCrear: (state: AdminFormState, formData: FormData) => Promise<AdminFormState> = crearProductoAdmin;
const accionEditar: (state: AdminFormState, formData: FormData) => Promise<AdminFormState> = actualizarProductoAdmin;
const estadoInicial: AdminFormState = { status: "idle" };

export function ProductoForm({
  categorias,
  marcas,
  proveedores,
  etiquetas,
  producto,
}: {
  categorias: Opcion[];
  marcas: Opcion[];
  proveedores: Opcion[];
  etiquetas: Opcion[];
  producto?: ProductoInicial;
}) {
  const [state, formAction] = useActionState(
    producto ? accionEditar : accionCrear,
    estadoInicial,
  );
  const error = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} encType="multipart/form-data" className="flex flex-col gap-6">
      {producto && <input type="hidden" name="productoId" value={producto.id} />}

      <FormStateMessage state={state} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,700px)_minmax(300px,400px)]">
        <div className="flex flex-col gap-6">
          <Field label="SKU" error={error("sku")}>
            <input
              required
              name="sku"
              defaultValue={producto?.sku}
              placeholder="Ej: NK-AF1-07-WHT"
              className={inputClass}
            />
          </Field>

          <Field label="Nombre del Producto" error={error("nombre")}>
            <input
              required
              name="nombre"
              defaultValue={producto?.nombre}
              placeholder="Ej: Zapatillas Urbanas Negras"
              className={inputClass}
            />
          </Field>

          <Field label="Descripcion" error={error("descripcion")}>
            <textarea
              required
              name="descripcion"
              defaultValue={producto?.descripcion}
              placeholder="Descripcion detallada del producto..."
              rows={5}
              className={`${inputClass} min-h-36 resize-y`}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Marca" error={error("marcaId")}>
              <select required name="marcaId" defaultValue={producto?.marcaId ?? ""} className={inputClass}>
                <option value="" disabled>Seleccionar marca</option>
                {marcas.map((marca) => <option key={marca.id} value={marca.id}>{marca.nombre}</option>)}
              </select>
            </Field>
            <Field label="Categoria" error={error("categoriaId")}>
              <select required name="categoriaId" defaultValue={producto?.categoriaId ?? ""} className={inputClass}>
                <option value="" disabled>Seleccionar categoria</option>
                {categorias.map((categoria) => <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>)}
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
                defaultValue={producto?.precioVenta}
                placeholder="0.00"
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
                defaultValue={producto?.costoCompra}
                placeholder="0.00"
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Garantia (opcional)" error={error("garantia")}>
              <input name="garantia" defaultValue={producto?.garantia} placeholder="Ej: 6 meses" className={inputClass} />
            </Field>
            <Field label="Proveedor (opcional)" error={error("proveedorId")}>
              <select name="proveedorId" defaultValue={producto?.proveedorId ?? ""} className={inputClass}>
                <option value="">Sin proveedor asignado</option>
                {proveedores.map((proveedor) => <option key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</option>)}
              </select>
            </Field>
          </div>

          {producto && (
            <Field label="Estado">
              <select name="estado" defaultValue={producto.estado} className={inputClass}>
                <option value="ACTIVO">Activo</option>
                <option value="INACTIVO">Inactivo</option>
              </select>
            </Field>
          )}

          <Field label="Ruta de imagen" error={error("imagen")} hint="Ruta local dentro de public/productos; tambien puedes subir una imagen en el panel de la derecha.">
            <input name="imagen" defaultValue={producto?.imagen} placeholder="/productos/imagen.png" className={inputClass} />
          </Field>

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-semibold text-[#2C2C2C]">Etiquetas de uso</legend>
            {etiquetas.length === 0 ? (
              <p className="text-sm text-[#9E9E9E]">Todavia no hay etiquetas. <Link className="text-[#CF1A1F] underline" href="/admin/etiquetas">Crear etiquetas</Link></p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {etiquetas.map((etiqueta) => (
                  <label key={etiqueta.id} className="flex items-center gap-2 rounded-full border border-[#D9D9D9] px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      name="etiquetaIds"
                      value={etiqueta.id}
                      defaultChecked={producto?.etiquetaIds.includes(etiqueta.id)}
                      className="accent-[#CF1A1F]"
                    />
                    {etiqueta.nombre}
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        </div>

        <div className="flex flex-col gap-5">
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-md border-2 border-dashed border-[#9E9E9E] bg-[#FAFAFA] p-6 text-center lg:min-h-[400px]">
            <span aria-hidden className="text-5xl text-[#2C2C2C]">↑</span>
            <label className="flex cursor-pointer flex-col items-center gap-3 font-semibold text-[#2C2C2C]">
              Arrastra y suelta tus imagenes aqui
              <span className="text-sm font-normal text-[#9E9E9E]">o haz clic para seleccionar (PNG, JPG, GIF; max. 4 MB)</span>
              <input
                type="file"
                name="imagenArchivo"
                accept="image/png,image/jpeg,image/gif"
                className="max-w-full text-sm font-normal text-[#4E4E4E] file:mr-3 file:rounded-sm file:border-0 file:bg-black file:px-4 file:py-2 file:font-semibold file:text-white"
              />
            </label>
            <p className="text-xs text-[#6B6B6B]">O pega una ruta/URL en el campo de imagen.</p>
            {producto?.imagen && <p className="break-all text-xs text-[#4E4E4E]">{producto.imagen}</p>}
          </div>

          {!producto && (
            <fieldset className="grid gap-4 rounded-md border border-[#D9D9D9] p-4 sm:grid-cols-2">
              <legend className="px-2 text-sm font-semibold text-[#2C2C2C]">Primera variante</legend>
              <Field label="Talle" error={error("talleInicial")}>
                <input required name="talleInicial" placeholder="Ej: 37" className={inputClass} />
              </Field>
              <Field label="Color">
                <input name="colorInicial" placeholder="Ej: Blanco" className={inputClass} />
              </Field>
              <Field label="Material">
                <input name="materialInicial" placeholder="Ej: Cuero sintetico" className={inputClass} />
              </Field>
              <Field label="Stock inicial" error={error("stockInicial")}>
                <input required min="0" step="1" type="number" name="stockInicial" defaultValue="0" className={inputClass} />
              </Field>
            </fieldset>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-4 border-t border-[#D9D9D9] pt-5">
        <Link href="/admin/productos" className="rounded border border-[#2C2C2C] px-8 py-3 text-sm font-semibold text-[#2C2C2C] hover:bg-[#F5F5F5]">
          Cancelar
        </Link>
        <SubmitButton className="rounded bg-[#CF1A1F] px-8 py-3 text-sm font-semibold text-white hover:bg-[#7C0300]">
          {producto ? "Guardar cambios" : "Guardar Producto"}
        </SubmitButton>
      </div>

      {state.status === "success" && state.productoId && !producto && (
        <Link className="text-sm font-semibold text-[#CF1A1F] underline" href={`/admin/productos/${state.productoId}`}>
          Continuar con las variantes del producto
        </Link>
      )}
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
